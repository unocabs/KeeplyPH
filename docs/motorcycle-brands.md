# Motorcycle brand identity

Motorcycle reminders and motorcycle loans have an optional searchable selector for 54 motorcycle, scooter and electric two-wheeler brands. Selection is stored separately from the reminder name as `items.motorcycle_brand`. Cards, date rows, Upcoming, details and edit previews use the selected logo. Dates added to an existing motorcycle inherit its identity. Honda uses the motorcycle wing rather than the car emblem. No selection, Other, an unknown identifier or a failed image load uses the existing motorcycle glyph. Existing names are not guessed or backfilled.

## Required hosted setup before deployment

A read-only REST check found `items.car_brand` present and `items.motorcycle_brand` missing in the configured hosted project. This does not establish the state of all earlier migrations. No hosted migration was applied.

1. In the target **Supabase SQL Editor**, run the entire contents of [check-motorcycle-brand-prerequisites.sql](../supabase/check-motorcycle-brand-prerequisites.sql). This is read-only and lists every migration filename in its exact execution order through 021.
2. Compare MISSING entries against the project's migration history. Apply only missing files in the check's numbered order: the original core migrations first, then the car-brand migration `202610040019_car_brands.sql`, dashboard timeline `202610050020_dashboard_timeline.sql`, and finally [202610050021_motorcycle_brands.sql](../supabase/migrations/202610050021_motorcycle_brands.sql). Skip everything already confirmed applied. Do not run only 021 if an earlier prerequisite is missing.
3. Rerun the read-only check; every marker must be PRESENT before deploying.
4. This checkout also contains the separately developed subscription-brand feature and migration 022. To deploy the entire checkout, run [check-subscription-brand-prerequisites.sql](../supabase/check-subscription-brand-prerequisites.sql), which lists the full sequence through 022. After confirming 021 and every earlier prerequisite, apply 022 only if missing, as described in [subscription setup](subscription-brand-setup.md).
5. After deploying, verify signed-in create, change, clear, cancel, reload and adding dates to an existing branded motorcycle against the hosted project. Physical iOS Safari and Android Chrome still require acceptance checks.

Migration 021 adds the constrained brand field and authenticated, owner-scoped `save_motorcycle_item_with_date` RPC. It preserves the atomic date save, revision checks and omitted-brand compatibility, and clears incompatible vehicle brands when loan categories change. It has been applied to isolated local PostgreSQL during automated tests; it has not been applied to hosted Supabase.

## Assets and provenance

`public/motorcycle-brands` contains 54 transparent 128px lossless WebP files served locally, preserving source artwork proportions and positive brand colors. The downloadable collection contains 512px transparent PNG exports; some source artwork has lower native resolution, so those exports do not imply vector-quality detail. `artifacts/motorcycle-brand-icons/sources.json` records the original URLs and preparation notes. The preview contact sheet shows all selectable logos.

Two panel-only raster sources (HATASU and Monarch) and Husqvarna's collected raster source required imagegen-assisted transparent cutouts, checked against the supplied artwork. Other sources are downloaded artwork or native SVG positive variants. Logos remain their owners' trademarks. This collection does not grant an open license or imply affiliation.

## Verification

Run from the repository root:

```sh
npm run test
npm run typecheck
npm run lint
npm run build
npm run test:db
```

The modified [scripts/test-database.mjs](../scripts/test-database.mjs) applies migrations to a temporary isolated local PostgreSQL instance and checks persistence across detail/list/dashboard/timeline reads, inherited dates, changes, clearing, category transitions, older clients, ownership, privilege restrictions, invalid brands, revision conflicts and atomic rollback. It never applies migrations to hosted Supabase. Local verification does not establish hosted saving or physical-device behavior.

Completed locally: 186 unit tests, 107 database integration tests, type check, lint and production build. Chrome and Playwright WebKit passed at 1280px and 390px widths: searchable selection, keyboard Enter/Escape, clear, empty-search Other, immediate preview, demo submission, cancel, restoring an existing edit, inherited identity when adding a date, loan category transitions and no horizontal overflow. Both engines passed a deliberately blocked logo request followed by successful selection of another logo. Tests used a local HTTPS proxy with a self-signed certificate accepted by the test contexts; application security headers were unchanged. Navigation checks waited for pending prefetch requests to settle before direct test navigation. WebKit emulation does not establish physical Safari/iOS behavior.

Rendered title, description, canonical and JSON-LD on the homepage, loan-payment landing page and LTO registration landing page matched the earlier local preview. The demo retained `noindex, nofollow`; public metadata, sitemap and indexing source files were unchanged.
