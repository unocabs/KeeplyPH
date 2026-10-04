# Car brand identity

Car and car-loan reminders have an optional searchable brand selector. The brand is saved as `items.car_brand`, separate from the reminder name, and used on dashboard rows, cards, lists, details and edit previews. Dates added to an existing car inherit the item’s identity. “Other / not listed”, no selection, unknown identifiers and failed image loads use the existing generic glyph. Existing items are not inferred from their names.

## Deployment order — existing Supabase project

Hosted migration state has not been verified. Before deploying the application:

1. In the project’s **Supabase SQL Editor**, paste and run the entire contents of `supabase/check-car-brand-prerequisites.sql`. This is read-only. Its results identify schema markers; also compare your migration history if the project has been manually modified.
2. Skip every migration already confirmed as applied. For any missing prerequisite, apply its entire SQL file once, in the exact order below. The final entry is the new car-brand migration. Do not apply only the newest file if earlier prerequisites are missing.
3. Run the read-only check again. Confirm all markers are PRESENT, including the brand column and new save signature.
4. Deploy the application and perform the signed-in checks below against that project.

1. `supabase/migrations/202609200001_core.sql`
2. `supabase/migrations/202609200002_documents.sql`
3. `supabase/migrations/202609200003_notifications.sql`
4. `supabase/migrations/202609200004_billing_maintenance.sql`
5. `supabase/migrations/202609230005_items.sql`
6. `supabase/migrations/202609230006_analytics.sql`
7. `supabase/migrations/202609240007_reminder_slots.sql`
8. `supabase/migrations/202609240008_reminder_pack_billing.sql`
9. `supabase/migrations/202609240009_history_measurement.sql`
10. `supabase/migrations/202609260010_feedback.sql`
11. `supabase/migrations/202609280011_recurring_dates.sql`
12. `supabase/migrations/202610010011_variable_slot_packs.sql`
13. `supabase/migrations/202610010012_reminder_categories.sql`
14. `supabase/migrations/202610010013_sms_alerts.sql`
15. `supabase/migrations/202610020014_web_push.sql`
16. `supabase/migrations/202610020015_reminder_ideas.sql`
17. `supabase/migrations/202610020016_occurrence_snooze.sql`
18. `supabase/migrations/202610040017_install_reward.sql`
19. `supabase/migrations/202610040018_reminder_activity_views.sql`
20. `supabase/migrations/202610040019_car_brands.sql`

Migration 019 adds the optional brand field and an owner-scoped, atomic save wrapper. It preserves the existing date/preset save transaction, revision protection and older clients’ omitted-brand behavior. List/detail/dashboard serializers already include item fields. The form and vehicle query require this migration before deployment.

The existing read-only checks for web push, reminder ideas and installation rewards now recognize both the old and new save signatures. These are compatibility fixes; there is no need to rerun their underlying feature migrations.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:db` and `npm run build` from the repository root. The modified `scripts/test-database.mjs` applies migrations to a temporary local PostgreSQL instance and verifies create/read/change/clear, date inheritance, car loans, legacy payments, older clients, ownership, invalid identifiers, revision conflicts and rollback. It never applies migrations to hosted Supabase. All five commands passed locally during implementation (162 unit tests and 97 database tests).

The local production preview was exercised in Chrome and Playwright WebKit at 1280px and 390px widths: search, selection, immediate logo preview, keyboard selection, Escape, empty search, clearing, missing-image fallback, demo submission, restoring an edit, cancellation and adding dates to an existing car. WebKit's local HTTP test response had only `upgrade-insecure-requests` removed to allow loading the preview's assets without a local TLS server; the application security headers were not changed. This is browser emulation, not a physical iOS/Android test. Signed-in hosted Supabase saving has not been tested or applied.

Rendered titles, descriptions, canonicals, robots and structured data for the homepage, loan-payment landing page and vehicle-registration landing page matched the pre-change preview. The demo remained noindex; public sitemap and private indexing source files were unchanged. No public content change was made.

Signed-in staging acceptance after migration/deployment:

- Create Kia Stonic with Kia selected and a monthly-payment date; reload and verify Kia on Upcoming, reminder cards, lists and detail.
- Edit to another brand, cancel an edit, then clear and save; verify the previous selection survives cancellation and the generic icon returns after clearing.
- Add a registration/service/insurance date to an existing branded car; verify the brand is retained across those activity views.
- Verify an existing unbranded reminder remains usable, including old-client saves.
- Simulate a failed save and a missing image; confirm fields remain editable and the image falls back to the generic glyph.
- Check desktop Chrome, Safari and Firefox, plus physical iOS Safari and Android Chrome. Browser emulation does not establish real-device behavior.

## Assets

69 transparent WebP files are served locally from `public/car-brands`, with a 128px canvas and preserved source colors/proportions. Every selectable image was checked for visible artwork and transparency. Updated Chery, Changan, Mahindra, GWM, MINI, Volvo, Fiat and GAC assets replace collected older variants. `docs/car-brands/sources.json` records the download URLs and the collection license notices are retained alongside it. Logos remain trademarks of their owners; this set is for identifying the user’s selected car brand, with mixed emblem/wordmark formats.

Public page content, metadata, structured data and sitemap definitions were not edited. The private app and demo retain noindex rules; the generic icons on public pages receive no brand and retain their existing output.
