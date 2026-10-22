# Premium checkup: payday and changes

The checkup keeps the existing expense timeline and amount rules, with a purple preparation summary, compact white action cards, consistent item artwork, and quieter expandable analysis.

## Compatibility with an earlier hosted database

On 23 October 2026, read-only RPC discovery against the configured hosted project returned `PGRST202` for `household_checkup_plan`, including its exact application arguments. The older `household_spending_checkup` and `household_outlook` returned permission errors for unauthenticated/service contexts, confirming their presence without reading any household records. This establishes an unavailable new API function, not deleted household data. SQL inspection is still needed to distinguish an unapplied migration from a stale API schema cache.

When only the new checkup function is absent from the schema cache, the signed-in page now uses the existing authenticated `household_spending_checkup` query. It labels the view as the next 30 days, keeps totals, dates, item artwork, filters, pagination and existing record actions, and hides payday controls and change comparisons. It does not call the unsupported capture/payday RPCs or fabricate comparison history. Deep links to extended periods return to the clearly labelled 30-day view. Network errors, denied access, other missing functions and ordinary database failures retain the unavailable state. The application checks the new function again on later requests, so full controls return when its backend is available.

The basic compatibility view depends on the existing 037 release. Payday and change comparisons still require the hosted rollout below. No hosted migrations were applied during this investigation.

Compatibility verification passed with 388 unit tests, 72 disposable database checks, lint, type checking and a production build. Focused signed-in production checks passed in Chromium at 1280px/390px and WebKit at 390px, including unchanged records after cancellation and restoration of full controls/capture after the new RPC becomes available. Public/private HTTP and rendered-indexing smoke checks passed. See [hosted API discovery](../artifacts/checkup-compatibility/hosted-rpc-discovery.json), [browser checks](../artifacts/checkup-compatibility/browser-checks.json) and [validation limits](../artifacts/checkup-compatibility/validation.json). Local stand-ins and disposable PostgreSQL verified authenticated behavior; the hosted probe did not read a household's records.

## Completed flows

- **Until payday:** save the next payday, preview costs from today through the day before payday, change or cancel the date, and return to the 30-day view. The date is stored on the account. Expense schedules and payment records are untouched. Allowed dates are tomorrow through 365 days ahead in the account timezone. A passed date falls back to the 30-day view and asks for a new date. Keeply never assumes a recurring payday or household income.
- **What changed:** compare the same dates against the most recent earlier daily comparison point that covers the whole range. On the first day, the first checkup can serve as the baseline on a subsequent visit. Amount edits, estimate labels, added costs, missing amounts and removed upcoming expenses are distinguished. A removed expense does not imply a recorded payment or savings. Names, logos and source links come from current owned records. Deleted records get a generic identity and no broken source link.
- **First use and recovery:** a server-action POST saves the first checkup opened each local day. Page GETs and prefetches never create history. A failed capture offers retry without hiding the current plan. Failed payday saves retain the selected date. Native date validation, Cancel and Escape are supported. Premium access is checked on every read and write.
- **Samples:** sample payday choices exist only in the URL. The prior checkup is explicitly fictional. In the eight-day example, previous known costs are PHP 4,899 and current known costs are PHP 5,399 because the Toyota estimate changes from PHP 3,000 to PHP 3,500. One missing amount is excluded from both.

The comparison point contains expense identifiers, dates, amounts and an estimated boolean. It contains no copies of names, notes, logos or files. A full year of the existing shared projection permits a later selection of a different period. Local-day capture keys and a database lock prevent retries or tabs from replacing the first point. Comparisons are available for the preceding 35 local days. Existing scheduled maintenance removes stored points after 36 days, including for inactive accounts. Account deletion cascades preferences and history. This is functional account data, separate from optional analytics.

Totals cover the full selected period before expense/category pagination. Change details paginate independently in groups of 25, with full comparison totals on every page. Dates outside the current period are excluded from both sides, so rolling dates alone cannot change the comparison. A baseline that does not cover the range is not used for a partial or fabricated comparison.

## Required hosted rollout order

