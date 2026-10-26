# Premium checkup: payday and changes

The checkup keeps the existing expense timeline and amount rules, with a purple preparation summary, compact white action cards, consistent item artwork, and quieter expandable analysis.

## Compatibility with an earlier hosted database

On 23 October 2026, read-only RPC discovery against the configured hosted project returned `PGRST202` for `household_checkup_plan`, including its exact application arguments. The older `household_spending_checkup` and `household_outlook` returned permission errors for unauthenticated/service contexts, confirming their presence without reading any household records. This establishes an unavailable new API function, not deleted household data. At that stage, SQL inspection was needed to distinguish an unapplied migration from a stale API schema cache. The later owner screenshots and hosted repair below resolve the rollout state.

When only the new checkup function is absent from the schema cache, the signed-in page now uses the existing authenticated `household_spending_checkup` query. It labels the view as the next 30 days, keeps totals, dates, item artwork, filters, pagination and existing record actions, and hides payday controls and change comparisons. It does not call the unsupported capture/payday RPCs or fabricate comparison history. Deep links to extended periods return to the clearly labelled 30-day view. Network errors, denied access, other missing functions and ordinary database failures retain the unavailable state. The application checks the new function again on later requests, so full controls return when its backend is available.

The basic compatibility view depends on the existing 037 release. This initial investigation did not apply hosted migrations. The later hosted repair below restores the full checkup after the owner installed 040.

Compatibility verification passed with 388 unit tests, 72 disposable database checks, lint, type checking and a production build. Focused signed-in production checks passed in Chromium at 1280px/390px and WebKit at 390px, including unchanged records after cancellation and restoration of full controls/capture after the new RPC becomes available. Public/private HTTP and rendered-indexing smoke checks passed. See [hosted API discovery](../artifacts/checkup-compatibility/hosted-rpc-discovery.json), [browser checks](../artifacts/checkup-compatibility/browser-checks.json) and [validation limits](../artifacts/checkup-compatibility/validation.json). Local stand-ins and disposable PostgreSQL verified authenticated behavior; the hosted probe did not read a household's records.

## Completed flows

- **Until payday:** save the next payday, preview costs from today through the day before payday, change or cancel the date, and return to the 30-day view. The date is stored on the account. Expense schedules and payment records are untouched. Allowed dates are tomorrow through 365 days ahead in the account timezone. A passed date falls back to the 30-day view and asks for a new date. Keeply never assumes a recurring payday or household income.
- **What changed:** compare the same dates against the most recent earlier daily comparison point that covers the whole range. On the first day, the first checkup can serve as the baseline on a subsequent visit. Amount edits, estimate labels, added costs, missing amounts and removed upcoming expenses are distinguished. A removed expense does not imply a recorded payment or savings. Names, logos and source links come from current owned records. Deleted records get a generic identity and no broken source link.
- **First use and recovery:** a server-action POST saves the first checkup opened each local day. Page GETs and prefetches never create history. A failed capture offers retry without hiding the current plan. Failed payday saves retain the selected date. Native date validation, Cancel and Escape are supported. Premium access is checked on every read and write.
- **Samples:** sample payday choices exist only in the URL. The prior checkup is explicitly fictional. In the eight-day example, previous known costs are PHP 4,899 and current known costs are PHP 5,399 because the Toyota estimate changes from PHP 3,000 to PHP 3,500. One missing amount is excluded from both.

The comparison point contains expense identifiers, dates, amounts and an estimated boolean. It contains no copies of names, notes, logos or files. A full year of the existing shared projection permits a later selection of a different period. Local-day capture keys and a database lock prevent retries or tabs from replacing the first point. Comparisons are available for the preceding 35 local days. Existing scheduled maintenance removes stored points after 36 days, including for inactive accounts. Account deletion cascades preferences and history. This is functional account data, separate from optional analytics.

Totals cover the full selected period before expense/category pagination. Change details paginate independently in groups of 25, with full comparison totals on every page. Dates outside the current period are excluded from both sides, so rolling dates alone cannot change the comparison. A baseline that does not cover the range is not used for a partial or fabricated comparison.

## Hosted transaction-mode repair, 23 October 2026

The owner's later screenshot confirms every prerequisite, including 039 and 040, as `PRESENT`. The new API function became available, but the signed-in checkup still failed. Do not rerun these migrations.

