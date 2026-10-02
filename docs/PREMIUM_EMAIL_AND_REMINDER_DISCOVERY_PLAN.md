# Premium emails and reminder discovery

Date: 2 October 2026. Status: implemented locally; hosted migration, deployment, and controlled inbox tests are pending. See [deployment instructions](EMAIL_DELIVERY_SETUP.md) for rollout order. The series remains disabled until configured.

## Outcome

Make Keeply emails feel like a finished, premium part of the product. Help users discover useful reminders through a thoughtful, rotating email series. Every reminder, renewal notice, and suggestion email should explain that Keeply supports all kinds of reminders and invite users to explore categories or create their own.

## Findings

- The screenshot has a plain wordmark, oversized generic heading, ordinary text links, and little visual structure. “Email reminder test” appears in the item-name position; it may be a user-created test item rather than template copy. Preserve users' actual item names, and keep developer fixtures out of customer sends.
- Its subject and body do not match the current `src/lib/reminder-email.ts`. Check the deployed version and the message's send record before attributing this to a rendering bug. Jobs freeze their payload before sending, so an old prepared payload is another possible explanation. These are hypotheses; production has not been inspected.
- Current date emails include useful contextual guidance and actions, but use a single HTML string and a basic div layout. Renewal emails in `src/lib/renewal-email.ts` have almost no styling. Both need one shared visual system.
- Loans, bills, car renewals, and custom reminders already exist in `src/features/templates/categories.ts`. Suggestions should reuse these definitions and existing creation flows.
- The notification worker uses Resend and a durable queue with leases, frozen payloads, retries, and delivery events. Supabase schedules its endpoint every 15 minutes in `supabase/schedule.sql`; hosted operation must be verified.
- The code reserves a shared allowance of 90 emails per UTC day. This is an application limit, not a verified provider-plan allowance. Suggestions must fit remaining capacity without displacing deadline reminders or account renewal notices.

## 1. A shared premium email design

Use Keeply's lavender, deep ink, soft canvas, and existing logo. Aim for a calm, polished product message with clear information and restrained decoration.

Layout, from top to bottom:

1. A soft canvas around a centered white card, approximately 600px wide, fluid on phones.
2. A compact Keeply PH logo and wordmark with “One less thing to remember.”
3. One clear headline and a short supporting sentence.
4. A lavender details panel: actual reminder name, category/date label, exact date, and optional amount when relevant.
5. One prominent lavender action button; subordinate links remain visually quieter.
6. Short, relevant next-step guidance. Include recurrence information only when it helps the user understand what happens next.
7. A compact category-discovery block with the required message below.
8. A readable footer explaining why this email arrived, with the appropriate preference controls and verified support details.

