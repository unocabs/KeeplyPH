# Household insights setup

Release 3 adds account-wide readiness, a seven-day household brief, a 30-day payment plan and expanded owner-scoped search. The private and fictional sample accounts use the same presentation. Calendar stays the default planning view, with List second.

## Behavior

Readiness checks vary by category. Purchases use the purchase date; appliances and electronics also offer a warranty-date check. Vehicles use registration and service history. Maintenance records use their next service date and actual service history. Other categories use a saved important date. Existing saved details take priority over preferences. Relevant checks can be marked not known yet, not applicable or hidden, and restored to To add later. Unknown and hidden details remain incomplete; not applicable details are resolved. This measures record completeness, never household safety. File uploads, sensitive identifiers and alert coverage are not required.

Payment amounts have four states: confirmed for a specific occurrence, estimated, unverified or not saved. Legacy amounts stay unverified. A recurring schedule stores an estimate or unverified amount; confirming one occurrence does not confirm later cycles. Each occurrence can override the schedule amount, explicitly leave its amount unset, or return to the schedule amount. Confirming an expected amount does not record a payment. Recording an actual payment stays in the existing completion/history flow.

The payment window includes today through day 30, matching the existing dashboard horizon. It includes actual open occurrences and fixed-schedule projections within that window, without duplicating the current occurrence or known completed/skipped dates. Overdue, archived, draft and completed occurrences are excluded. Completion-based schedules do not project later dates. Month-end anchors and saved end dates are respected. All supported amounts use PHP. Totals are exact integer strings, with separate totals and counts for each certainty state; no combined misleading total is displayed. Payment pages use 25-row keyset pagination while totals cover the whole account.

The brief covers today through six days later in the account timezone. It uses saved overdue/unconfirmed counts, saved upcoming dates, projected payment dates, up to two saved services and one open readiness suggestion. It is an in-app template, with no external generation, email delivery or provider data. Empty weeks say no payment dates are saved, rather than claiming there are no bills.

Search runs before server-side pagination and respects category filters. It searches item names, category identifiers, notes, merchant, purchase dates, date labels/notes, historical occurrence dates, current non-voided activity text/dates and ready authorised file names. Search does not read file contents, pending or failed files, private correction audit text or other accounts. Literal percent and underscore characters do not act as wildcards. The demo mirrors these searches locally.

## Hosted execution order

On October 9, 2026, the owner confirmed all 34 migrations are applied to hosted Supabase and supplied the read-only prerequisite output showing the Release 1, 2 and 3 markers as PRESENT. Do not rerun these migrations. The insights migration also returned “Success. No rows returned” after COMMIT.

The hosted schema prerequisite is satisfied. Deploy the matching application code, then check a real private account and the sample account. Verify name-only records, stored preference changes, a confirmed amount, a recurring estimate, search, cancellation and error recovery. Local stand-ins do not establish hosted Supabase, OAuth or physical-device behavior.

The migration was also tested in disposable local PostgreSQL databases. Application deployment has not been performed by this chat.

## Local checks and scripts

The modified `scripts/test-database.mjs` builds a disposable PostgreSQL instance, applies checked-in migrations and runs the existing integration suite plus the new `tests/database/household-insights.mjs`. The new module checks owner boundaries, readiness persistence, amount certainty, month-end projections, account-wide totals, pagination, literal search, ready-file visibility, account-local weeks and prerequisite markers. Run:

```sh
npm run test:db
```

The modified `tests/browser/household-history.mjs` also checks Release 3 through real application server actions against local Auth/REST stand-ins and that disposable database. It covers private/demo readiness, occurrence amount review, cancellation, validation, failed-save retry, refreshed data, search and desktop/mobile layouts. Run with the bundled Playwright module:

```sh
PLAYWRIGHT_MODULE=/Users/giancabrera/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs npm run test:household-ui
```

These test commands never connect to an existing database. PostgreSQL defaults to the existing Homebrew PostgreSQL 14 installation and can be set with `PG_TEST_BIN`. Installed Chrome and Playwright WebKit are required for the browser suite. Local ports 34571 and 34572 must be free. The harness starts and stops its local application and API; payment and notification delivery flags are disabled. These checks were run locally during implementation. They are optional regression commands for the owner, not hosted migration steps.

Unit coverage runs with `npm test`. Application checks use `npm run lint`, `npm run typecheck` and `npm run build`. Production HTTP smoke checks use `SMOKE_URL=http://localhost:34573 npm run test:smoke` after starting the built app on that port with `npm run start -- --port 34573`.

## Verification evidence

Passed locally: 272 unit tests, 176 isolated database integration checks, lint, typecheck, production build and HTTP smoke checks. The browser harness passed in Chrome desktop (1280 px), Chrome mobile (390 px) and WebKit mobile (390 px), with no recorded page errors. It exercised success, cancellation, validation, failed-save retry, preference persistence, immediate readiness refresh, single-occurrence confirmation, return to schedule amount, account-wide insights and expanded search.

The final production demo also passed in those three browser contexts over local HTTPS. The temporary local proxy used a self-signed certificate accepted only in test contexts, allowing WebKit to run the production security policy. The amount editor clears its consumed URL parameters through the documented native History API rather than starting another data navigation.

Rendered homepage titles/descriptions, canonical, en-PH language, en_PH locale and WebSite/WebApplication structured data were checked. The new private route remains protected; demo and private pages remain noindex and excluded from the sitemap. Robots output retains the public sitemap. Local production Lighthouse for the demo scored performance 93, accessibility 100 and SEO 66. The SEO deduction comes from the intentional noindex directive. These are simulated local results, not hosted measurements or physical-device verification.

Evidence is in `artifacts/household-insights/verification.json`, `seo-checks.json`, `lighthouse-demo.json` and desktop/mobile screenshots. The full browser case report is `artifacts/household-history/browser-checks.json`. Physical devices and hosted integrations remain separate checks.

## Remaining release

Release 4 covers public positioning and finished-feature demonstrations. See `docs/household-public-release.md` for its implementation status and verification evidence.
