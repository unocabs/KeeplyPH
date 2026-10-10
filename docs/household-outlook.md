# Household Outlook improvements

This milestone improves the existing 30-, 90-, and 365-day planner at `/planner`, with the 90- and 365-day horizons remaining Premium-only. It adds full-account monthly comparisons, the largest recorded monthly total, and up to three contributing saved expenses for each selected month. The fictional sample at `/demo/planner` offers the same presentation and temporary amount editing.

## Behaviour and calculation contract

The Outlook uses the shared planning projection introduced by migration 036. It retains the inclusive account-local range from today through today plus the selected number of days. It does not create a second recurrence engine or change saved schedules. Completed, skipped, superseded, archived, and out-of-window dates follow the shared projection's existing rules. A purchase price is not charged again at warranty expiry. Completing an obligation does not establish that it was paid.

- Monthly totals use the upcoming expected costs, including saved estimates and legacy amounts. Estimates have explicit amount labels; detail rows distinguish confirmed, estimated, and other expected amounts.
- Household dates and expenses with costs have separate counts. Unknown costs, known zero, nonfinancial dates, and months without any dates have different presentation. Empty months never imply that the household will have no expenses.
- Each calendar month shows its exact covered dates. The first and last months may be partial. Comparisons explicitly flag unequal coverage and compare recorded totals, without normalising to a daily rate or claiming affordability.
- Highest-month analysis requires positive amounts from at least two distinct saved dates. One repeating bill does not create a comparative insight. Equal highest totals are labelled as ties; the earliest is shown. Costs grouped in one month are described as grouped costs.
- The comparison controls allow two calendar months to be selected independently of the detail list. Comparing a month with itself asks for a different selection. If either month has no known amount, the interface asks for amounts before stating a difference. Known zero is a valid amount. Differences use exact integer minor units, including totals above JavaScript's safe integer limit.
- Contributors group the same saved date within a month, sort by recorded cost and then date ID, and retain links to the source household record. The three displayed contributors are not claimed to be the entire total. Monthly and global figures are computed before month filtering and 25-row cursor pagination.
- A stale month bookmark returns to the current full view. A failed server read uses the existing Try again boundary. Amount, schedule, record, completion, and payment actions invalidate `/planner`, so normal app navigation shows fresh figures. If Premium expires during a request, the page returns to the existing Free 30-day view.
- The new `household_outlook` RPC checks Premium for every horizon, including its 30-day analysis. Its private helper is not executable by anonymous, authenticated, or service roles. The existing `household_planner` RPC and its response contract remain intact for Free and older application code.
- Sample edits remain fictional and local to the current horizon. They survive month and cursor navigation and update totals, comparisons, and contributors together. Switching horizon or reloading starts from the canonical sample again. Saved private records are never used in the public sample.

Spending changes since a previous review, historical snapshots, what-if tools, pricing, purchase policy, and trial activation remain outside this milestone.

## Hosted rollout

On October 11, 2026, the owner confirmed completion of the Checkup rollout steps, including migration 037 and the 38-row prerequisite check. Earlier migrations were already confirmed. Do not rerun migrations 034 through 037.

Before deploying this milestone:

1. Run the complete [read-only Outlook prerequisite query](../supabase/check-household-outlook-prerequisites.sql) in hosted Supabase SQL Editor. It checks all 39 prerequisites. If any previously confirmed prerequisite is unexpectedly missing, reconcile the schema/history first.
2. If rows 1 through 38 are `PRESENT` and row 39 is `MISSING`, run the complete [202610110038_household_outlook.sql](../supabase/migrations/202610110038_household_outlook.sql) in the SQL Editor. It adds the read-only, Premium-gated Outlook RPC and private aggregation helper. It does not rewrite household records or change the older planner RPC. No delivery-worker cutover is involved.
3. Rerun the read-only query. All 39 rows must be `PRESENT` before deploying the matching application code. If row 39 was already present, do not rerun migration 038.

The agent applied migration 038 and checked the prerequisite query before and after it only in disposable local PostgreSQL. Hosted application and SQL deployment have not been performed by the agent. Migration 038 has not yet been confirmed on hosted Supabase.

## Verification commands

The updated [database harness](../scripts/test-database.mjs) applies migration 038 and invokes the new [Outlook database module](../tests/database/household-outlook.mjs). That module is not a standalone script. SQL and sample unit checks share [Outlook fixtures](../tests/fixtures/household-outlook.json), including cross-year/leap-day boundaries, current overrides versus future estimates, zero, unknown, nonfinancial dates, ties, and grouped costs. Database tests additionally cover timezone, owner isolation, direct RPC access, expiry, complete contributors beyond the first page, unchanged records after reads, and completion without an assumed payment.

The modified [private browser suite](../tests/browser/household-history.mjs) checks access, low data, comparisons, coverage, source navigation, real future-cost edits, pagination, stale bookmarks, failed-read retry, and expiry. The modified [public browser suite](../tests/browser/public-experience.mjs) checks sample comparisons, keyboard links, month and cursor navigation, totals, mobile layout, and rendered SEO.

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

The database harness creates and destroys an isolated local database. Browser checks use local production servers, local Auth/REST stand-ins, and real server actions and SQL. They do not write to hosted Supabase or verify hosted OAuth, Storage, push/email, PayMongo, or physical installation. Browser viewport simulation is not physical-device acceptance.

## Local verification results

Checks on October 11, 2026:

- 339 unit tests and 233 isolated PostgreSQL integration tests passed, including the new shared fixtures and prerequisite check before and after migration 038.
- Lint, TypeScript checks, and the production build passed.
- The full private production browser suite passed in desktop Chrome at 1280 px, mobile Chrome at 390 px, and mobile WebKit at 390 px, with no browser errors. Outlook checks covered Free access and Premium expiry, low-data states, full-account totals and contributors, independent comparisons, partial-month coverage, saved-record navigation, cursor pagination, amount updates through real server actions, stale bookmarks, and failed-read retry. Existing history, checklist, payment, sample-edit cancellation and validation, and trial flows passed too. HTTP smoke and public/private indexing checks passed.
- Public production browser checks passed in desktop Chrome at 1280 px, mobile Chrome at 390 and 320 px, and mobile WebKit at 390 px. Coverage includes comparisons, keyboard month navigation, full totals through month and cursor selection, switching horizons, and mobile destination headings clearing the fixed header. Mobile comparison and full-page screenshots were visually reviewed.
- Rendered SEO checks covered 17 pages, canonical URLs, indexing directives, en-PH/en_PH metadata, structured-data fields, and the ten sitemap entries. Public marketing pages remain indexable; sample pages remain intentionally `noindex, nofollow`, and private pages redirect signed-out visitors to sign-in. Structured data was parsed and checked locally, without external rich-result certification.
- [Mobile Lighthouse on the sample year Outlook](../artifacts/household-outlook/lighthouse-planner.json) scored 100 for performance, accessibility, and best practices. SEO scored 66 because the fictional sample intentionally blocks indexing. This was a local production measurement over HTTP, not a hosted measurement or a physical-device result.

The [private browser report](../artifacts/household-outlook/private-browser-checks.json), [public browser report](../artifacts/household-outlook/public-browser-checks.json), [SEO report](../artifacts/household-outlook/seo-checks.json), and screenshots are retained in `artifacts/household-outlook`.
