# Coming Up dashboard hero

The signed-in hero shows five actual reminders initially on all screen sizes, with a temporary expansion to at most ten, each represented by its nearest open due date within the account-local inclusive today–30-day window. Existing onboarding, the fallback hero, the demo, public pages, and the detailed Upcoming section remain. Archived/draft reminders are excluded; disabling alerts does not hide a saved deadline.

The database preview reads eligible pending/retry/sending email and push jobs using the delivery workers' eligibility helpers. Accepted, failed, cancelled, stale occurrences and unavailable push subscriptions are excluded. SMS is postponed and is not shown. Dates are converted using the account timezone; channels and multiple devices on the same day are grouped. No timeline dates are derived from configured offsets. Recurring reminders show their current open occurrence; future cycles are not invented. Account-local calendar day differences position markers without DST-sensitive local timestamp subtraction.

Due icons open a native dialog, styled as a mobile bottom sheet, with category, date purpose, due date, countdown, alert state, scheduled dates/channels and a link to the existing reminder detail. Escape, close and backdrop dismissal restore focus. Nearby alert dots share one touch target with a tooltip listing every scheduled day; dots retain their exact proportional date positions. Alert dots share the horizontal track; lowered due icons meet same-day dots without connector stems. Alert tooltips appear on hover, focus or tap and do not navigate.

## Before deployment

Hosted schema state has not been verified. In the existing project's Supabase SQL Editor, first run the full contents of `supabase/check-dashboard-timeline-prerequisites.sql`. This is read-only. Review migration history against any missing schema markers; do not rerun confirmed successful migrations. Apply only missing migrations from `supabase/migrations` in this exact dependency order:

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
19. `202610040018_reminder_activity_views.sql`
20. `202610040019_car_brands.sql`
21. `202610050020_dashboard_timeline.sql`

Migration 020 adds the authenticated, owner-scoped dashboard queue preview and leaves alert scheduling unchanged. Apply it before deploying the application, which calls `dashboard_timeline_items`. It was applied only in an isolated local PostgreSQL test database; it has not been applied to hosted Supabase.

## Local verification

Run `npm run test:db` to execute the modified `scripts/test-database.mjs`. It creates an isolated temporary PostgreSQL database, applies migrations and tests queue dates/channels, device deduplication, accepted/disabled alerts, ownership, anonymous access and six distinct nearest reminder selection. It never writes to hosted Supabase.

Run `npm run test`, `npm run typecheck`, `npm run lint` and `npm run build` for the application checks. `tests/unit/timeline.test.ts` covers fallback, row limits, today/day 30, month/year boundaries, current recurrence, disabled/paused coverage and zero/one/multiple queue alerts.

Browser acceptance uses a temporary local fixture page that is removed after testing. Hosted account data, real provider delivery and physical mobile devices still require staging verification after the prerequisite check, migration and deployment. Check saved reminders with email/push enabled, then disable coverage and delivery, reload, and verify that only eligible pending schedule dates appear. Open and dismiss details, use View reminder, and check keyboard/touch at narrow and wide sizes. Local browser and database tests do not establish hosted integration or real-device behavior.

### Results recorded during implementation

Typecheck, lint, production build, 168 unit tests and 100 isolated database tests passed locally. Chrome and Playwright WebKit passed at 320, 390, 768 and 1440 pixels: empty/one/multiple reminders, row limits, no page overflow, each visible due icon, detail links, close/Escape/backdrop dismissal, focus restoration, grouped alert tap/focus, tooltip bounds and Add Reminder cancellation. Screenshots were visually inspected. These used local fixtures; actual signed-in detail navigation and provider delivery were not exercised.

Production-rendered homepage and loan/vehicle landing pages retained titles, descriptions and canonical URLs; homepage JSON-LD parsed successfully. Demo remained noindex/nofollow, private dashboard anonymous access redirected to login, and the private layout's noindex/nofollow metadata and sitemap sources were unchanged. Public route implementations were not edited; Lighthouse was not required for this private-dashboard change.

### Reference layout revision

The hero follows the supplied compact calendar reference: a white inset calendar, shared weekly guides and a continuous Today marker, category-colored tracks, and primary due icons positioned at their real dates. Desktop names stay in the label column; narrow layouts omit row names and show four clickable due icons, with full names in accessible labels and details. Add Reminder sits beneath the calendar on narrow layouts. No category grouping or duplicate left-hand icons were introduced.

The development-only `/timeline-review` fixture is retained for local review and returns 404 in production. It uses existing sample reminders and configured demo offsets; View reminder opens the existing demo detail. Query states `empty`, `one`, `today`, `edge` and `off` allow inspection of fallback, sparse, boundary and disabled-alert states. It is a local preview, not hosted account or real provider verification.

After this revision, local Chrome and WebKit checks at 320, 390, 768 and 1440 pixels passed for due icons, alert focus/tap, tooltip bounds, dialog close/Escape and focus restoration, sample detail navigation, Add Reminder cancellation, no horizontal overflow and the original fallback. Source changes remain restricted to the private timeline and development preview; public routes and indexing rules remain unchanged.

One-reminder, due-today, same-day alert, exactly day 30 and disabled coverage fixtures also passed Chrome/WebKit checks at 320 and 1440 pixels. The alert's decorative stem ignores pointer events so it cannot intercept clicking the due icon. The final production build passed; the local preview returned 404 in production, public pages retained rendered metadata/canonicals and valid JSON-LD, and the demo retained noindex/nofollow. Hosted migration and physical-device verification remain outstanding.
