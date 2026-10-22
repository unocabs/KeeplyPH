# Premium 30-Day Spending Checkup

This milestone adds `/checkup` for Premium accounts and `/demo/checkup` for the fictional sample account. The dashboard's existing Premium entry and a link in the household planner open the Checkup. Free accounts see a short explanation with separate links to the sample, Premium plans, and their existing Free payment plan.

The Checkup presents one household preparation total, a next-action prompt, and a chronological expense timeline. Entered amounts display normally, with labels only for estimates and missing amounts. The historical internal confirmation buckets still contribute to the same total, without confirmation subtotals, badges or reconfirmation prompts. Item logos or fallback icons accompany both timeline entries and item-specific prompts. Period and category analysis lives in an expandable Cost breakdown, after the timeline. Period and category links open the contributing expenses on the same page and retain full-account totals. Each expense links to its saved record. Amount prompts open the existing occurrence editor with a specific occurrence guard; projected dates open the saved schedule's record instead. Payment recording remains in the existing Free payment editor. No bank data, AI service, background job, historical snapshot, or what-if scenario is introduced. Spending-change attribution remains deferred.

The first unfiltered page prioritises a missing amount, then an estimate, then the next expense. It uses only available first-page records and makes no claim to rank unseen records. When an amount needing review is outside that page, or the list is filtered or paginated, the prompt opens the full payment plan without identifying a next item. Empty plans invite adding a household expense. Unknown-only plans show no numeric total; a known zero is explicitly labelled. Introductory timeline messages appear only on the unfiltered first page. Ending messages additionally require no further pages. The household category order begins with bills, maintenance, and purchases/warranties; identifiers and saved records are unchanged.

## Calculation and access rules

- The range preserves the approved inclusive contract: account-local today through today plus 30 days. Both dates are visible. Seven-day periods start at today and repeat every seven days; the final period has three dates. The UI calls them periods because the last is shorter. Costs are compared by their totals, without normalising them to a daily rate.
- The database and sample account both use the shared household planning projection from migration 036. Paid, completed, skipped, superseded, archived, and out-of-window dates follow that existing contract. Historical payments and purchase prices at warranty expiry are not added to upcoming totals. A saved cost never proves that a payment was made.
- Full-account totals, period sums, source counts, and category sums are computed before filtering or pagination. Details use 25-row pages with `(due_on, date_id)` cursors. Selecting a category or period changes the contributing list, not the overall Checkup figures.
- Each date is assigned to its saved record's canonical household category exactly once. Vehicle maintenance and insurance dates remain in Vehicles, independently of the overlapping browse sections. Category and period sums reconcile exactly to the recorded total. Shares use exact integer minor units and are rounded to one decimal place only for display. A tiny positive share is shown as `<0.1%`; a partial share that would round to 100% is shown as `>99.9%`.
- Comparisons require positive amounts from at least two distinct saved dates. One recurring bill with multiple upcoming dates does not create a comparison. Empty, all-unknown, known-zero, and insufficient-data states provide appropriate guidance. A sample link remains separate from the actual account's figures.
- Tied periods explicitly share the highest total, with the earliest shown deterministically. If all positive costs fall in one period, the page describes grouped costs instead of claiming a comparative winner. Missing amounts can change the result, and estimates retain their labels.
- The authenticated RPC checks current Premium access before reading the projection. Free and expired accounts cannot retrieve advanced aggregates by calling the RPC directly. Its private helper is unavailable to anonymous, authenticated, and service roles. Expiry preserves the existing Free totals and actions. An expired period bookmark returns to the current overview, retaining any valid category selection.
- Category links keep the visible category, amount, estimate, and share in their accessible names. Keyboard users can open the contributing-period and category links using normal link controls.
- Record, schedule, archive/delete, amount, payment, and completion actions invalidate `/checkup` so returning through normal app navigation shows fresh figures. Read failures use Next.js 16.3.8's `retry()` to refetch the segment. Its older `reset()` only clears the boundary state and cannot recover a failed server read by itself. The installed framework guide, implementation, and official Context7 documentation were checked for this distinction.

## Hosted deployment

The owner confirmed this rollout complete on October 11, 2026, including migration 037 and all 38 prerequisites. The following steps are retained as completed rollout reference. Do not rerun migration 037. The next release is documented in [Household Outlook](household-outlook.md).

The owner confirmed migrations 034, 035, and 036 as `PRESENT` on October 10, 2026, with a prerequisite-check screenshot. Earlier prerequisites were already confirmed. Do not rerun these migrations.

1. Before deploying the Checkup application code, run the complete [read-only Checkup prerequisite query](../supabase/check-household-spending-checkup-prerequisites.sql) in the hosted Supabase SQL Editor. This new query lists 38 prerequisites. The agent tested it locally before and after the new migration. If a previously confirmed prerequisite is unexpectedly missing, reconcile the database history before continuing.
2. If row 38 is `MISSING` and rows 1 through 37 are `PRESENT`, run the complete [202610100037_household_spending_checkup.sql](../supabase/migrations/202610100037_household_spending_checkup.sql) in the SQL Editor. It adds the read-only, Premium-gated RPC and private aggregation helper. It does not rewrite household data, change existing RPC contracts, or alter payment, trial, alert, or storage policy. It does not require pausing delivery workers.
3. Rerun the read-only query. All 38 rows must be `PRESENT` before deploying the matching application code. If row 38 was already `PRESENT`, do not apply the migration again.

