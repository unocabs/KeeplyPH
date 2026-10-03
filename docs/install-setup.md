# Device setup guide and permanent slot reward

Keeply’s private dashboard places a setup card immediately after the welcome/overview section, before category filters and statistics. Alert Options also provides the guide and a direct notification/reward control. The modal always asks which device the user wants help with before showing instructions. It never opens itself or automatically requests notification permission. Dismissing the dashboard card makes it a small return link for that browser session; after claiming, it becomes a link to set up another device.

The guide has Back/Next controls, progress, an already-installed shortcut, full-size screenshot links, native dialog keyboard/focus behavior, iPhone images, and text-only Android/computer instructions. Installation and notification permission must be completed on the target device. A guide viewed on another device does not control that target device remotely.

## Reward rules

- Two permanent extra alert slots, once per signed-in account. Existing installed users with connected push devices are eligible.
- Claim requires installed app display mode, notification permission, a local subscription, and the database’s independently verified owned registration with account push enabled.
- Installation is a client signal, not tamper-proof browser attestation. Cross-browser APIs cannot prove installation server-side. The database strictly enforces owner scope and one reward per account using a unique user key and the existing profile lock.
- The reward is independent of billing mode and paid packs. It survives notification opt-out, device removal, expiry and refunds. It adds two slots to the existing allowance; purchased permanent pack counts remain purchase-only.
- Extra capacity resumes previously selected paused reminders through the existing coverage/scheduler logic. It does not turn on coverage for reminders the user never selected. File storage is unaffected.
- Account deletion removes the claim along with the account. The limit is per account, not per person.
- Actual delivery can still be blocked or silenced by OS/browser settings. A registered subscription is not proof a person saw a notification. The existing Send test notification control remains available.

## Before deploying: exact execution order

Hosted schema state has not been inspected or changed. Local tests do not apply migrations to Supabase.

1. In the existing Supabase project’s SQL Editor, run the **complete contents** of `supabase/check-install-reward-prerequisites.sql`. This is read-only. Review migration history as well; schema markers are not proof every statement succeeded. Resolve partial/inconsistent migrations first.
2. Back up the database and pause notification/maintenance workers. Apply **only missing migrations**, in this exact order, skipping every migration already confirmed successful:

   1. `202609200001_core.sql`
   2. `202609200002_documents.sql`
   3. `202609200003_notifications.sql`
   4. `202609200004_billing_maintenance.sql`
   5. `202609230005_items.sql`
   6. `202609230006_analytics.sql`
   7. `202609240007_reminder_slots.sql`
   8. `202609240008_reminder_pack_billing.sql`
   9. `202609240009_history_measurement.sql`
   10. `202609260010_feedback.sql`
   11. `202609280011_recurring_dates.sql`
   12. `202610010011_variable_slot_packs.sql`
   13. `202610010012_reminder_categories.sql`
   14. `202610010013_sms_alerts.sql`
   15. `202610020014_web_push.sql`
   16. `202610020015_reminder_ideas.sql`
   17. `202610020016_occurrence_snooze.sql`
   18. `202610040017_install_reward.sql`

   All files are under `supabase/migrations/`. Run each required file’s complete contents in SQL Editor. Earlier cutover/recurrence requirements still apply; consult README and the corresponding deployment docs. Do not rerun successful migrations. Keep the private schema outside the exposed Data API schemas.
3. Follow `docs/web-push.md` for VAPID keys, HTTPS origin, push delivery activation and staging device checks if push deployment has not already been completed. The claim action stays unavailable while server push configuration is unavailable.
4. Deploy matching application code, resume workers, then verify on real iPhone/iPad, Android Chrome and desktop installed browsers. Existing registrations qualify without reconnecting. Claim on one device, reopen on another, and confirm no additional reward. Verify two slots remain after notification opt-out and after temporary pack expiry.

