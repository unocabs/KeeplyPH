# Premium email rollout

Implemented locally on 2 October 2026. The shared design covers reminder and slot-renewal emails. Reminder ideas cover all existing categories, rotate examples, prioritize missing categories, and include the all-kinds message and category/custom links in HTML and plain text.

## Deployment order

1. In the target Supabase project's SQL Editor, run **`supabase/check-reminder-ideas-prerequisites.sql`**. This is read-only. It reports sixteen schema markers in their required application order, including two migrations numbered 011. Review migration history/backups alongside the markers; do not rerun a migration marked PRESENT or already confirmed successfully applied.
2. Apply **only missing prerequisites**, in the check's sequence, before the new email migration. The complete sequence is:

   ```text
   202609200001_core.sql
   202609200002_documents.sql
   202609200003_notifications.sql
   202609200004_billing_maintenance.sql
   202609230005_items.sql
   202609230006_analytics.sql
   202609240007_reminder_slots.sql
   202609240008_reminder_pack_billing.sql
   202609240009_history_measurement.sql
   202609260010_feedback.sql
   202609280011_recurring_dates.sql
   202610010011_variable_slot_packs.sql
   202610010012_reminder_categories.sql
   202610010013_sms_alerts.sql
   202610020014_web_push.sql
   202610020015_reminder_ideas.sql
   ```

   Each file is under `supabase/migrations/`. If the earlier item cutover (005) is missing, follow its instruction to pause notification cron and deploy matching code during the cutover. Applying SMS or push schema does not require enabling those channels. Later migrations for other features are outside this email prerequisite sequence. If deploying the concurrent snooze/calendar changes in this workspace too, also follow [their migration 016 instructions](SNOOZE_AND_CALENDAR.md) before deploying that code.
3. Run **`supabase/migrations/202610020015_reminder_ideas.sql`**, if missing, in the SQL Editor **before deploying this application change**. It adds independent suggestion consent, enrollment, a durable campaign queue, an allowance capped at ten suggestion attempts per UTC day, worker functions, and delivery-event handling. Every existing account starts opted out. Then rerun the read-only check and confirm every required marker is PRESENT.
4. Deploy the application with **`REMINDER_IDEAS_ENABLED=false`**. The redesigned deadline and renewal emails use the existing email configuration. Alert Options now uses the new atomic preferences function, so the migration must precede the code deployment even while ideas are disabled.
5. Set a dedicated **`EMAIL_UNSUBSCRIBE_SECRET`** of at least 32 characters in the hosting environment. Generate it with `openssl rand -hex 32`. Keep it stable: changing it invalidates previously sent unsubscribe links. Set the canonical HTTPS `APP_URL`, verified `EMAIL_FROM`, `RESEND_API_KEY`, and `RESEND_WEBHOOK_SECRET`. Choose `Keeply PH` as the sender display name and retain the verified sending address. Check the actual Resend account allowance before enabling campaigns; the application's current shared cap is 90 attempts per UTC day.
6. Verify the existing `keeply-reminders` Supabase Cron job successfully calls `POST /api/cron/notifications` every fifteen minutes using the configured Bearer secret. This implementation reuses that job; no second scheduler is needed. Inspect the cron dashboard and recent HTTP responses. Configure Resend's delivered, bounced, and complained events to `/api/webhooks/resend`.
7. In staging, or with controlled production test accounts, opt in through **Alert Options → Reminder ideas & tips**. Verify Gmail, Apple Mail, and Outlook rendering, light/dark appearance, and blocked images. Confirm normal reminder actions still require authentication and do not mutate records just by opening a link. Check both the unsubscribe confirmation page and one-click POST, then confirm suggestion opt-out preserves deadline alerts. The preview unsubscribe token is intentionally invalid and never changes an account.
8. Once these checks pass, set **`EMAIL_DELIVERY_ENABLED=true`** and **`REMINDER_IDEAS_ENABLED=true`** in the intended environment. Only explicitly opted-in users become eligible. Begin with controlled accounts before inviting a larger cohort to opt in. Turning `REMINDER_IDEAS_ENABLED` off stops future campaign processing while existing deadline delivery continues.

The read-only hosted REST check during implementation confirmed required profile, recurrence, and category columns. Full migration history, private queue contents, cron health, and the screenshot's original provider record could not be inspected through that check. The local `.env.local` has email delivery disabled and no Resend API key, so no live email was sent. Migration 015 and the prerequisite SQL were run only in the isolated local PostgreSQL test cluster; they have **not** been applied to the hosted Supabase project by this task.

## Behavior and limits

- Enrollment begins at explicit opt-in, with the first suggestion after two days. Target cadence is weekly through day 30, then every fourteen days. Actual delivery is between 10 AM and noon in the account's timezone, subject to activity and quota checks.
- Suggestions wait after a recently created reminder or transactional message. They yield to a due transactional backlog and can use at most ten of the shared ninety daily reservations; retries also use allowance. The existing fifteen-minute scheduler and one campaign per run bound throughput further.
- Missed onboarding steps are skipped. A run creates at most one current job per eligible account. Jobs expire after 23 hours, and uncertain delivery is never replayed past the provider's 24-hour idempotency window. Template content and unsubscribe headers stay frozen under the same retry key.
- Re-enrollment gets a new identity, preserves the recent-send cooldown, and does not let an old unsubscribe link disable the new enrollment.
- Preparation rechecks consent, email confirmation/address, suppression, deletion, local time, recent activity, frequency, and theme selection. Already submitted provider requests may finish after opt-out; their outcome is recorded without re-enabling consent.
- Contacts' existing email-delivery suppression applies to suggestions too. Early provider webhooks are persisted and reconciled when acknowledgment arrives. Provider outcomes are available in `private.reminder_idea_jobs` for operational reporting.
- Click and reminder-creation attribution are not enabled in this release. Establish that reporting separately before comparing campaign conversion; delivered events are available now. Do not treat opens as proof of usefulness.
- Auth messages configured in Supabase and payment receipts sent by PayMongo do not use the application's renderer. Their branding must be reviewed in those providers' configuration separately. They were not changed by this task.

## Local verification and previews

The extended isolated-database harness, **`scripts/test-database.mjs`**, tests campaign consent, worker permissions, concurrency, payload freezing, early webhooks, activity deferral, local sending windows, capacity reservation, unsubscribe, and suppression. Run:

```sh
npm run test:db
```

It creates and destroys its own local cluster and never connects to hosted Supabase. To validate only the schema through this email migration while later feature migrations are being edited:

```sh
PG_TEST_MIGRATION_THROUGH=202610020015_reminder_ideas.sql npm run test:db
```

Verified locally: 149 unit tests and 85 database integration tests passed, along with typechecking, lint, and a production build. Browser previews fit desktop and 375px phone widths, including a long name and blocked images. Actual inbox tests remain pending.

The new upper-bound option only filters migrations in this isolated harness; it is not a hosted migration command. Unit tests and a production build cover the renderer, signed unsubscribe endpoint, worker, and route integration:

```sh
npm test
npm run lint
npm run build
```

Regenerate HTML/plain-text fixtures with:

```sh
EMAIL_PREVIEW_DIR=docs/email-previews npm test -- tests/unit/emails.test.ts
```

Open `docs/email-previews/warranty.html`, `payment.html`, `renewal.html`, and `idea-loans.html` to inspect representative messages. The directory also contains all other category previews and desktop/mobile screenshots. Browser checks are supplementary; they do not certify inbox rendering.
