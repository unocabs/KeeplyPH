# Household core experience: Release 2

## Delivered behavior

The private and sample dashboards share the same component and ordering: household heading, needs attention, account-wide navigable counts, one next-30-days planning section, and household records. Calendar is the default planning view, with List as the secondary option. Both views show the same dates, including separate maintenance and registration dates on one vehicle. Category filters apply to the records section and never hide household-wide attention or planning. Every complete list is accessible through its corresponding navigation link.

Needs attention combines overdue/expired open dates and unconfirmed historical occurrences. Counts come from account-wide queries, independently of the bounded dashboard preview. The database now includes the three earliest overdue dates even when their items are older than recent records. The existing owner-scoped review page retains pagination and exact historical occurrence links.

The sample account shows the same experience with fictional overdue dates, one unconfirmed payment, prior service costs, a sample receipt and links into the creation flow. The private and sample missed-cycle lists share their rendering and cursor order. Sample interactions never save data, make payments or send alerts. Readiness, payment forecasts and weekly briefs remain Release 3 and are not presented as finished capabilities.

Creation starts with essential details. Provider, brand, notes, schedule end, payment amounts, alert timings, purchase details and attachments can be expanded as needed. Existing values remain mounted while collapsed, so saving does not clear them. Validation reveals collapsed invalid fields. A new item can be saved with a name and no initial date. Later dates use the existing item detail flow. Existing vehicles can receive an additional date without a duplicate vehicle. Category identifiers, providers, record IDs, alert capacity and current schedules are preserved.

## Hosted execution order, before deployment

The hosted schema has not been checked or changed by this work. Local integration tests use an isolated PostgreSQL database.

1. Run the complete `supabase/check-household-core-prerequisites.sql` in the project's Supabase SQL Editor. It is read-only and returns 33 markers in execution order.
2. Compare MISSING markers with actual migration history. Apply only confirmed missing prerequisites from rows 1 through 31, in the returned sequence. Do not rerun PRESENT or previously confirmed migrations. Investigate any disagreement with recorded migration history.
3. If row 32 (household history) is missing, back up the database and objects, verify recovery, and pause notification and maintenance cron jobs. Run `supabase/migrations/202610080031_household_activity_history.sql` once. Follow `docs/household-history-setup.md` for the lifecycle cutover requirements. Skip this migration if already confirmed applied.
4. Once rows 1 through 32 are PRESENT, run `supabase/migrations/202610080032_household_core_experience.sql` only if row 33 is missing. This transaction permits name-first creation while retaining date validation, ownership and existing grants. It also adds overdue items to the bounded dashboard selection. It does not change existing records.
5. Rerun the read-only check. All 33 markers must be PRESENT before deploying matching code to preview/staging.
6. Verify authenticated name-only creation, adding a date later, normal creation, provider persistence, existing-vehicle reuse, optional alerts, cancellation, failed-save retry, overdue and historical review, and demo navigation on supported devices. Real OAuth, Storage, delivery and payment integrations require their existing provider checks.
7. Restore workers paused for the history migration after compatible lifecycle behavior is verified. Then follow the established production deployment process.

No hosted migration or deployment was performed.

## Local scripts and commands

Run from the repository root:

```sh
npm test
npm run lint
npm run typecheck
npm run test:db
PLAYWRIGHT_MODULE=/Users/giancabrera/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs npm run test:household-ui
npm run build
```

The updated `scripts/test-database.mjs` applies migrations to a disposable local PostgreSQL database, runs existing regressions, then the new `tests/database/household-core.mjs`. The new module verifies gradual creation, adding dates later, provider/category persistence, validation rollback, account isolation, oldest overdue selection beyond recent records, archive handling and the complete prerequisite check. Use `npm run test:db` to execute both the old and new database checks.

The updated `tests/browser/household-history.mjs` is run by `npm run test:household-ui`. It exercises real Next.js pages and server actions with local Auth/REST stand-ins and isolated PostgreSQL. It checks desktop Chrome, mobile Chrome and mobile WebKit. It retains history/lifecycle checks and adds attention ordering, one planning view, category-filter independence, list/calendar consistency, demo review/history/creation, actual name-first saves, provider preservation, failed-save retry, adding dates later, existing-vehicle reuse, collapsed validation and actual purchase saves. It saves reports in `artifacts/household-history` and screenshots in `artifacts/household-core`.

Playwright and its browser engines must be available. The command above uses this workspace's bundled module and installed Chrome. Local ports 34571 and 34572 must be free. PostgreSQL uses `PG_TEST_BIN`, defaulting to the existing Homebrew PostgreSQL 14 installation. The harness starts and stops its own local app and test API, with payment and delivery flags disabled. It does not establish physical-device or hosted-provider compatibility.

## Verification

October 8, 2026: 262 unit tests and 162 isolated PostgreSQL integration tests passed. ESLint, TypeScript and the final production build passed. The extended browser suite passed the complete history and core-experience flows in desktop Chrome (1280px), mobile Chrome (390px) and mobile WebKit (390px), with no page errors. Existing HTTP smoke checks also passed against the production build.

Production rendering verified en-PH, en_PH, homepage canonical and description, homepage WebSite/WebApplication JSON-LD parsing and required fields, demo/add/private noindex output, the unchanged robots directives and sitemap exclusions, one dashboard h1 and mobile overflow. Public marketing source, sitemap, robots, canonical URLs and structured-data definitions are preserved. No external rich-result validator was used.

Local production Lighthouse: homepage performance 100, accessibility 100, SEO 100; demo performance 97, accessibility 100, SEO 66 after making Calendar the default. The demo SEO deduction is its intentional noindex directive. The sample banner's existing contrast issue was corrected and its mobile font increased before the final demo audit. Calendar/List switching and the Calendar default were checked in Chrome desktop/mobile and WebKit mobile. These are simulated local results, not hosted measurements. Reports and screenshots are in `artifacts/household-core`; the browser suite's case report is in `artifacts/household-history/browser-checks.json`.

Hosted Supabase, Google OAuth, actual Storage upload/download, external delivery/payment integrations and physical devices remain unverified by these local checks. The existing attachment processing behavior was retained, rather than replaced with a new upload integration.

## Rollback and remaining releases

Retain history schema and data. The core migration is compatible with earlier completion callers. An older UI can still open name-only items and add dates through the item page, even if its creation form requires a date. Do not drop activity data or rerun old migration definitions to roll back the interface.

Two implementation releases remain: Release 3 adds readiness, payment summaries, weekly briefs and expanded search; Release 4 updates the public demonstrations and marketing presentation around the finished product. Hosted verification and deployment remain a separate final step.
