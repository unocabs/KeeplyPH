# Keeply operations

This app is not connected to live services yet. Complete the provider tests in README.md before launch. Keep production and test data separate.

## Daily checks

Review Supabase project usage, Storage usage/egress, auth errors, scheduled runs, Vercel function failures, PayMongo webhook deliveries, and Resend delivery/bounce events. Application logs use event codes and aggregate counts, not receipt contents or raw provider payloads.

Cron successfully submitting an HTTP request does **not** prove the handler succeeded. Inspect pg_net HTTP results as well as cron.job_run_details:

    select jobid, status, start_time, end_time, return_message
    from cron.job_run_details
    order by start_time desc limit 20;

    select id, status_code, timed_out, error_msg, created
    from net._http_response
    order by created desc limit 20;

Treat missing runs, persistent non-2xx responses, or a growing queue as actionable. Inspect these queries as the database administrator, never through a client-facing endpoint:

    select status, count(*), min(next_attempt_at) oldest_due
    from private.notification_jobs
    group by status;

    select day, reserved from private.email_daily_quota
    order by day desc limit 7;

    select count(*) pending_objects, min(next_attempt_at) oldest_retry,
      max(attempts) highest_attempts from private.object_deletions;

    select count(*) pending_accounts, min(requested_at) oldest_request
    from private.account_deletions where completed_at is null;

    select event_id, order_id, event_type, provider_payment_id, created_at
    from private.billing_events where status='needs_review'
    order by created_at;

No alerting service is provisioned. Assign an operator to review these during the pilot and add an uptime/error alert before expanding beyond a small beta.

## Reminder delivery and recovery

Each warranty expiration date has at most one job per 30/7/1-day threshold. Changing the expiration date cancels unsent old jobs; switching reminders off cancels pending work. Sent jobs are not recreated when the same preference/date is restored.

Workers lock jobs with a three-minute lease and fence acknowledgments by the lease token. A stable provider idempotency key and frozen email body are reused for retries. Backoff is 15 minutes, 1 hour, 4 hours, then 12 hours. Up to six attempts are allowed, but retries stop at 23 hours after the first attempt. Uncertain outcomes become unknown; they are never blindly resent after the provider's 24-hour idempotency window.

For unknown jobs, search the Resend dashboard using the provider email ID when available, recipient, and time window. Reconcile acceptance/delivery before changing state. If the provider cannot establish whether it accepted a message, leave the job unknown; do not reset its attempt time or create a new idempotency key just to force delivery.

Provider acceptance and delivery are distinct states. Delivery webhooks arriving before the send response are persisted and applied when the provider ID is attached. A bounce or complaint blocks further account email delivery. Clear that flag only after resolving the cause and obtaining the user's consent; do not clear complaint suppression automatically.

The global 90-attempt daily allowance is conservative and includes retries/claimed work that might not be sent. Capacity may be exhausted before the provider quota. Review queue age; increasing the database cap also requires checking Resend's daily/monthly plan and rate limits.

Reminder preference changes or deletion racing an already dispatched provider request cannot recall that email. Final eligibility is checked immediately before dispatch, minimizing that window.

## Payment reconciliation and refunds

The browser success page is never authoritative. Orders credit only through a verified webhook plus a direct provider retrieval. Amount and currency must match the stored product: 2900 centavos (30 days), 24900 (permanent), or 36000 for a historical annual order, all PHP. Paid orders, provider payment IDs, and event IDs are deduplicated transactionally.

An interrupted checkout-creation request leaves a pending order. Do not blindly create another session for the same order. Search PayMongo by the order reference:

- If a session exists, verify its environment/reference/amount, then attach that session using the service-only attach_checkout function.
- If payment completed, request a provider webhook replay; the handler retrieves and verifies it before credit.
- If no session/payment can be confirmed, let the pending order expire after 24 hours and create a new checkout.

Refund/dispute events are saved for manual review. Confirmed full-refund resources remove only the linked unused pack benefit through the service-only adjustment RPC. Partial refunds, disputes, and ambiguous events require review. A review event received before its paid order is mapped may have no order_id; resolve it by provider_payment_id. Monitor both the PayMongo dashboard and the local queue.

