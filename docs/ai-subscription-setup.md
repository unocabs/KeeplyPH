# AI subscriptions: deployment and validation

## Hosted database steps — required before deployment

The hosted schema state is unknown. The migration has been applied only to an isolated temporary local PostgreSQL database, not hosted Supabase.

1. Run the complete `supabase/check-ai-subscription-prerequisites.sql` in the existing Supabase project's SQL Editor. It is read-only and returns 29 migration markers in execution order.
2. Compare MISSING prerequisite rows with the project's migration history. Apply only confirmed missing prerequisite files from `supabase/migrations`, in returned sequence order 1–28. This includes the subscription-brand, loan-lender, insurance-provider and utility-biller migrations, plus their earlier dependencies. Do not rerun PRESENT migrations.
3. After rows 1–28 are PRESENT, run the complete `supabase/migrations/202610070028_ai_subscriptions.sql` only if row 29 is MISSING. It expands the AI preset/service allowlists and existing atomic subscription save function, and places AI reminders in the subscriptions category.
4. Rerun the read-only check; all rows must be PRESENT before deploying the application.
5. After deployment verify authenticated create/save/reopen, rename, clear, Other AI service, category changes, cancellation and error recovery. Hosted authenticated flows and physical iOS/Android devices have not been verified locally.

## Local checks

Run from the repository root:

```sh
npm test
npm run lint
npm run typecheck
npm run test:db
npm run build
```

The modified `scripts/test-database.mjs` runs the new `tests/database/ai-subscriptions.mjs` module. `npm run test:db` creates and removes an isolated local PostgreSQL instance; it does not connect to hosted Supabase.

226 unit tests and 134 local database integration tests passed. Database cases cover all 14 services with recurring payment data, category filtering, read RPCs, rename, legacy-client omission, explicit clearing, Other, category cleanup, ownership, conflicts, privileges and atomic rollback. Logo sources are recorded in `docs/ai-subscription-logo-sources.md`.

Chrome and Playwright WebKit at 1280 and 390 px passed service search, keyboard selection, Escape, clearing, Other, monthly/annual scheduling, missing-date validation, demo save, saved-item rename/cancel, type cleanup and streaming regression. All 14 assets loaded; calendar dialogs, service captions and failed-image sparkles fallbacks passed without horizontal overflow or page errors. Screenshots use a temporary fixture, removed before the production build. These are automated browser checks, not physical-device verification.

Screenshots: `artifacts/ai-subscription-calendar-desktop.png`, `artifacts/ai-subscription-calendar-mobile.png`, `artifacts/ai-subscription-services.png`.

Lint, typecheck and the production build passed. Existing public metadata, robots and sitemap sources were preserved.

Production Chrome and WebKit checks passed the real AI add form, selected logo, monthly default and noindex/nofollow output. Homepage/loan-page titles and canonicals were preserved; homepage WebSite/WebApplication JSON-LD required fields were valid. Protected pages retained noindex/nofollow on their login output. Local homepage Lighthouse: performance 95, SEO 100. These are local simulated measurements, not hosted verification.
