import { describe, expect, it } from 'vitest';
import { normalizePhone, alertsPaused } from '@/lib/alert-options';
import { reminderContent, dateReminderEmail, reminderSms } from '@/lib/reminder-email';
import { safeAuthIntent } from '@/lib/auth-intent';
const input = { product: 'Home loan', kind: 'Payment', dateKind: 'other', expires: '2032-01-31', purchaseId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', dateId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', url: 'https://www.keeplyph.com' };
describe('Alert options and useful reminders', () => {
  it('normalizes PH mobile formats and rejects other or malformed numbers', () => {
    for (const value of ['0917 123 4567','+63 (917) 123-4567','639171234567']) expect(normalizePhone(value)).toBe('+639171234567');
    for (const value of ['+12025550123', '123', '+639171234567;other', '091712345678']) expect(normalizePhone(value)).toBeNull();
  });
  it('reports alerts paused while SMS launch is postponed and email is unavailable', () => {
    expect(alertsPaused({email_reminders_enabled:false,email_delivery_blocked:true,sms_reminders_enabled:true,phone_verified_at:'today'})).toBe(true);
    expect(alertsPaused({email_reminders_enabled:false,email_delivery_blocked:false,sms_reminders_enabled:true})).toBe(true);
  });
  it('describes an open-ended month-end schedule without claiming payment', () => {
    const content = reminderContent({...input,recurrenceMonths:1,recurrenceAnchor:input.expires,paymentAmountMinor:845000});
    expect(content.schedule).toContain('February 29, 2032');
    expect(content.schedule).toContain('until you stop it');
    expect(content.action).toContain('due=2032-01-31');
    expect(content.guidance).toContain('after you make the payment');
    const email=dateReminderEmail({...input,from:'from@example.test',to:'to@example.test',paymentAmountMinor:845000});
    expect(email.text).toContain('8,450');expect(email.html).toContain('Mark done');
  });
  it('warranties review coverage and never promise recurrence or renewal', () => {
    const content=reminderContent({...input,dateKind:'warranty',recurrenceMonths:12,recurrenceAnchor:input.expires});
    expect(content.actionLabel).toBe('Review receipt & coverage');expect(content.schedule).toContain('does not repeat');expect(content.action).not.toContain('action=complete');
  });
  it('SMS remains a single ASCII segment with a useful link for long/unicode names', () => {
    const message=reminderSms({...input,product:'🏡 José’s payment '.repeat(50)});
    expect(message.length).toBeLessThanOrEqual(160);expect(message).toMatch(/^[\x20-\x7e]+$/);expect(message).toContain('/items/'+input.purchaseId);
  });
  it('preserves only validated reminder actions through sign-in', () => {
    const link=reminderContent(input).action.replace(input.url,'');
    expect(safeAuthIntent(link)).toBe(link);
    expect(safeAuthIntent('/settings/alerts')).toBe('/settings/alerts');
    expect(safeAuthIntent('https://evil.example/items/'+input.purchaseId)).toBe('/dashboard');
    expect(safeAuthIntent('/items/'+input.purchaseId+'?action=delete&date=invalid')).toBe('/items/'+input.purchaseId);
  });
});
