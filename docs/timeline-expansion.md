# Expandable dashboard timeline

The calendar initially shows up to five distinct reminders on mobile and desktop. Show more reports the actual number of additional rows available (one through five), expands in place to at most ten, and becomes Show less. React component state keeps this temporary: reloading or leaving and returning starts collapsed. View all upcoming remains available when more than five reminders qualify and opens the existing complete list. No persistent preference or extra network request is introduced.

Rows use a 64px minimum height, while due icon buttons retain their 44px size and the existing icon-to-dot alignment. Long desktop labels can increase a row's height. Weekly guides follow the rows only, so they end before the controls in both states. The expansion button exposes aria-expanded and aria-controls, supports keyboard activation, and retains focus on collapse.

## Deployment order

Hosted schema state has not been verified. Before deploying, open Supabase SQL Editor for the existing project and run the complete contents of `supabase/check-timeline-expansion-prerequisites.sql`. It is read-only and returns the checks below in order. Review the migration history as well: markers do not establish every schema detail. Do not rerun migrations already confirmed successful. Apply only missing prerequisite migrations in this exact order, followed by the new expansion migration if missing:

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
22. `202610050021_motorcycle_brands.sql`
23. `202610050022_subscription_brands.sql`
24. `202610050023_due_date_alerts.sql`
25. `202610060024_expand_dashboard_timeline.sql`

Run each required migration's full contents in Supabase SQL Editor, in the order above. Then rerun the read-only check and confirm every row is PRESENT before deploying. Migration 024 replaces the existing owner-scoped dashboard function, increasing its guaranteed nearest distinct reminder selection from six to eleven: ten visible rows plus an overflow sentinel. Its queue eligibility, permissions, and existing dashboard selection stay intact.

## Local verification

`npm run test:db` runs the modified `scripts/test-database.mjs` in an isolated temporary PostgreSQL database. It checks the new prerequisite query before and after migration 024, eleven earliest distinct reminders despite multiple dates and newer unrelated items, existing queue eligibility, and ownership. This command never applies migrations to hosted Supabase.

The migration and check have been run only in that isolated local database. Local browser checks use temporary fixtures; they do not verify hosted account data or physical devices.

Chrome and Playwright WebKit passed at 320, 390, 768, and 1440 pixels with 1/5/6/10/12 reminders, clustered dates, today/day-30 boundaries, expand/collapse/reload, keyboard activation and focus, added-row reminder dialogs, alert clicks and tooltip bounds, larger text, and no horizontal overflow or browser errors. Screenshots were inspected. Eight timeline unit tests and 115 isolated database integration tests passed. Public rendered metadata/JSON-LD, demo noindex, and the signed-out dashboard guard were checked; public route and indexing sources remain unchanged.