The new migration and prerequisite query have been run only in disposable local PostgreSQL by the agent. The owner confirmed the hosted migration and prerequisite steps as done on October 11, 2026. Do not rerun migration 037. The agent has not independently checked the hosted database or deployed the application. Earlier provider, native installation, and email cutover acceptance requirements are separate from schema presence.

## Local verification commands

The modified [database harness](../scripts/test-database.mjs) applies the new migration after the shared foundation. It invokes the new [Checkup database test module](../tests/database/spending-checkup.mjs), which is not a standalone script. Shared [fixtures](../tests/fixtures/spending-checkup.json) exercise SQL and sample calculations across empty, recurring, unknown, zero, tied, same-period, inclusive boundary, cross-year, and canonical-category cases. Further checks cover full-account pagination, owner isolation, direct RPC access, expiry, timezone, unchanged records after reads, and payment/completion separation.

The modified [private browser suite](../tests/browser/household-history.mjs) checks Free discovery, the separate sample, Premium low-data states, total agreement, period/category drill-down, saved-record links, cursor pages, stale bookmarks, failed-read recovery, real amount/payment changes, and expiry with Free access preserved. The modified [public browser suite](../tests/browser/public-experience.mjs) checks sample navigation, mobile layout, and rendered public/private SEO rules.

Run from the repository root:

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run test:db
export PLAYWRIGHT_MODULE=/Users/giancabrera/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs
PG_TEST_PRODUCTION=1 npm run test:household-ui
node tests/browser/public-experience.mjs
```

For only the signed-in checkup browser flows after building, run `PG_TEST_PRODUCTION=1 PG_TEST_CHECKUP_ONLY=1 npm run test:household-ui`. The database harness still runs its isolated integration checks first. This focused mode covers the primary occurrence-editor link, cancellation, validation, failed-save recovery, filters, pagination, refresh after changes, expiry, and sample artwork.

The database commands create and destroy isolated local PostgreSQL databases. Browser checks use local production servers and local Auth/REST stand-ins, with real application server actions and SQL functions. They do not verify physical devices, hosted OAuth, Storage, push/email delivery, or PayMongo. They never write to hosted Supabase.

## Verification results

### Timeline and amount wording update, 22 October 2026

- 362 unit tests, lint, type checking, the production build, and 242 isolated database integration tests passed.
- Focused private production checks passed in Chromium at 1280px and 390px and WebKit at 390px. Public/sample checks passed in Chromium at 1280px, 390px, and 320px and WebKit at 390px. They include editor cancellation and failed-save recovery, full-account totals across filters/pages, refresh after edits/payments, and the absence of amount confirmation labels. Existing rendered public/private indexing smoke checks passed; the public suite checked metadata and indexing on 18 routes.
- Additional local HTTPS checks verified item artwork, deliberately broken-logo fallbacks, and doubled-text layouts without overflow in Chromium at 320px and WebKit at 390px. Results are in [timeline-identity-checks.json](../artifacts/household-checkup/timeline-identity-checks.json). These checks simulate browsers and viewport sizes. Physical devices, hosted Supabase and deployment remain unverified.
- A local mobile Lighthouse audit of `/demo/checkup` scored 94 for performance and 100 for accessibility and best practices. The visible-label/name audit passed after timeline links were updated to expose all their visible content and describe the date separately. The sample's SEO score is 66 because it intentionally remains `noindex, nofollow`; the rendered public-page indexing checks passed. See [lighthouse-timeline.json](../artifacts/household-checkup/lighthouse-timeline.json). This is a local HTTP audit, not a hosted performance measurement or external structured-data certification.

Local checks on October 10, 2026:

- 330 unit tests and 223 isolated PostgreSQL integration tests passed. Lint, TypeScript checks, and the production build passed.
- Private production browser checks exercise desktop Chrome at 1280 px, mobile Chrome at 390 px, and mobile WebKit at 390 px. Checkup coverage includes real server actions for adding and clearing an estimated amount, recording a payment, and returning through ordinary client navigation to see the updated total. A simulated failed server read recovers through Try again, and expiry preserves the Free payment plan.
- Public production browser checks cover Chrome at 1280, 390, and 320 px, plus WebKit at 390 px. They check sample totals, period/category navigation, keyboard links, and layout without horizontal overflow. The 320 px and 390 px screenshots were visually reviewed.
- Rendered SEO checks cover 17 pages, including the new sample and authenticated Checkup. Titles, descriptions, canonical URLs, language/locale, structured-data fields, sitemap entries, and indexing directives were checked. Public marketing pages retain indexing; the sample remains intentionally `noindex, nofollow`, and private routes redirect signed-out visitors to sign-in. This is local validation, not external rich-result certification.

- [Mobile Lighthouse on the sample Checkup](../artifacts/household-checkup/lighthouse-checkup.json) scored 92 for performance and 100 for accessibility and best practices. The visible-label accessibility audit also passed after removing category labels that hid their amounts. SEO scored 66 because this fictional sample intentionally blocks indexing. This was a local production audit over HTTP, not a hosted or physical-device measurement.

The [private browser report](../artifacts/household-checkup/private-browser-checks.json), [public browser report](../artifacts/household-checkup/public-browser-checks.json), [rendered SEO checks](../artifacts/household-checkup/seo-checks.json), and screenshots are saved in `artifacts/household-checkup`. Browser sizes and installed-app detection are simulated. Physical devices, hosted integrations, and hosted migration deployment remain outside this local verification.