For an approved refund, complete the provider-side refund through the authorized operator workflow, verify its final state, then reconcile the affected billing order and entitlement in a single reviewed database transaction. Inspect **all** orders for that account. For a new pack, use the service-only `apply_verified_refund` function only after retrieving authoritative successful refund evidence; for legacy annual access, review `premium_until` separately. Never blindly subtract a year: the user may have another paid renewal or already consumed part of the period. Preserve accounting history, record the resolution, and mark only the resolved billing events reviewed. The app never initiates a transfer/refund automatically and offers no automatic proration on upgrades.

Payments for an account already pending deletion require operator review/refund. The account cannot be reactivated by a payment event.

## Uploads and deletion

Uploads first reserve an owner-scoped document row, then use a signed URL into the private staging bucket. A server finalizer enforces size/type constraints, re-encodes images, writes an immutable final object, and marks the row ready. No ordinary client can write final objects or set a document ready.

Files reserve up to 10 MB while pending; ready images consume actual processed bytes. A purchase allows 6 files and an account up to 3 unfinished drafts. Drafts expire after 24 hours. Signed upload URLs expire after two hours; issuing a retry extends the reservation's cleanup deadline.

Deleting a document queues both keys durably. Final-object cleanup waits 15 minutes so a bounded in-flight validator cannot recreate an object after cleanup. Staging cleanup waits until signed uploads have expired plus a ten-minute margin. The hourly worker retries failures; it does not discard failed cleanup tasks.

Account deletion blocks access immediately through RLS, deletes purchase rows, and preserves cleanup queues outside the account cascade. Authentication deletion waits until queued objects and owner-prefixed Storage objects are gone. This normally requires several hourly runs. Existing signed download links may remain usable for their remaining 60-second lifetime.

For a stuck deletion, inspect the queued keys and provider removal errors. Never delete Storage metadata rows directly: use the Storage API so object bytes are removed. If an unexpected orphan blocks auth deletion, verify its owner prefix and delete it through Storage, then rerun maintenance.

## Backups and restore

The selected Supabase Free setup does not establish an automatic backup system. Before real receipts are accepted:

1. Schedule independent encrypted exports of the application database, including private billing/job/deletion state and the required authentication records using Supabase-supported backup procedures.
2. Back up object bytes separately. Database backups do **not** contain Storage file contents.
3. Keep the backup credentials outside this repository, restrict who can read the backups, and define retention and deletion-request handling.
4. Test restoration into a separate project with outgoing email, payments, and Cron disabled.
5. Verify ownership, object keys, plan periods, notification deduplication, and pending cleanup work before enabling workers.

After a restore, reconcile payments and email acceptance occurring after the snapshot before reopening writes or sending reminders. Restoring an old notification log must not resend emails that the provider already accepted. Reapply account deletion requests that happened after the snapshot.

Choose a practical backup destination/retention and record it in the final privacy notice. No backup destination, paid storage subscription, or retention commitment was created by this implementation.

## Configuration and launch gates

- Google OAuth consent screen and callback allowlist verified with two accounts.
- Supabase buckets private; no broad write/read policies added.
- Production APP_URL matches the canonical HTTPS origin.
- PayMongo live key and webhook environment agree.
- Resend sender domain verified; bounce/complaint/delivery webhooks verified.
- EMAIL_DELIVERY_ENABLED and PAYMENTS_ENABLED off in uncontrolled previews.
- CRON_SECRET present and identical in the host and Vault.
- Cron HTTP responses observed, not just scheduling success.
- Support inbox exists; operator identity, terms, refund policy, and retention reviewed.
- Database and object restore drill complete.
- Current provider limits and costs checked against measured project usage.

This is a local implementation and a deployment runbook, not evidence that these launch checks have already passed.

## Reminder packs and renewal notices

Users manually purchase ₱29 for 30 days or ₱249 permanently through PayMongo checkout. Renewal extends from the later of current expiry and verified fulfillment time. No subscription API, saved-card billing, or automatic charge exists. Early renewal extends time, not slot quantity. Both new products add five slots to the free three; permanent switching replaces the same extra pack.

Apply all migrations through 009 before deploying the matching app. New databases default to test billing mode. On the dedicated production database, set `private.billing_settings.live=true` through the operator SQL console after verifying live provider setup; this excludes test pack grants from capabilities. Keep previews in a separate test project. Do not change production mode for testing.