Use email-safe presentation tables, inline critical styles, system fonts, and absolute HTTPS links. Core content and actions must work with images blocked and without decorative CSS. Use a useful hidden inbox preview, accessible contrast, readable text, and a button at least 44px high. Verify light and dark appearances in actual email clients; a browser preview alone is insufficient. Layout guidance is supported by [WooCommerce's email HTML documentation](https://developer.woocommerce.com/docs/features/email/email-html-best-practices).

Keep the current distinction between warranty coverage, confirmed renewal dates, maintenance, and payments. Email links open the app for authenticated actions; opening a link must never mark a reminder complete or change a schedule.

### Example deadline email

- Subject: “Your headphones warranty ends on 28 September”
- Preview: “Review your receipt and coverage before the warranty ends.”
- Heading: “Your warranty is ending soon”
- Details: “Sony headphones · Warranty · 28 September 2026”
- Body: “Keep your receipt handy and check the coverage terms. If something needs attention, contact your seller before coverage ends.”
- Button: “Review receipt & coverage”

Calculate timing from the user's local date. Use “Due today” and overdue/expired language only when accurate; keep exact dates visible and omit sensitive details from subject lines. Use safe fallbacks when a display name is absent.

### Required message in every product email

“Keeply helps you remember all kinds of important dates—from payments and renewals to appointments and personal plans. Explore our categories or create your own reminder.”

Link “Explore our categories” to an accessible category picker and “create your own reminder” to `/add/other`. Add a stable category destination if necessary; do not send users to an unimplemented route or a closed modal. Include equivalent text and links in the plain-text version. Keep this compact in deadline and renewal emails so their main action stays prominent.

## 2. Scheduled suggestion series

Proposed cadence: first suggestion two days after the user opts in, then one per week through the first month. Afterward, reduce to one every two weeks. Use approximately 10:00 AM in the user's saved timezone. Count eligibility from enrollment rather than replaying old signup milestones for existing users.

| Target day after enrollment | Theme | Subject example | Useful suggestion | Main action |
| --- | --- | --- | --- | --- |
| 2 | Start small | One important date, safely remembered | If no reminders exist, start with a bill, renewal, or personal date | Add your first reminder |
| 9 | Loans & installments | Make room for your next payment date | Personal, home, car, or installment payment; optional amount and repeat schedule | Add a loan reminder |
| 16 | Car renewal | Keep your next car renewal in view | Confirmed registration date, insurance renewal, or service | Add a car renewal |
| 23 | Bills & household | Give your monthly bills a place | Electricity, water, internet, rent; repeat only at the user's chosen interval | Add a bill reminder |
| 30 | Any important date | Your reminders can go beyond bills | Appointments, school dates, subscriptions, or a custom reminder | Explore reminder categories |
| Every 14 days afterward | Rotating discovery | Theme-specific subject | Rotate unseen or underused categories; vary examples within each theme | Add a relevant reminder |

These are target dates, not a backlog to catch up on. The first email switches to another eligible theme if the user has already started. Everyone receives the required all-kinds message, a category link, and a custom-reminder link.

### Example loan suggestion

Subject: “One less payment date to keep in your head”

“Have a loan or installment to keep track of? Save its next payment date in Keeply. You can add an amount and a repeat schedule that matches your agreement.”

Button: “Add a loan reminder”

“Keeply helps you remember all kinds of important dates—from payments and renewals to appointments and personal plans. Explore our categories or create your own reminder.”

Use conditional wording: never imply the user has a loan or owns a car. Suggest saving dates from their own documents; never invent payment amounts, renewal deadlines, or coverage.

## 3. Dynamic selection and frequency rules

- Choose from a maintained content library, using saved category counts and previously sent themes. No live AI generation is needed for the first release.
- Prioritize a category the user has not added. If all are represented, choose the least recently suggested relevant theme. Avoid repeating the same theme within 28 days and rotate its examples.
- Skip the zero-reminder introduction as soon as a reminder exists. Prefer another category after a user creates a reminder in the suggested category.
- Stop onboarding after its first month; continue only the lower-frequency discovery series. Do not restart onboarding after a skipped send.
- Cap suggestions at one per rolling seven days during onboarding and one per rolling fourteen days afterward. Delay suggestions after a recent reminder creation or a transactional email within the past 48 hours.
- Send only to confirmed, opted-in accounts. Recheck preferences, account deletion status, delivery suppression, category eligibility, and frequency caps immediately before preparing a send.
- Respect available alert slots. When all slots are used, explain that users can organize dates and review alert coverage in the app; avoid implying every added reminder automatically receives alerts.
- Stagger eligible users within the sending window, reserve capacity for important messages, and expire stale suggestions. Resume with one current suggestion after downtime, never a burst of missed campaigns.

## 4. Preferences and dependable delivery

Add a separate “Reminder ideas & tips” preference alongside existing email deadline alerts and slot-renewal notices. Users must be able to stop suggestions while keeping the alerts they requested. Default the new setting off for existing users; provide a clear opt-in in account settings and onboarding.

Every suggestion email includes an explanation of enrollment, an unsubscribe link, and one-click unsubscribe support. Use a signed, purpose-limited token so unsubscribe does not require login. GET shows a confirmation page without changing preferences, protecting against email-link scanners; the unsubscribe POST disables suggestions and cancels pending campaign jobs. Resend documents the header and POST behavior in its [unsubscribe guide](https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails).

Add durable campaign state: enrollment time, enabled preference, next eligible time, sent theme history, template/content version, and a campaign queue. Queue jobs use a unique account/campaign/step identifier, leased claims, frozen payloads, stable provider idempotency keys, bounded retries, and cancellation/suppression checks. Concurrent cron runs must not produce duplicates.

Integrate suggestions after higher-priority work in the existing scheduler. Keep transactional capacity reserved across the whole day, since later deadline jobs also need room. Track accepted/delivered/bounced/complained outcomes and integrate campaign provider IDs with the existing suppression workflow. Ensure payload validation and freezing retain required unsubscribe headers. A global disable switch and per-account opt-out should stop unsent suggestions immediately.

## 5. Implementation sequence

1. **Verify the email path.** Inspect the deployed template version, sender configuration, and the screenshot message's provider record. Identify any old frozen jobs; do not change the payload under an existing retry key. Verify the actual provider allowance and existing cron health.
2. **Build the shared design.** Create reusable email layout pieces and render deadline, warranty, recurring-payment, and slot-renewal variants. Preserve current contextual guidance and valid action destinations. Audit other customer email surfaces, including auth and payment-provider emails, and document configuration limits.
3. **Review representative previews.** Produce desktop/mobile HTML previews and plain-text counterparts for the existing reminder types plus loan, car, and bill suggestions. Confirm sender branding, subject, preview, details, CTA, and all-kinds message.
4. **Add consent and campaign storage.** Implement the separate preference, enrollment, queue, selection rules, unsubscribe handling, and delivery-event integration. Before schema work, perform a read-only check of hosted migration history and required functions. Verify all prerequisites, including category support, before applying any new migration; preserve migrations already confirmed applied. Record exact file names and execution order when this work is implemented.
5. **Add scheduler processing.** Enforce local sending windows, transactional reserves, eligibility checks, deduplication, stale-message expiry, and the send switch. Existing users enter only after opt-in; enablement must not backfill campaigns.
6. **Validate and release.** Validate in staging using controlled test accounts and provider test facilities. Deploy the visual redesign first; enable the suggestion series for a small opted-in cohort after delivery and preference behavior pass.

Before implementation, read relevant bundled Next.js guides in `node_modules/next/dist/docs/` and verify current provider documentation. Preserve existing unrelated workspace edits.

## Acceptance criteria

- Reminder and renewal emails share the logo, palette, information hierarchy, and button treatment; no developer fixtures leak into customer content.
- Every scoped email includes the all-kinds message and working category/custom links in HTML and plain text.
- Previews and controlled inbox checks cover Gmail, Apple Mail, and Outlook, mobile sizing, dark appearance, blocked images, long names, absent names, and HTML escaping.
- Reminder actions reach the correct item/date and retain safe authentication redirects. Recurrence and renewal copy never invent the next due date.
- Suggestions vary by saved categories and send history; existing users do not receive an onboarding backlog.
- Opt-out stops pending suggestions without disabling deadline alerts. Unsubscribe scanners cannot opt users out through GET alone.
- Meaningful tests cover timezone boundaries, daily quota competition, concurrent claims, retries, preference changes during a lease, account deletion, suppression, and backlog recovery.
- Track confirmed delivery, clicks through to reminder creation, completed reminder creation, unsubscribes, and complaints. Judge usefulness primarily by reminders created, rather than opens alone.

The immediate deliverable is a coherent redesign of the emails users already receive. The scheduled discovery series follows with its own consent, content rotation, and reliable delivery controls.