The owner's 23 October 2026 prerequisite-result screenshot confirms migration 039 as `PRESENT` and migration 040 as `MISSING`. The visible preceding rows 33 through 40 also report `PRESENT`. Do not rerun 039 or other previously confirmed migrations. No hosted SQL has been executed by the assistant.

1. The entire read-only [prerequisite check](../supabase/check-premium-checkup-prerequisites.sql) has already been run by the owner. Its result identifies 040 as the outstanding checkup prerequisite.
2. Skip **039**, which is confirmed present. Keep earlier confirmed migrations unchanged.
3. If **040** is reported missing, run [202610220040_premium_checkup.sql](../supabase/migrations/202610220040_premium_checkup.sql) in SQL Editor. It creates the private preference/snapshot tables, authenticated RPCs, flexible-period aggregates and retention hook. It preserves the older checkup RPC for existing clients. If present, do not rerun it.
4. Rerun the read-only prerequisite check. All rows must report `PRESENT` before enabling the payday and change-comparison experience. The compatibility view can continue using the existing 037 query while the newer backend is unavailable. If 040 is reported present but the API still returns `PGRST202`, check the deployed function signature and run `NOTIFY pgrst, 'reload schema';` in SQL Editor to refresh the API schema cache, then retry the page. Do not rerun a migration already applied. The [PostgREST schema-cache reference](https://github.com/PostgREST/postgrest/blob/main/docs/references/schema_cache.rst) documents this cache refresh.

The migration and prerequisite script have been run against disposable local PostgreSQL only. They have not been run against the hosted project. The existing scheduled maintenance job must remain operational for retention.

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

The modified [signed-in browser suite](../tests/browser/household-history.mjs) tests real server actions against local Auth/REST stand-ins and disposable PostgreSQL. The modified [public browser suite](../tests/browser/public-experience.mjs) exercises the sample account and rendered SEO. These commands have been run locally. Hosted services and physical devices remain outside this validation.

## Results

- All 366 unit tests and 248 disposable PostgreSQL integration checks passed. Lint, type checking and the production build passed.
- Signed-in production checks passed in Chrome at 1280px and 390px and WebKit at 390px, including first use, capture retry, no change, persisted payday, excluded payday, cancellation, invalid-date handling, failed-save recovery, comparison totals, logos, record navigation, expiry, and the existing amount/payment flows. See [Chrome results](../artifacts/premium-checkup/private-chromium.json) and [WebKit results](../artifacts/premium-checkup/private-webkit.json). Final WebKit verification includes the latest change descriptions. Unexpected page errors were zero; correlated cancelled-prefetch diagnostics from the local self-signed proxy are retained separately by the harness.
- Public/sample production checks passed in Chrome at 1280px, 390px and 320px and WebKit at 390px. Rendered SEO checks covered 18 routes, including canonical URLs, indexing, language/locale and affected structured-data fields. The checkup remains noindex and private destinations still require authentication. The privacy text now describes functional comparison history separately from optional analytics.
- Final narrow-screen checks passed with doubled text and deliberately failed utility logos in Chrome at 320px and WebKit at 390px, with zero page errors. See [visual accessibility results](../artifacts/premium-checkup/visual-accessibility-checks.json), [payday screenshot](../artifacts/premium-checkup/webkit-390-final-payday.png), and [change detail](../artifacts/premium-checkup/webkit-390-final-changes.png).
- Local mobile Lighthouse scored the [sample checkup](../artifacts/premium-checkup/lighthouse-checkup.json) 89 for performance, 100 for accessibility and 100 for best practices. Its SEO score of 66 reflects the intended noindex directive. The [privacy page](../artifacts/premium-checkup/lighthouse-privacy.json) scored 99/100/100/100. These are local production measurements, not hosted performance guarantees or external rich-result certification.

These original release checks use local production servers, test Auth/REST bridges and browser simulations. Hosted schema changes, deployment, physical-device behavior, and household comprehension have not been verified. The 23 October compatibility investigation separately checked hosted API availability as described above. The sample account is available locally without applying the migration; the full payday/change experience requires the hosted rollout above.
