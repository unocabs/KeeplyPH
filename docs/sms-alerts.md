> **Current status: SMS launch is postponed.** Alert Options remains available for email preferences and displays “SMS coming soon” with a disabled option. Reminder forms do not ask for a phone number. `SMS_LAUNCH_ENABLED` is false, which prevents verification and sending even if provider environment variables are configured. No SMS subscription is active. The design and provider instructions below are retained for a future launch, not the current customer experience. Before any launch, choose the provider, confirm top-up requirements and pricing, and review the commercial offer. The 30-text quota below is an inactive implementation guardrail, not an advertised subscription allowance.

# SMS and premium reminder plan

Email remains the default channel. Alert Options is a separate tab in the personal vault. Checking Receive SMS reveals a Philippine mobile field; a saved number requires a six-digit verification code before any reminder is sent. Reminder forms show only a compact optional prompt after choosing alerts. Opening it never makes phone details required for saving a reminder. A saved number hides the prompt; Not now remembers the preference on the account across devices. Phone edits revoke verification. Users can remove their number or switch SMS off in Alert Options.

## Provider and cost decision

Resend is an email provider; its documented platform does not provide SMS. Keep Resend for email. Semaphore is the implemented Philippine SMS provider. Its published rate checked October 1, 2026 is ₱0.56/text excluding VAT; Twilio lists $0.241 per Philippine outbound segment. Neither is a free ongoing production SMS service. Free signup or trials should not be advertised as free sending.

