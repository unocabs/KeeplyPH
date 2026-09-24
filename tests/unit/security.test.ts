import { createHmac } from 'node:crypto';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { verifyPaymongoSignature } from '@/lib/paymongo-signature';
import { parsePaymongoEvent } from '@/lib/paymongo-event';
import { checkOrigin, validCron } from '@/lib/security';
import { reminderEmail } from '@/lib/reminder-email';
afterEach(() => vi.unstubAllEnvs());
describe('Payment webhook signatures', () => {
  const raw = '{"data":{"id":"evt_test"}}', secret = 'test-secret', timestamp = 1700000000;
  const mac = createHmac('sha256', secret).update(timestamp + '.' + raw).digest('hex');
  it('accepts the exact signed body in the correct environment', () => expect(verifyPaymongoSignature(raw, 't=' + timestamp + ',te=' + mac + ',li=', secret, false, timestamp * 1000)).toBe(true));
  it('rejects altered body, stale events, wrong secret, and wrong environment', () => {
    const header = 't=' + timestamp + ',te=' + mac + ',li=';
    expect(verifyPaymongoSignature(raw + ' ', header, secret, false, timestamp * 1000)).toBe(false);
    expect(verifyPaymongoSignature(raw, header, secret, false, (timestamp + 301) * 1000)).toBe(false);
    expect(verifyPaymongoSignature(raw, header, 'wrong', false, timestamp * 1000)).toBe(false);
    expect(verifyPaymongoSignature(raw, header, secret, true, timestamp * 1000)).toBe(false);
  });
  it('accepts both documented PayMongo event envelopes', () => {
    const event = { type: 'checkout_session.payment.paid', livemode: false, data: { id: 'cs_test', attributes: { reference_number: 'order' } } };
    expect(parsePaymongoEvent({ data: { id: 'evt_test', attributes: event } }).id).toBe('evt_test');
    expect(parsePaymongoEvent({ event_type: 'send.webhook', data: event }).attributes.data.id).toBe('cs_test');
    expect(() => parsePaymongoEvent({ data: {} })).toThrow();
  });
});
describe('Request and email boundaries', () => {
  it('requires the exact configured origin', () => {
    vi.stubEnv('APP_URL', 'https://keeplyph.com');
    expect(checkOrigin(new Request('https://keeplyph.com/api', { headers: { origin: 'https://keeplyph.com' } }))).toBe(true);
    expect(checkOrigin(new Request('https://keeplyph.com/api', { headers: { origin: 'https://keeplyph.com.evil.test' } }))).toBe(false);
  });
  it('never opens cron access when the secret is missing', () => {
    vi.stubEnv('CRON_SECRET', '');
    expect(validCron(new Request('https://keeplyph.com/api'))).toBe(false);
    vi.stubEnv('CRON_SECRET', 'test-random-secret');
    expect(validCron(new Request('https://keeplyph.com/api', { headers: { authorization: 'Bearer test-random-secret' } }))).toBe(true);
  });
  it('escapes user-controlled names in reminder HTML', () => {
    const mail = reminderEmail({ from: 'keeply@example.test', to: 'test@example.test', product: '<img src=x onerror=alert(1)>', expires: '2026-09-20', purchaseId: 'id', url: 'https://keeplyph.com' });
    expect(mail.html).not.toContain('<img');
    expect(mail.html).toContain('&lt;img');
    expect(mail.text).toContain('<img');
  });
});