The new migration adds the private claim ledger, owner-scoped claim RPC, additive slot calculation, and usage fields. It was applied only in the isolated local PostgreSQL test harness. It has **not** been applied to hosted Supabase.

## Local verification

From the repository directory:

```sh
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
```

The modified `scripts/test-database.mjs` runs with **`npm run test:db`**. It creates and deletes an isolated local PostgreSQL instance; it does not use hosted Supabase. New checks exercise ownership, missing prerequisites, concurrent claims across devices, reconnects, opt-out, coverage restoration, temporary expiry, permanent pack refunds and deletion. The prerequisite SQL is also checked against the locally migrated schema. It was run locally during implementation; no additional harness run is required for deployment.

Private app routes retain inherited `noindex,nofollow` metadata. Public page content, titles, canonical URLs, structured data and sitemap files are unchanged. Real device permission dialogs and live push delivery still require staging verification.

Completed locally: production build and TypeScript check, ESLint, 148 unit tests and 91 PostgreSQL integration tests. Chromium browser checks at 390px and 1280px verified explicit device choice, all five iPhone images, Android text, computer instructions, premature-claim disabling, reopening after session dismissal, Escape dismissal and absence of client errors. The temporary preview route used for browser checks was removed before the production build. Rendered production homepage/pricing checks verified canonical URLs, descriptions, indexing and parseable homepage JSON-LD; public pricing retains its three-slot baseline. Robots and sitemap output contain no new private routes. Lighthouse was not run because public page output is unchanged. Native installation, permission prompts and actual push delivery were not tested on physical devices.

## Screenshot assets and editing prompts

Only the edited WebP copies are included under `public/guides/install/`; originals containing personal information are not copied into the project. The five reference captures were supplied by the user. The built-in imagegen tool was used to blur personal content and add red circles; its output was visually checked for the relevant controls, then encoded as WebP without source metadata.

Each image used this common prompt prefix/suffix:

> Use case: precise-object-edit. Asset type: annotated installation guide screenshot. Edit target: the supplied screenshot. This is a faithful screenshot annotation, not a redesigned UI. [Image-specific instruction below] Preserve original layout, aspect ratio, all relevant button icons and all relevant text pixel-faithfully. Do not invent UI, add labels, change buttons, or draw arrows. Use very strong privacy blur where specified. Output only the edited screenshot.

Image-specific instructions:

- **ios-share.webp**, from IMG_0244.jpg: “Add one thin bright red circle around ONLY the share button (square with upward arrow) at the top right of the browser address bar. Strongly blur the entire dashboard content below the Keeply logo/header, including name, counts and reminder details; keep the address bar and header sharp.”
- **ios-view-more.webp**, from IMG_0245.jpg: “Add one thin bright red circle around the View More down-chevron button at the lower right of the share sheet. Strongly blur the ENTIRE suggested contacts row including photos, names, device name, group info, between the title area and app icons. Strongly blur all dashboard content behind/below the share sheet. Keep View More and other standard system menu labels and icons sharp.”
- **ios-home-screen.webp**, from IMG_0246.jpg: “Add one thin bright red ellipse around the entire Add to Home Screen menu row including its plus icon. Strongly blur any background app content outside the standard menu. Keep menu geometry, labels and icons exactly as supplied.”
- **ios-confirm.webp**, from IMG_0247.PNG: “Add one thin bright red circle around the blue Add button at the upper right and one around the green Open as Web App toggle. Blur the status bar and keyboard suggestions. Keep all other system labels and icons exactly as supplied.”
- **ios-launch.webp**, from IMG_0248.jpg: “Add one thin bright red circle around the Keeply PH app icon and its label at upper left. Strongly blur ALL wallpaper and all other home screen content, except the Keeply app icon and Keeply PH label. No wallpaper details or wallpaper text should remain recognizable.”

No notification permission screenshot was supplied. That step uses text and Keeply’s real notification controls. Browser chrome/menu layouts vary; the guide explicitly notes this and does not claim the reference captures match every iOS/browser version.
