# Web push deployment and device verification

Web push uses the browser's push service through the standard Web Push protocol. No Firebase account, paid messaging balance or Apple Developer membership is required. Hosting/database usage still applies. Email and push share each reminder's alert timings and coverage slot, but use separate delivery queues and account preferences. SMS remains disabled.

## Execution order before deployment

The hosted schema has not been inspected or modified by this work. Do not infer that a hosted migration was applied from local tests.

1. **Read-only prerequisite check:** in the existing Supabase project's SQL Editor, run the complete contents of `supabase/check-web-push-prerequisites.sql`. It lists schema markers for every migration in execution order. Review the project's migration history too; markers cannot prove all statements were applied. If state is partial or inconsistent, resolve it before running a migration.
2. Back up the database and pause notification/maintenance workers while applying schema changes and deploying matching code. Apply only missing earlier migrations, in this exact order (skip migrations already confirmed applied):
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

   All files are in `supabase/migrations/`. Migration 013 remains required for its scheduler functions and actionable email behavior even while SMS sending is disabled. It removes warranty recurrence; review those records before applying it. Earlier slot migrations have cutover checks described in README. Do not rerun already successful migrations.
3. When prerequisites are confirmed, run the complete contents of `supabase/migrations/202610020014_web_push.sql` **once**, in the SQL Editor, before deploying this version. It adds private device registrations, per-device jobs, owner-scoped setup functions, service-only workers and push-aware schedule previews. All accounts default to push off. Keep `private` outside the Supabase Data API's exposed schemas.
4. Generate a VAPID key pair once, from the repository directory:

   ```sh
   node --input-type=module -e "import webpush from 'web-push'; console.log(webpush.generateVAPIDKeys())"
   ```

   Save `publicKey` as `VAPID_PUBLIC_KEY`, `privateKey` as `VAPID_PRIVATE_KEY`, and a monitored contact such as `mailto:support@your-domain.com` as `VAPID_SUBJECT`. Keep the private key server-only; never put it in a `NEXT_PUBLIC_` variable, commit it, or paste it into chat. Reuse the pair. Rotating it requires users to reconnect devices.
5. Set `PUSH_DELIVERY_ENABLED=false` until schema and keys are ready. Set `APP_URL` to the deployment's exact HTTPS origin, deploy, then set `PUSH_DELIVERY_ENABLED=true` in a controlled staging environment and redeploy. Run the device checks below. Enable production only after they succeed. Resume the existing workers; `POST /api/cron/notifications` now processes push, email and SMS independently. No additional cron schedule is required if `supabase/schedule.sql` is already installed.

## Device checks

1. Sign in to your own staging account, open **Alert Options**, and click **Enable web push on this device**. The page never asks for permission automatically. HTTPS is required, except localhost development. On iPhone/iPad (iOS/iPadOS 16.4+), use Share → Add to Home Screen, open that icon, and enable push there. An unsupported browser shows guidance.
2. Click **Send test notification**. Test sends are limited to three per account per hour. The success message means the push service accepted the request; verify the actual notification on the device. Focus modes, permissions and device settings may silence or delay it. Click it and verify it opens Keeply's Alert Options.
3. Enable a covered reminder with a future timing around 9 AM in the account timezone. Let the existing scheduler send it. Confirm it arrives and opens the correct private reminder. Test with email off, then email and push both on. A reminder consumes one coverage slot even with several timings and devices.
4. Test **Turn off this device**, completion, archive, alert-coverage loss, permission denial/revocation and an expired registration. Turning off one device keeps other devices connected; removing the last turns account push off. Up to five devices can connect. Each browser registration is bound to one account; shared browsers must disconnect from the previous account first.
5. Test a repeating reminder, due-day alert, calendar-month offset, timezone change and an old email action link. Past alert times are not backfilled on opt-in. Recurrence never marks a payment done automatically.

## Scripts and local verification

- `public/sw.js` is a push-only service worker. Users load it automatically by enabling web push in Alert Options; there is no terminal command to install it. It displays notifications and opens validated same-origin links. It never caches private pages or documents.
- `supabase/check-web-push-prerequisites.sql` is read-only; run its full contents in Supabase SQL Editor before considering migrations.
- The modified `scripts/test-database.mjs` harness runs with **`npm run test:db`** from the repository directory. It creates an isolated local PostgreSQL instance, applies all migrations there and checks ownership, limits, leases, opt-outs, retries and cleanup. It never connects to hosted Supabase.

Migration 014 and the updated harness were run in the isolated local environment during implementation. Browser checks exercise the UI and service worker locally. No hosted schema change, production VAPID configuration or real push-service delivery is implied by these checks. Complete the staging device checks before production activation.

## Delivery behavior and privacy

Each device gets its own job per occurrence and offset. A lease and final eligibility check prevent ordinary duplicate claims and reject alerts after completion, archive, opt-out, deletion or coverage loss. Known 429/5xx responses retry at most three times, 15 minutes apart. Ambiguous network responses or prepared sends whose lease expires become `unknown` and are not blindly retried. Push has no application-level idempotency key; stable topics and notification tags reduce repeated visible notifications without promising exactly-once delivery. Unprepared expired leases can be reclaimed.

404/410 responses remove expired registrations, comparing endpoint and encryption key so an older send cannot delete a replacement. Other rejected sends fail or stop after their retry cap. Notifications expire after one hour on the due date and six hours for earlier reminders. Each request has a five-second absolute deadline. Browser endpoints are restricted to known Apple, Google, Mozilla and Windows push services to avoid arbitrary server requests. Logs contain generic error codes, not device tokens or reminder details.

Subscriptions and encryption keys live in private tables. Notification content includes reminder name, date label and due date, and can appear on a lock screen. The web-push payload is encrypted for the device; push providers still handle routing metadata. Links require normal authentication and ownership checks. Device removal and account deletion cascade their queued jobs.

References: [Next.js local PWA guide](../node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md), [Web Push library](https://github.com/web-push-libs/web-push), [Apple Home Screen web push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
