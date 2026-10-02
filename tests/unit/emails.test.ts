import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dateReminderEmail } from '@/lib/reminder-email';
import { renewalEmail } from '@/lib/renewal-email';
import { ideaThemes, ideaContent, reminderIdeaEmail } from '@/lib/reminder-ideas';
import { discoveryMessage } from '@/lib/email-layout';
import { safeAuthIntent } from '@/lib/auth-intent';
const base = { from: 'Keeply PH <reminders@mail.keeplyph.com>', to: 'preview@example.test', url: 'https://keeplyph.com' };
const reminder = { ...base, product: 'Sony headphones', expires: '2026-11-28', purchaseId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', dateId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' };
const previewEmails = {
  warranty: dateReminderEmail({ ...reminder, kind: 'Warranty', dateKind: 'warranty' }),
  registration: dateReminderEmail({ ...reminder, product: 'My Toyota Vios', kind: 'Registration', dateKind: 'registration' }),
  payment: dateReminderEmail({ ...reminder, product: 'Home loan', kind: 'Payment', dateKind: 'other', recurrenceMonths: 1, recurrenceAnchor: reminder.expires, paymentAmountMinor: 845000 }),
  service: dateReminderEmail({ ...reminder, product: 'Bedroom aircon', kind: 'Maintenance', dateKind: 'service' }),
  renewal: renewalEmail({ ...base, expires: reminder.expires, expired: false }),
  expired: renewalEmail({ ...base, expires: reminder.expires, expired: true }),
  ...Object.fromEntries(ideaThemes.map(theme => ['idea-' + theme, reminderIdeaEmail({ ...base, theme, variant: 0, unsubscribe: base.url + '/api/email/unsubscribe?token=preview-only' })])),
};
describe('premium product emails', () => {
  it.each(Object.entries(previewEmails))('%s keeps discovery and preferences accessible with images blocked', (_name, email) => {
    expect(email.html).toContain('role="presentation"');
    expect(email.html).toContain('keeply<span');
    expect(email.html).toContain('href="https://keeplyph.com/add"');
    expect(email.html).toContain('href="https://keeplyph.com/add/other"');
    expect(email.html).toContain('all kinds of important dates');
    expect(email.text).toContain(discoveryMessage);
    expect(email.text).toContain('/settings/alerts');
    expect(email.html.length).toBeLessThan(50000);
    expect(email.html).not.toContain('localhost');
  });
  it('keeps user names escaped and amounts out of the inbox subject', () => {
    const email = dateReminderEmail({ ...reminder, product: '<img src=x onerror=alert(1)>', kind: 'Payment', paymentAmountMinor: 123456 });
    expect(email.html).not.toContain('<img src=x');
    expect(email.html).toContain('&lt;img');
    expect(email.subject).not.toContain('1,234');
    expect(email.subject).not.toContain('onerror');
  });
  it.each(ideaThemes)('%s uses existing categories and safe creation destinations', theme => {
    for (const variant of [0, 1]) {
      const content = ideaContent(theme, variant);
      expect(safeAuthIntent(content.href)).toBe(content.href);
    }
  });
  it('varies concrete suggestions within categories', () => {
    for (const theme of ['loans', 'vehicles', 'bills'] as const) expect(ideaContent(theme, 0).href).not.toBe(ideaContent(theme, 1).href);
  });
  it('retains separate unsubscribe headers and explains alert coverage', () => {
    const email = reminderIdeaEmail({ ...base, theme: 'loans', variant: 0, unsubscribe: base.url + '/api/email/unsubscribe?token=preview-only' });
    expect(email.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(email.headers['List-Unsubscribe']).toContain('/api/email/unsubscribe');
    expect(email.text).toContain('available alert slots');
  });
  it('exports representative HTML and text previews when requested', async () => {
    const folder = process.env.EMAIL_PREVIEW_DIR;
    if (!folder) return;
    await mkdir(folder, { recursive: true });
    for (const [name, email] of Object.entries(previewEmails)) {
      await writeFile(join(folder, name + '.html'), email.html);
      await writeFile(join(folder, name + '.txt'), 'Subject: ' + email.subject + '\n\n' + email.text);
    }
  });
});
