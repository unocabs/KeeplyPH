# Item-specific purchase icons: setup and validation

## Behavior

31 custom native SVG icons cover electronics, appliances and clothing. TV is supported in both electronics and appliances. The receipt form offers an accessible, keyboard-operable item-type picker. Automatic mode uses whole-name phrases, prefers overlapping specific phrases (polo shirt, microwave oven), and keeps competing distinct objects neutral. Explicit choices persist when renamed; Category icon explicitly disables suggestions. Unsupported types clear when the category changes. Existing items remain automatic without modifying their stored names or assigning guessed database values.

The same selection is displayed by purchase cards, purchase details, reminder cards, date rows, details and calendar markers. Standalone assets are under `public/product-icons`; themed inline geometry is in `src/components/icons/product-glyph.tsx`. All artwork is drawn locally with a shared 24px viewBox, rounded strokes and subdued shading; no external fonts, images, filters or masks are required. Existing calendar layout and alert/date icons remain unchanged.

## Hosted database steps — before deployment

Hosted schema state has not been confirmed. Migration testing ran only in isolated temporary local PostgreSQL, not hosted Supabase.

1. In the existing Supabase project's SQL Editor, run the complete `supabase/check-product-type-prerequisites.sql`. It is read-only and returns 30 migration markers in execution order.
2. Compare MISSING rows with the project's migration history. Apply only confirmed missing prerequisite migrations in returned sequence order 1–29. The check includes core/items/slots, subscription brands, due-date alerts, timeline, lenders, insurers, utilities and AI subscriptions. Resolve earlier dependencies before later ones. Do not rerun PRESENT migrations.
3. Once rows 1–29 are PRESENT, run the complete `supabase/migrations/202610070029_purchase_product_types.sql` only if row 30 is MISSING. It adds the optional item-type column, category eligibility constraint, compatibility-view field and atomic save behavior with existing ownership, optimistic revision and warranty/date protections.
4. Rerun the read-only check. Every row must be PRESENT before deploying the application.
5. After deployment verify authenticated create/save/reopen, explicit/automatic/category selection, rename, category changes, error recovery and cancellation. Hosted Supabase authenticated browser saves and physical iOS/Android devices were not verified locally.

## Local checks

Run from the repository root:

```sh
npm test
npm run lint
npm run typecheck
npm run test:db
npm run build
```

The modified `scripts/test-database.mjs` includes the new `tests/database/product-types.mjs` test module. `npm run test:db` starts and removes an isolated local PostgreSQL instance and does not connect to hosted Supabase.

- 233 unit tests passed, covering suggestions, ambiguity, explicit/automatic/category mode, category scope, all 31 SVG identities, consistent card/row/calendar output, RPC validation and recoverable errors.
- 137 local database integration tests passed. New cases save every supported type/category combination, preserve old-client omission and explicit choices, clear unsupported categories, verify view/item/dashboard/timeline reads, and exercise ownership, revisions, permissions and atomic warranty rollback. All 30 prerequisite markers are PRESENT in that local database.
- Chrome and Playwright WebKit at 1280 and 390px passed name suggestions, explicit selection, neutral selection, compatible/incompatible category changes, radio keyboard interaction, missing-name validation, demo save, saved-edit rename/cancel, actual demo headphones/fan icons and receipt detail identity.
- All 31 SVGs rendered in the browser catalog and standalone assets parsed successfully. Calendar dialogs passed without horizontal overflow or page errors. The screenshot fixture was removed before the production build.

Screenshots: `artifacts/product-icons-catalog.png`, `artifacts/product-icons-calendar-desktop.png`, `artifacts/product-icons-calendar-mobile.png`.

Lint, typecheck and production build passed. Production Chrome and WebKit verified the real demo headphones/fan icons and TV suggestion, explicit selection and reuse across electronics/appliances. Public-page titles, descriptions, canonicals, sitemap and robots sources are preserved. Rendered homepage WebSite/WebApplication JSON-LD required fields are valid; demo and protected-page login output retains noindex/nofollow. Local homepage Lighthouse: performance 96, SEO 100. These are local simulated checks, not hosted or physical-device verification.
