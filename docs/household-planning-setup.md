# Shared household planning foundation

This is milestone 1A of the approved Free and Premium experience plan. The free payment plan, weekly payment count, and 30-/90-/365-day planner now project dates from one database function. Sample payment planning and extended planning also share one TypeScript implementation. The existing public RPC signatures, Premium guards, prices, trial rules, alert policy, storage allowances, and UI are retained.

The range remains inclusive: account-local today through today plus the selected number of days. A current date's confirmation or explicit unknown amount overrides only that date. Future fixed dates inherit the schedule amount. Completion-based services have no invented future dates. Completed, skipped, and superseded projected dates are excluded. A purchase price is not added again at warranty expiry. Reporting categories use the saved item's canonical category once, independently of overlapping browse filters.

The internal projection normalizes a missing cost-applicability flag to `false` rather than SQL `null`. This does not add or remove payment rows or change totals. Unknown amounts, known zero, estimates, and legacy unverified amounts stay distinct. Recorded completion is not evidence of payment. Historical payments are not added to upcoming costs.

## Hosted prerequisites and deployment order

On October 10, 2026, the owner confirmed that migrations `202610100034_household_premium.sql`, `202610100035_household_email.sql`, and `202610100036_shared_household_planning.sql` are `PRESENT`, with a screenshot of prerequisite rows 35 through 37. Earlier prerequisites 1 through 34 were already recorded as confirmed on October 9. Do not rerun these confirmed migrations.

The agent exercised the foundation migration in disposable local PostgreSQL and did not execute hosted SQL. The owner's schema confirmation does not establish that application deployment, worker cutover, physical installation, or external provider acceptance has been completed. Preserve the provider and worker verification requirements in [the Premium rollout guide](household-premium-setup.md).

The next Spending Checkup release has its own [read-only check and deployment instructions](household-spending-checkup.md#hosted-deployment). Its new prerequisite is separate from the confirmed foundation.

## Local verification

The modified `scripts/test-database.mjs` harness creates and destroys an isolated PostgreSQL database. It never connects to hosted Supabase. It checks historical contracts, captures projection fixtures before the new migration, applies the new migration, checks unchanged records and compatible results, and exercises current Premium/trial/email contracts afterward.

Run from the repository root:

```sh
npm test
npm run test:db
npm run lint
npm run typecheck
npm run build
```

Both SQL and TypeScript tests consume `tests/fixtures/household-planning.json`. Coverage includes month-end/leap-year dates, inclusive endpoints, overdue recurring schedules, amount overrides, explicit unknowns, zero, legacy certainty, closed dates, archive/draft exclusion, category identity, and warranty prices. Database tests additionally cover owner isolation, private helper execution denial, Premium access checks, account-local time, full-account totals before pagination, and the distinction between completion and payment.

Verification completed locally on October 10, 2026:

- 316 unit tests and 213 isolated database integration tests passed.
- Lint, TypeScript checks, and the production build passed.
- Production browser checks passed in desktop Chrome (1280 px), mobile Chrome (390 px), and mobile WebKit (390 px), including amount/payment cancellation, validation, failed-save retry, history, simulated installed-app activation, trial expiry, and sample planning.
- Public production browser checks also passed at 320 px. Rendered SEO checks covered 15 pages, canonical URLs, language/locale, structured-data fields, sitemap entries, and public/private indexing rules. This was local validation, not external rich-result certification.
- [Mobile Lighthouse on the sample dashboard](../artifacts/household-planning/lighthouse-demo.json) scored 91 for performance and 100 for accessibility and best practices. The SEO score was 66 because the sample account intentionally remains `noindex`. This was a local production audit over HTTP, not a hosted measurement or a physical-device result.

The modified database harness was run with `npm run test:household-ui` and `PG_TEST_PRODUCTION=1`, with the existing Playwright runtime configured. This runs the full database suite before browser checks. The new database test module is invoked by that harness and by `npm run test:db`; it is not a standalone script. The read-only prerequisite query was checked before the migration (new prerequisite missing) and afterward (all 37 present) in isolated PostgreSQL.

Local database, mocked provider, and browser tests do not verify hosted schema deployment, native installation, OAuth, real push/email delivery, or PayMongo. This foundation adds no device integration or new user-facing feature. Public pages, metadata, indexing directives, structured data, and sitemap code are unchanged.
