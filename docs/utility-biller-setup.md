# Utility billers: deployment and validation

## Hosted database steps — required before deployment

The hosted schema state has not been confirmed for this change. The new migration has been applied only in an isolated temporary local PostgreSQL database, not hosted Supabase.

1. In the existing Supabase project's SQL Editor, run the complete `supabase/check-utility-biller-prerequisites.sql`. This read-only check lists all 28 migration markers in execution order.
2. Compare MISSING rows against the project's migration history. Apply only confirmed missing prerequisite migrations from `supabase/migrations`, in the returned sequence order 1–27. Do not rerun PRESENT migrations. The preceding loan-lender (`202610060025_loan_lenders.sql`) and insurance-provider (`202610060026_insurance_providers.sql`) migrations are prerequisites when missing; the check also includes all earlier subscription-brand, due-date-alert, timeline and core dependencies. Resolve earlier missing prerequisites first.
3. Once rows 1–27 are PRESENT, run the complete `supabase/migrations/202610060027_utility_billers.sql` if its marker is MISSING. It adds optional biller ID/custom name columns, a service eligibility map, type-change cleanup and an atomic save RPC with existing ownership/revision/date checks.
4. Rerun the read-only check. Every row must be PRESENT before deploying the application.
5. After deployment, verify authenticated create/save/reopen, rename, clear, custom billers, rent and association payees, compatible/incompatible bill-type changes, cancellation, errors and calendar/card/detail identity. Hosted authenticated saves and physical iOS/Android devices have not been verified locally.

## Local checks

From the repository root:

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run test:db
```

`scripts/test-database.mjs` was updated to run the new `tests/database/utilities.mjs` module. `npm run test:db` starts and removes an isolated local PostgreSQL instance; it never connects to hosted Supabase.

- 214 unit tests passed, including service scope, identity rendering, asset dimensions/transparency/storage, SQL catalog consistency, validation and RPC error handling.
- 130 local database integration tests passed with the full migration chain. Utility cases cover create/save/read/rename, old-client omission, explicit clearing, custom landlord/association names, compatible and incompatible type changes, cross-category cleanup, ownership, conflicts, atomic rollback, privileges and all 28 prerequisite markers.
- Chrome and Playwright WebKit at 1280 and 390 px passed picker search, keyboard selection, Escape, clearing, custom names, compatible provider retention/shared artwork, incompatible clearing, missing-date error, demo save, edit/rename/cancel and existing insurer picker regression.
- All 30 logo assets loaded in the browser catalog. Calendar dialogs, captions, circular badges and image-failure fallback passed without overflow or page errors. Screenshots use a temporary fixture with the dashboard's existing responsive container; the fixture was removed before the production build.
- Logo provenance is in `docs/utility-logo-sources.md`; 30 assets are reused across 35 service choices. Existing reminders are not assigned guessed providers. Demo Meralco/PLDT examples explicitly select their company identities.
- Public metadata, canonical URLs, robots and sitemap sources are unchanged. Rendered production verification results are recorded below after the final build.

Screenshots: `artifacts/utility-calendar-desktop.png`, `artifacts/utility-calendar-mobile.png`, `artifacts/utility-provider-catalog.png`.

Final local production checks: Chrome and Playwright WebKit passed the actual demo Meralco card and PLDT provider picker. Rendered homepage/loan-page titles and canonicals were preserved; homepage WebSite/WebApplication JSON-LD required fields were valid. Demo/add and protected-page login output retained noindex/nofollow. Local homepage Lighthouse scores: performance 95, SEO 100. These are simulated local measurements, not hosted or physical-device verification.