Renewal jobs share the existing notification table, leases, immutable payloads, retry cutoff, email-event handling, and daily 90-attempt limit. Each notice has an account + pack revision + kind identity. Final preparation rejects notices after renewal, permanent purchase, opt-out, delivery block, or account deletion. After downtime, expired notices are eligible for only 48 hours. They do not consume an item slot. Item email preferences and renewal-email preferences are independent.

Inspect `billing_reviews`, unknown notification counts, pending checkout age, and queue age. Successful payment callbacks/reconciliation are authoritative, never the browser return. Unattached checkout timeouts require the provider-reference lookup described above. The current periodic sweep rotates one attached pending/expired checkout per maintenance run over a seven-day window; older unresolved orders need operator review.

A confirmed complete refund may be applied repeatedly without subtracting access twice. Later prepaid periods are retained and shifted by only the refunded unused interval. Permanent refunds restore any remaining unrefunded short-term period. Partial refunds and disputes remain explicit review cases. Record the resolution in the billing audit ledger and close only the relevant review events.

Optional product measurement reuses opt-in events and 90-day retention. Item coverage events are distinct from historical per-date opt-ins. No item names, due dates or payment details are captured as analytics.


## Feedback rollout (migration 010)

Apply `supabase/migrations/202609260010_feedback.sql` once, after 009, before deploying this app version. No new environment variables or provider settings are required. The migration enables the feedback promotion by default; it does not grant anything to existing accounts until they submit qualifying feedback. It leaves the current billing mode unchanged. Existing paid access remains intact.

Then deploy the app. Smoke-test the public Feedback link through Google sign-in, an initial submission with required notes, the reward expiry in plan & billing, and a second submission with optional notes. Use a separate test database for repeated payment/refund experiments, never toggle production to test mode.

The operator reviews submissions only in Supabase SQL Editor (database owner):

```sql
select user_id, id, kind, summary, notes, status, created_at
from private.feedback
order by created_at desc
limit 50;
```

To pause new reward claims while keeping feedback open:

```sql
update private.feedback_settings set promotion_enabled = false where singleton;
```

Set it back to `true` to reopen the offer. Existing grants are unaffected. Feedback is limited to five successful submissions per account per daily rate-limit window. A summary is always required; notes require 30–2,000 trimmed characters only for reward-eligible submissions. Permanent pack accounts and accounts that already claimed can submit without notes.

`private.feedback_claims` records one claim per account for the account's lifetime, independently of feedback text retention and billing mode. Temporary paid access is extended, not stacked into more slots. Refunding an earlier paid period moves later reward time forward; upgrading to permanent supersedes the temporary benefit. The claim remains used. Do not manually clear claims to retry tests on production.

The existing hourly maintenance endpoint calls `purge_old_feedback`, removing text older than 12 months. Account deletion cascades both feedback and claims. Promotion expiry uses the existing slot expiry and renewal-email preference rules, with no automatic charges. The operator should review new submissions regularly; no extra email notifications are sent.

Rollback: disable the promotion and roll back the app if needed. Do not drop the claim ledger or undo migration 010 after rewards have been granted; that would lose claim history or refund protection.


## Recurring reminder advancement

Deploy migration `202609280011_recurring_dates.sql` before the app. Existing 15-minute notification and hourly maintenance calls advance recurrence even when outbound email is disabled. Do not grant client execution on `advance_recurring_dates` or expose the private schema. Existing coverage/account preferences still decide email eligibility.

Inspect catch-up backlog without private notes or payment amounts:

```sql
select count(*) as schedules_waiting, min(o.due_on) as oldest_due
from public.important_dates d
join public.date_occurrences o on o.date_id=d.id and o.status='open'
join public.items i on i.id=d.item_id
join public.profiles p on p.id=d.user_id
where d.recurrence_months is not null
  and i.archived_at is null and i.state='saved' and p.deletion_requested_at is null
  and o.due_on < (now() at time zone p.timezone)::date;
```

The bounded worker can need multiple runs after extended downtime. Dates left unconfirmed are history, not evidence of nonpayment. The worker never marks payments paid and never sends historical alerts. Queued future alerts retain existing occurrence-based idempotency and are checked again before delivery. Migration verification is covered by `npm run test:db` against a temporary isolated database.
