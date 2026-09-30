# Loan categories and shared recurring reminders

Add the nine requested loan presets to a Loans picker on the homepage and add-reminder flow. Use the existing custom-date item storage, keeping recurrence on important_dates rather than creating a loan-specific backend.

A recurring date stores calendar-month frequency (1, 3, 6 or 12), the original schedule anchor, an inclusive end date, and an optional PHP payment amount in centavos. Loan presets default to monthly, seven days before, with email delivery still an explicit opt-in. Other custom reminders can enable the same recurrence controls.

Keep one active occurrence to preserve existing dashboard, queue and slot behavior. The existing cron advances past dates, retains unconfirmed history without marking payments paid, creates the next anchored occurrence, and schedules its alerts. Completion also advances to the next anchored date. At the end, no later occurrence is created. Users stop future recurrence by changing frequency to Does not repeat, or pause emails by archiving/disabling alerts.

Recurring alert offsets are 0–27 days before so they fit within the shortest supported cycle. Existing one-off offsets remain unchanged. End-of-month calculations always use the original anchor. A bounded worker catches up after downtime without sending historical emails. All cycles on an item use the same alert slot.

Validate server and database inputs, ownership, optimistic revisions, idempotent worker retries, end boundaries, month-end/leap-year behavior, coverage and archive controls. Test in the isolated PostgreSQL harness; do not apply migrations to production as part of this change.
