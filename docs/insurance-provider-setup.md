# Insurance providers: setup and verification

## Before deploying

A read-only REST check of the configured hosted Supabase project returned SQL 42703: `items.insurer_id` does not exist. The earlier lender-field request returned a table-permission error, which does not confirm all prerequisite migration markers. The full SQL prerequisite check remains required. The insurance migration has been applied only to a temporary local PostgreSQL instance, not the owner's hosted project.

1. In the existing Supabase project's SQL Editor, run the entire `supabase/check-insurance-provider-prerequisites.sql`. This read-only check reports all 27 migration markers in execution order.
2. Review MISSING rows against the hosted migration history. Apply only confirmed missing prerequisites from `supabase/migrations`, in the returned sequence order 1–26. Do not rerun PRESENT migrations. This includes the preceding subscription-brand, due-date-alert, timeline-expansion and loan-lender migrations when missing; resolve earlier missing prerequisites first.
3. Once all earlier rows are PRESENT, run the entire `supabase/migrations/202610060026_insurance_providers.sql` in that same SQL Editor if its marker is MISSING. It adds optional insurer/provider identity, enforces the eligibility map and custom-name rules, and saves provider identity and dates atomically with ownership/revision checks. Existing reminders are not assigned guessed insurers.
4. Rerun the prerequisite check; every row should be PRESENT before deploying the app.
5. After deployment, verify authenticated create/save/reopen, rename, clear, compatible/incompatible type changes, custom provider names, cancellation, and calendar/card/detail identity. Hosted authenticated saves and physical iOS/Android devices remain unverified locally.

## Local validation

Run from the repository root:

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run test:db
```

The modified `scripts/test-database.mjs` invokes the new `tests/database/insurers.mjs` module. `npm run test:db` starts and removes a temporary local PostgreSQL database and never connects to hosted Supabase. It has already run successfully locally with the complete migration chain.

Completed checks:
- 207 unit tests passed. Lint, TypeScript and the production build passed.
- 125 local PostgreSQL integration tests passed, including five new insurance scenarios: persistence across read RPCs, rename/old-client behavior, explicit clearing versus omission, scoped provider/HMO compatibility, cross-category identity cleanup, custom names, ownership/revision checks, rollback, privileges and prerequisite markers.
- Chrome and Playwright WebKit at 1280 and 390 px verified search, keyboard selection, Escape, clearing, custom names, compatible/incompatible insurance-type changes, HMO labeling, BPI AIA versus BPI/MS scope, demo save, editing a saved fixture, independent rename, cancellation and the existing loan picker.
- All 28 images loaded. Calendar dialogs and provider captions worked; badges remained circular; image failures showed the existing insurance-type glyph and removed the badge. No page errors or horizontal overflow occurred. Calendar fixtures used the dashboard's existing responsive container behavior; review routes were removed afterward.
- Logo sources, shared storage and provider scope are documented in `docs/insurance-logo-sources.md`. 28 assets total 109,160 bytes.
- Local production homepage Lighthouse: performance 98 / SEO 100. These are simulated local measurements. Public titles/descriptions/canonicals and structured data, plus demo/protected-page indexing rules, are checked against rendered production output. Sitemap and robots sources remain untouched.
- Browser automation is not physical iOS/Android verification. Hosted authenticated saving requires the migration and the checks in step 5.

Screenshots: `artifacts/insurance-calendar-desktop.png`, `artifacts/insurance-calendar-mobile.png`, `artifacts/insurance-provider-catalog.png`.
