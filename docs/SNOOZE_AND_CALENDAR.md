# Snooze

Snooze is free. It uses the reminder's existing coverage, selected channels, and 9 AM in the account timezone. The due date, recurrence anchor/end, completion status, and offsets stay unchanged. Snooze applies only to the current open occurrence; recurrence can supersede it automatically. Cancellation restores future normal timings without backfilling past alerts. Disabling a channel cancels the pending snooze; changing timezone keeps the chosen local date and reschedules unattempted jobs as the existing scheduler does. A timezone change that puts delivery in the past does not backfill it.

Add to Calendar and its ICS endpoint were removed because file download/import workflows do not meet Keeply's premium, hassle-free requirement. Demo buttons never call real actions.

## Before deployment

No hosted migrations or deployment were performed for this change. Migration 014 and its preceding prerequisites were confirmed by the user. Migration 015's hosted status remains unknown.

In https://supabase.com/dashboard/project/crekfqhurszleekaupnc/sql/new:

1. Paste and run `supabase/check-snooze-prerequisites.sql`. It only reads schema markers. If 014 reports MISSING, stop and reconcile that result with the previously confirmed setup; do not rerun confirmed migrations.
2. If 015 reports MISSING, run the complete `supabase/migrations/202610020015_reminder_ideas.sql` from the current workspace first. Skip it if PRESENT. The current app's reminder-ideas code depends on it, although snooze scheduling itself does not.
3. If 016 reports MISSING, run the complete `supabase/migrations/202610020016_occurrence_snooze.sql`. It adds occurrence metadata, an authenticated revision-checked snooze action, eligibility checks, and scheduling through the existing notification queues. Skip it if PRESENT.
4. Rerun the read-only check and confirm all three markers are PRESENT before deploying.

The check and migration 016 were executed only against an isolated local PostgreSQL test database. That does not establish their status in Supabase.

## Verification

From the repository root:

```sh
npm run lint
npm run typecheck
npm test
npm run test:db
```

The modified `scripts/test-database.mjs` automatically loads `tests/database/snooze.mjs`; do not run the module directly. The harness starts and removes its own isolated PostgreSQL database and never connects to the hosted project. It defaults to `/opt/homebrew/opt/postgresql@14/bin`; set `PG_TEST_BIN` to another PostgreSQL binary directory if needed. These commands have been run locally.

Coverage includes ownership/revisions, local 9 AM, overdue sends, replacement/cancellation, regular alert suppression at equal times, later alerts, completion/edit/archive/coverage/opt-out invalidation, recurrence advancement, and uncertain delivery leases. Browser checks use sample data; no real provider delivery was performed.