- [Resend platform](https://resend.com/features/email-api)
- [Semaphore price](https://semaphore.co/)
- [Semaphore API, sender names, response statuses and segment limits](https://semaphore.co/docs)
- [Twilio Philippine pricing](https://www.twilio.com/en-us/sms/pricing/ph)

Launch guardrails currently enforce 30 reminder SMS attempts per account per UTC calendar month and 100 SMS attempts globally per UTC day, including verification texts. SMS copy uses ASCII and at most 160 characters, and includes an item link. Verification is limited to three requests per account or target number per hour, at least a minute apart, five guesses per code, and a ten-minute expiry. Monthly reservations survive deletion of an individual reminder. Neither quota is a promise of delivery. Global capacity and network failures can prevent an SMS; email remains independently available if enabled. At the account SMS limit, further SMS are skipped rather than accumulating surprise messages the next month.

Thirty messages cost ₱16.80 before VAT. At 12% VAT as a budgeting assumption, this is ₱18.82, before verification and other expenses. This assumption should be confirmed on the provider invoice. A global full day is ₱56 before VAT. Monitor quota utilization and provider balances before enabling SMS broadly.

**Commercial recommendation:** sell SMS credits separately, rather than bundling perpetual SMS into the ₱249 permanent alert slots. The ₱29 monthly slot pack also has little margin if it includes all 30 texts. Keep slot pricing unchanged until you choose an SMS credit-pack price, allowance, refunds and billing policy. The current capped SMS integration can be tested as a limited launch benefit, but it is not a credit-billing system. For scale, add purchased-credit balances and decrement atomically in the existing claim transaction. Do not enable unlimited SMS for lifetime plans.

## Make every alert useful

Email includes a clear item/date heading, optional saved payment amount, a relevant next step and direct links to the reminder, completion confirmation and schedule editor. Text messages stay short and link to the same private record; amounts and notes are omitted from the lock screen.

- Warranties: review receipt and coverage; act before actual coverage ends. No repeating warranty period or assumed renewal. Finish tracking closes the date.
- IDs, registration and insurance: review requirements; after renewing, enter the confirmed date from the new document. A user-chosen repeating follow-up is not an official validity period.
- Payments: confirm amount and deadline; mark done after paying. The original anchor determines each new date.
- Service and other tasks: arrange the work and mark done when complete. Repetition is explicitly chosen, never inferred from a missing end date.
- Explicit recurring schedules without an end date continue until stopped. Past uncompleted cycles remain unconfirmed, never automatically paid or completed. Emails explain the next date or final cycle.

Email action links are authenticated and do not mutate on GET. Completion requires a confirmation. Links carry the original due date; an older recurring email cannot pre-open completion for a later cycle. After Google sign-in, validated item/date/action paths are retained and the destination checks ownership.

## Apply before deployment

In the existing project's Supabase SQL Editor, run the complete contents of **`supabase/migrations/202610010013_sms_alerts.sql` once**, after `202610010012_reminder_categories.sql`, before deploying this version. For a fresh project, follow the README migration order first. The migration runs inside a transaction. It adds columns, private SMS/verification tables and service-only RPCs, preserves email job identities and retry logic, and stops repeating warranty metadata while preserving occurrences/history. Review existing warranty recurrence data before applying: auto-repeat is removed from those dates.

This migration has been run only in the isolated local PostgreSQL integration harness, not against your hosted Supabase project. The updated existing harness runs with `npm run test:db`; it never connects to an existing database. No new executable scripts are required.

## Configure and test

1. Create a Semaphore account, load credits and have your sender name approved for Philippine mobile networks. Confirm current rates, applicable VAT, sender approval and whether URLs in messages are allowed for your sender/route; carrier filtering can affect delivery.
2. Set `SEMAPHORE_API_KEY`, `SEMAPHORE_SENDER_NAME`, and an independently generated secret in `SMS_VERIFICATION_SECRET` on the server. Keep keys out of NEXT_PUBLIC variables. Generate the secret with `openssl rand -hex 32`; do not rotate it while codes are active unless you accept invalidating them.
3. Keep `SMS_DELIVERY_ENABLED=false` for public traffic. Enable it only in a controlled staging deployment after applying the migration. Save your own number in Alert Options, request a code, verify it and confirm your actual handset receives it. Do not treat an API accepted status as handset delivery.
4. On the staging account, create a covered reminder with a future date and opt into alerts. Select a timing whose 9 AM send time is still in the future. After that time, let the existing scheduler invoke `POST /api/cron/notifications`. The worker claims SMS independently of `EMAIL_DELIVERY_ENABLED` and also preserves email delivery independently of SMS provider failures.
5. Check both the provider's message records and handset. Repeat with email-only preferences, SMS opt-out, number changes, archived/completed items, lost slot capacity, and a recurring schedule. Confirm old email links do not offer completion of a new cycle. Test reminder actions when signed out, then sign in.
6. Check Alert Options, the SMS prompt and date forms on a narrow phone and desktop; save, hide, reopen, verification failure, and retry states should be understandable. Real authentication/provider tests are still required even when local database and browser checks pass.
7. Enable production SMS only after the controlled checks succeed and you accept the capped SMS launch economics. Keep the existing email provider configuration. The existing Supabase scheduler already calls this worker; no new cron or scheduler SQL is required if it is installed.

## Delivery and operations

`private.sms_jobs` tracks pending, sending, accepted, failed, unknown, cancelled and skipped statuses separately from email. Eligibility is rechecked immediately before sending: verified number, opt-in, item coverage, current occurrence/offsets, archive/deletion state and due date. Separate atomic quota reservations bound costs across concurrent workers. Semaphore API acceptance is recorded as accepted, not delivered. Consult provider records to investigate delivery; there is no delivery-webhook integration in this change.

Semaphore has no documented message-creation idempotency key. An interrupted/ambiguous send or expired send lease becomes unknown and is not automatically retried. Reconcile it with provider logs before manually considering another text. This favors avoiding duplicates over guaranteed retry delivery. HTTP rejections are failed and also are not automatically retried; email has its own existing retry/idempotency flow. Never log API keys, verification codes or provider raw responses containing phone numbers.

Phone challenge records cascade on account deletion and expire after ten minutes; verification request history is trimmed after a day during later requests. SMS jobs cascade when a date is deleted; budget counters cascade when the account is deleted. No new phone data is sent to analytics.
