# Loan lenders: setup and validation

## Before deploying

A read-only REST check against the configured hosted project returned SQL error 42703: `items.lender_id` does not exist. Earlier migration markers have not been confirmed; the complete SQL prerequisite check below is still required. These files have only been applied/tested in an isolated local PostgreSQL instance, not the owner's Supabase project.

1. In the existing Supabase project's SQL Editor, run **all of** `supabase/check-loan-lender-prerequisites.sql`. It is read-only and reports all 26 migration markers, including the new lender fields and save RPC.
2. Review any MISSING prerequisites against the project's migration history. Apply only confirmed missing migrations from `supabase/migrations`, in the check's sequence order (1–25), before the lender migration. Do not rerun PRESENT migrations. The immediate preceding migrations are `202610050022_subscription_brands.sql`, `202610050023_due_date_alerts.sql`, and `202610060024_expand_dashboard_timeline.sql`; earlier missing prerequisites must also be resolved first.
3. If the lender marker is MISSING and all earlier rows are PRESENT, run the entire `supabase/migrations/202610060025_loan_lenders.sql` in that same SQL Editor. It adds optional `lender_id`/`lender_name`, validates supported providers per loan type, adds the atomic authenticated save RPC, and makes older save RPCs retain compatible lenders or clear them when changing to an incompatible type. Existing reminders are not assigned guessed lenders.
4. Rerun `supabase/check-loan-lender-prerequisites.sql`; all rows should be PRESENT. Then deploy the application.
5. On the hosted app, create/save/reopen a loan with a lender; rename it; clear it; change between compatible bank categories and incompatible specialist categories; test Other lender with a custom name; confirm car/motorcycle brand and dates remain intact. Hosted authenticated saves and real iOS/Android devices still require this verification.

## Local checks

From the repository root:

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run test:db
```

`scripts/test-database.mjs` invokes the new `tests/database/lenders.mjs` module. `npm run test:db` starts and removes a temporary local PostgreSQL database; it never connects to the hosted project. The lender tests cover saved identity in detail/list/dashboard reads, explicit clearing, omitted-value preservation, custom names, compatible/incompatible category changes, car/motorcycle identity, ownership, revisions, invalid input, rollback, and restricted anonymous/direct writes.

Logo provenance and storage are documented in `docs/lender-logo-sources.md`. Validation completed locally:
- 200 unit tests passed; lint, TypeScript and the production build passed.
- 120 isolated PostgreSQL integration tests passed, including five new lender scenarios and the complete migration chain. Nothing was applied to hosted Supabase.
- Chrome and Playwright WebKit at 1280 px and 390 px covered search, keyboard selection, Escape, clearing, custom names, compatible/incompatible type changes, manufacturer/lender independence, demo save success, cancellation, saved-item edit initialization, independent renaming, all logo loads, calendar details and image failure fallback. No page errors or horizontal overflow occurred. The final circular-badge adjustment was also checked on the production build in Chrome and WebKit at 390 px.
- Public homepage and loan page titles, descriptions, canonical URLs and indexing were preserved in rendered output; demo/add previews and the protected-item login redirect remain noindex/nofollow. Homepage WebSite/WebApplication JSON-LD parsed successfully and required fields were checked. The loan page has no structured data to modify. Sitemap and robots sources were untouched.
- Lighthouse on the local production build: homepage performance 97 / SEO 100; loan page performance 99 / SEO 100. These are local simulated results, not hosted-device measurements. External rich-result validation was not performed.
- Hosted authenticated browser saving and physical Safari/iOS/Android testing remain unverified. Complete step 5 after the hosted prerequisite check and migration.

Review screenshots: `artifacts/lenders-calendar-chrome-1280.png`, `artifacts/lenders-calendar-webkit-390.png`, and `artifacts/lenders-catalog-chrome-1280.png`. Temporary review routes were removed before building.
