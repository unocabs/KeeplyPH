import { formatDate, formatMoney } from './domain';
import { nextRecurringDate } from '@/features/items/recurrence';
import { escapeHtml, emailLayout, emailPanel, emailButton, emailLink, discoveryText } from './email-layout';
export { escapeHtml } from './email-layout';
export interface ReminderContent {
  product: string; expires: string; purchaseId: string; kind: string; url: string;
  dateId?: string; dateKind?: string; recurrenceMonths?: number | null;
  recurrenceAnchor?: string | null; recurrenceEndsOn?: string | null; paymentAmountMinor?: number | null;
}
export function reminderContent(input: ReminderContent) {
  const link = input.url + '/items/' + encodeURIComponent(input.purchaseId);
  const selected = input.dateId ? '&date=' + encodeURIComponent(input.dateId) + '&due=' + input.expires : '';
  const review = link + (input.dateId ? '#date-' + encodeURIComponent(input.dateId) : '');
  const warranty = input.dateKind === 'warranty';
  const renewal = ['expiration', 'registration', 'insurance'].includes(input.dateKind || '');
  const guidance = warranty ? 'Find your receipt, check the coverage terms and contact your seller if something needs attention before coverage ends.'
    : renewal ? 'Check the provider’s requirements and allow time for renewal. Once renewed, save the confirmed date from your new document.'
    : input.dateKind === 'service' ? 'Arrange your service and keep any useful notes. Mark it done when the work is complete.'
    : input.paymentAmountMinor != null ? 'Check the amount and due date with your provider. Mark this date done after you make the payment.'
    : 'Review what needs doing and mark this date done when you have finished.';
  const next = !warranty && input.recurrenceMonths && input.recurrenceAnchor ? nextRecurringDate(input.recurrenceAnchor, input.expires, input.recurrenceMonths, input.recurrenceEndsOn || null) : null;
  const schedule = warranty ? 'This warranty ends on its expiry date; it does not repeat.' : input.recurrenceMonths
    ? next ? 'Your next scheduled date is ' + formatDate(next) + '. ' + (input.recurrenceEndsOn ? 'The schedule ends on ' + formatDate(input.recurrenceEndsOn) + '.' : 'It continues until you stop it.') + ' Past dates remain unconfirmed until you mark them done.' : 'This is the final date in your current schedule.'
    : renewal ? 'Renewal does not create an assumed expiry date. Add the actual next date after renewal.' : 'This is a one-time reminder. You can add a repeat schedule if this task happens regularly.';
  return { review, guidance, schedule, actionLabel: warranty ? 'Review receipt & coverage' : renewal ? 'Update renewed date' : 'Mark done', action: warranty ? review : link + '?action=complete' + selected, edit: link + '?action=edit' + selected };
}
export function dateReminderEmail(input: ReminderContent & { from: string; to: string }) {
  const content = reminderContent(input), date = formatDate(input.expires);
  const amount = input.paymentAmountMinor != null ? 'Amount: ' + formatMoney(input.paymentAmountMinor) : '';
  const details = input.product + ' · ' + input.kind + '\nDue: ' + date + (amount ? '\n' + amount : '');
  const settings = input.url + '/settings/alerts';
  const heading = input.dateKind === 'warranty' ? 'Your warranty, ready to review' : ['expiration', 'registration', 'insurance'].includes(input.dateKind || '') ? 'A renewal date to keep in view' : input.paymentAmountMinor != null ? 'Your next payment date' : 'An important date to keep in view';
  const subjectKind = input.dateKind === 'warranty' ? 'Warranty' : input.dateKind === 'registration' ? 'Registration' : input.dateKind === 'insurance' ? 'Insurance renewal' : input.dateKind === 'expiration' ? 'Renewal' : input.dateKind === 'service' ? 'Maintenance' : input.paymentAmountMinor != null ? 'Payment' : 'Reminder';
  const body = emailPanel(input.kind, input.product, date + (amount ? ' · ' + amount : ''))
    + '<p style="margin:24px 0 0">' + escapeHtml(content.guidance) + '</p>'
    + emailButton(content.action, content.actionLabel)
    + '<p style="margin:0">' + emailLink(content.review, 'View reminder & details') + '</p>'
    + '<h2 style="margin:28px 0 8px;font-size:17px">What happens next</h2><p style="margin:0;color:#655e73;font-size:14px">' + escapeHtml(content.schedule) + '</p>'
    + '<p style="margin:12px 0 0;font-size:14px">' + emailLink(content.edit, 'Edit date & schedule') + '</p>';
  return {
    from: input.from, to: input.to, subject: 'Keeply: ' + subjectKind + ' on ' + date,
    text: details + '\n\n' + content.guidance + '\n\n' + content.actionLabel + ': ' + content.action + '\nReview reminder: ' + content.review + '\n\n' + content.schedule + '\nEdit date & schedule: ' + content.edit + '\n\n' + discoveryText(input.url) + '\n\nAlert Options: ' + settings,
    html: emailLayout({ url: input.url, preview: input.kind + ' · ' + date + '. Review your saved date and next step.', eyebrow: 'Your reminder', heading, body, reason: 'You received this email for a saved reminder with email alerts enabled. Dates and completion are yours to confirm; alerts follow your preferences and available coverage.' }),
  };
}
export function reminderEmail(input: { from: string; to: string; product: string; expires: string; purchaseId: string; url: string }) {
  return dateReminderEmail({ ...input, kind: 'Warranty expiry', dateKind: 'warranty' });
}
/** ASCII and one segment: no amounts or private notes on a lock screen. */
export function reminderSms(input: ReminderContent) {
  const link = input.url + '/items/' + encodeURIComponent(input.purchaseId);
  const action = input.dateKind === 'warranty' ? 'Review coverage' : ['expiration','registration','insurance'].includes(input.dateKind || '') ? 'Review renewal' : 'Review / mark done';
  const suffix = ' due ' + input.expires + '. ' + action + ': ' + link;
  const clean = input.product.normalize('NFKD').replace(/[^a-zA-Z0-9 .,!?'-]/g, '').replace(/\s+/g, ' ').trim() || 'Reminder';
  const room = Math.max(0, 160 - 'Keeply: '.length - suffix.length);
  if (room < 8) throw new Error('APP_URL is too long for a single-segment reminder');
  return 'Keeply: ' + clean.slice(0, room) + suffix;
}