Hosted diagnosis reproduced PostgreSQL `25006`: `cannot execute SELECT FOR UPDATE in a read-only transaction`. Migration 040 declares `household_checkup_plan` as `STABLE`. PostgREST runs POST calls to STABLE functions in READ ONLY transactions, while the existing `private.require_user()` guard locks the profile row. The same populated query succeeded inside an ordinary transaction followed by rollback. This establishes a query failure, not deleted household records. See the [PostgREST transaction reference](https://github.com/PostgREST/postgrest/blob/main/docs/references/transactions.rst).

The follow-up [202610230041_checkup_rpc_transaction_mode.sql](../supabase/migrations/202610230041_checkup_rpc_transaction_mode.sql) changes only this public RPC's volatility to `VOLATILE`, matching the existing planning RPCs, and notifies PostgREST to reload its schema. It preserves the function body, account guard, ownership, execution grants and saved records. Historical migration 040 remains unchanged.

**Execution status:** the assistant executed the complete SQL statements from 041 in the configured production Supabase project's SQL Editor on 23 October 2026. SQL Editor reported success. A read-only catalog check then confirmed `volatility = v`, signed-in execution enabled and anonymous execution disabled. Reloading the owner's live `/checkup` displayed the populated expense timeline and preparation total. No application deployment was performed. Do not rerun 039, 040 or 041 on this project.

For another environment, first run the entire [read-only prerequisite check](../supabase/check-premium-checkup-prerequisites.sql). Apply only missing prerequisites in sequence, including 039 before 040 when absent. Then inspect the deployed RPC without reading household contents:

```sql
select p.provolatile as volatility,
       has_function_privilege('authenticated', p.oid, 'execute') as signed_in_can_execute,
       has_function_privilege('anon', p.oid, 'execute') as anonymous_can_execute
from pg_proc p
where p.oid = to_regprocedure('public.household_checkup_plan(text,date,text,date,uuid,integer)');
```

If prerequisites are present and volatility is `s`, open the entire linked 041 file in that environment's Supabase SQL Editor and click **Run**, then repeat the catalog check and reload the signed-in checkup. A result of `v` means the correction is already present; do not rerun it. Missing functions or unexpected grants require investigation rather than bypassing access checks. Fresh installs apply 041 after 040 through the normal migration sequence. Keep the existing scheduled maintenance job operational for retention.

The old local REST bridge always opened READ WRITE transactions, masking this defect. It now derives transaction access mode from the installed function metadata. A regression reproduces the failure before 041, then checks the repaired populated query, unchanged occurrence records and absence of history capture on reads. The focused production browser checks now use this corrected bridge. See the [sanitized validation record](../artifacts/checkup-transaction-mode/validation.json).

## Local verification commands

Run from the repository root:

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run test:db
PG_TEST_BROWSER=1 PG_TEST_PRODUCTION=1 PG_TEST_CHECKUP_ONLY=1 node scripts/test-database.mjs
PG_TEST_BROWSER=1 PG_TEST_PRODUCTION=1 PG_TEST_CHECKUP_ONLY=1 PG_TEST_CHECKUP_COMPATIBILITY_ONLY=1 node scripts/test-database.mjs
node tests/browser/public-experience.mjs
```

The modified [database runner](../scripts/test-database.mjs) invokes the new [database test module](../tests/database/premium-checkup.mjs), which is not a standalone script. It runs the migration and read-only checks in a disposable local database and tests authorization, ownership, read-only GET behavior, capture deduplication, expiry, timezone/date boundaries, missing and zero amounts, exact comparisons, deleted records, retention, account deletion, filtering and pagination. It never connects to the hosted project.

The modified [signed-in browser suite](../tests/browser/household-history.mjs) tests real server actions against local Auth/REST stand-ins and disposable PostgreSQL. The modified [public browser suite](../tests/browser/public-experience.mjs) exercises the sample account and rendered SEO. These commands have been run locally. These browser suites use local stand-ins. The later production repair separately verifies the live checkup read; physical devices remain outside this validation.

## Results

- All 366 unit tests and 248 disposable PostgreSQL integration checks passed. Lint, type checking and the production build passed.
- Signed-in production checks passed in Chrome at 1280px and 390px and WebKit at 390px, including first use, capture retry, no change, persisted payday, excluded payday, cancellation, invalid-date handling, failed-save recovery, comparison totals, logos, record navigation, expiry, and the existing amount/payment flows. See [Chrome results](../artifacts/premium-checkup/private-chromium.json) and [WebKit results](../artifacts/premium-checkup/private-webkit.json). Final WebKit verification includes the latest change descriptions. Unexpected page errors were zero; correlated cancelled-prefetch diagnostics from the local self-signed proxy are retained separately by the harness.
- Public/sample production checks passed in Chrome at 1280px, 390px and 320px and WebKit at 390px. Rendered SEO checks covered 18 routes, including canonical URLs, indexing, language/locale and affected structured-data fields. The checkup remains noindex and private destinations still require authentication. The privacy text now describes functional comparison history separately from optional analytics.
- Final narrow-screen checks passed with doubled text and deliberately failed utility logos in Chrome at 320px and WebKit at 390px, with zero page errors. See [visual accessibility results](../artifacts/premium-checkup/visual-accessibility-checks.json), [payday screenshot](../artifacts/premium-checkup/webkit-390-final-payday.png), and [change detail](../artifacts/premium-checkup/webkit-390-final-changes.png).
- Local mobile Lighthouse scored the [sample checkup](../artifacts/premium-checkup/lighthouse-checkup.json) 89 for performance, 100 for accessibility and 100 for best practices. Its SEO score of 66 reflects the intended noindex directive. The [privacy page](../artifacts/premium-checkup/lighthouse-privacy.json) scored 99/100/100/100. These are local production measurements, not hosted performance guarantees or external rich-result certification.

These original release checks use local production servers, test Auth/REST bridges and browser simulations. The later 23 October repair separately verifies the hosted function metadata and populated live checkup. Hosted payday edits, physical-device behavior and household comprehension were not tested during that repair. The sample account is available locally without applying migrations; other environments require the ordered rollout above.

### Transaction-mode regression results, 23 October 2026

All 388 unit tests, 250 full disposable PostgreSQL checks and the 74-check focused database run passed, including reproduction before 041 and verification after it. Type checking and lint passed. Focused production browser checks passed in Chromium at 1280px/390px and WebKit at 390px using the corrected transaction bridge, including full-checkup recovery, category filtering and cancellation. Existing HTTP and rendered public/private indexing checks passed. No public page, metadata, structured data or indexing configuration changed. The live hosted checkup displayed its existing records after the repair. These results do not claim physical-device or hosted payday/capture interaction coverage.
