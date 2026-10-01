import { formatDate, formatMoney } from './domain';
import { nextRecurringDate } from '@/features/items/recurrence';
export function escapeHtml(value: string) { return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!); }
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
  const button = (href: string, label: string) => '<a href="' + escapeHtml(href) + '" style="display:inline-block;background:#6153ca;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;margin:12px 0">' + escapeHtml(label) + '</a>';
  return {
    from: input.from, to: input.to, subject: input.product + ': ' + input.kind + ' on ' + date,
    text: details + '\n\n' + content.guidance + '\n\n' + content.actionLabel + ': ' + content.action + '\nReview reminder: ' + content.review + '\n\n' + content.schedule + '\nEdit date & schedule: ' + content.edit + '\n\nAlert Options: ' + settings,
    html: '<div style="font-family:Arial,sans-serif;max-width:540px;margin:24px auto;padding:24px;color:#292639;line-height:1.65"><p style="color:#6153ca;font-weight:bold;font-size:24px">Keeply.</p><p style="font-size:12px;letter-spacing:2px;color:#777">ONE LESS THING TO REMEMBER</p><h1 style="font-size:26px;line-height:1.3;overflow-wrap:anywhere">' + escapeHtml(input.product) + '</h1><div style="background:#f5f3ff;border-radius:14px;padding:18px"><strong>' + escapeHtml(input.kind) + '</strong><br>Due ' + escapeHtml(date) + (amount ? '<br>' + escapeHtml(amount) : '') + '</div><h2 style="font-size:18px">Your next step</h2><p>' + escapeHtml(content.guidance) + '</p>' + button(content.action, content.actionLabel) + '<p><a href="' + escapeHtml(content.review) + '" style="color:#6153ca">View reminder & details</a></p><h2 style="font-size:18px">What happens next</h2><p>' + escapeHtml(content.schedule) + '</p><p><a href="' + escapeHtml(content.edit) + '" style="color:#6153ca">Edit date & schedule</a></p><hr style="border:0;border-top:1px solid #eee"><p style="font-size:12px;color:#777">Dates and completion are yours to confirm. Alerts follow your preferences and available coverage. <a href="' + escapeHtml(settings) + '">Alert Options</a></p></div>',
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
