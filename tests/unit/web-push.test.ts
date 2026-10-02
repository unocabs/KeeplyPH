import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createECDH } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { allowedPushEndpoint, pushSubscriptionSchema } from '@/lib/push-subscription';
import { alertsPaused } from '@/lib/alert-options';
import { pushResponseStatus, pushTtl, reminderPush, pushReady } from '@/lib/web-push';

const key = createECDH('prime256v1'); key.generateKeys();
const subscription = { endpoint: 'https://fcm.googleapis.com/wp/token', keys: { p256dh: key.getPublicKey().toString('base64url'), auth: Buffer.alloc(16, 3).toString('base64url') } };
describe('web push validation and delivery', () => {
  it('accepts known browser services and rejects arbitrary server destinations', () => {
    for (const endpoint of [subscription.endpoint, 'https://updates.push.services.mozilla.com/wpush/v2/token', 'https://web.push.apple.com/token', 'https://wnsv2.notify.windows.com/w/?token=abc']) expect(allowedPushEndpoint(endpoint)).toBe(true);
    for (const endpoint of ['http://fcm.googleapis.com/wp/token', 'https://fcm.googleapis.com.evil.test/wp/token', 'https://127.0.0.1/private', 'https://fcm.googleapis.com:8443/wp/token', 'https://user:pass@fcm.googleapis.com/wp/token', 'https://fcm.googleapis.com/wp/token#fragment', 'https://fcm.googleapis.com/']) expect(allowedPushEndpoint(endpoint)).toBe(false);
    expect(pushSubscriptionSchema.safeParse(subscription).success).toBe(true);
    expect(pushSubscriptionSchema.safeParse({ ...subscription, keys: { ...subscription.keys, auth: 'short' } }).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ ...subscription, keys: { ...subscription.keys, p256dh: Buffer.alloc(65).toString('base64url') } }).success).toBe(false);
  });
  it('distinguishes service acceptance, expired registrations, retryable and permanent errors', () => {
    expect(pushResponseStatus(201)).toBe('accepted');
    for (const code of [404, 410]) expect(pushResponseStatus(code)).toBe('expired');
    for (const code of [429, 500, 503]) expect(pushResponseStatus(code)).toBe('retry');
    for (const code of [400, 401, 403]) expect(pushResponseStatus(code)).toBe('failed');
  });
  it('bounds offline notification lifetime and respects the account timezone', () => {
    const now = new Date('2026-10-02T17:00:00Z');
    expect(pushTtl('2026-10-02', 'Asia/Manila', now)).toBe(0);
    expect(pushTtl('2026-10-03', 'Asia/Manila', now)).toBe(3600);
    expect(pushTtl('2026-10-04', 'Asia/Manila', now)).toBe(21600);
    expect(pushTtl('2026-10-02', 'UTC', now)).toBe(3600);
  });
  it('does not label push-only accounts as paused without email', () => {
    const preferences = { email_reminders_enabled: false, email_delivery_blocked: true, push_reminders_enabled: true, push_subscription_count: 1 };
    expect(alertsPaused(preferences)).toBe(false);
    expect(alertsPaused({ ...preferences, push_subscription_count: 0 })).toBe(true);
  });
  it('keeps notification content bounded and links to a private reminder', () => {
    const payload = reminderPush({ id: 'job', itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', dateId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', product: 'X'.repeat(500), kind: 'Payment', dueOn: '2026-10-18' });
    expect(payload.url).toBe('/items/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa#date-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    expect(payload.body.length).toBeLessThan(240);
    expect(payload.body).toContain('October 18, 2026');
  });
  it('requires an explicit launch flag and complete keys', () => {
    vi.stubEnv('PUSH_DELIVERY_ENABLED', 'false');
    expect(pushReady()).toBe(false);
    vi.stubEnv('PUSH_DELIVERY_ENABLED', 'true'); vi.stubEnv('VAPID_PUBLIC_KEY', '');
    expect(pushReady()).toBe(false); vi.unstubAllEnvs();
  });
});

describe('push-only service worker', () => {
  function worker() {
    const listeners: Record<string, (event: unknown) => void> = {};
    const showNotification = vi.fn().mockResolvedValue(undefined);
    const openWindow = vi.fn().mockResolvedValue(undefined);
    const self = { location: { origin: 'https://keeplyph.com' }, addEventListener: (type: string, callback: (event: unknown) => void) => { listeners[type] = callback; }, registration: { showNotification }, clients: { matchAll: vi.fn().mockResolvedValue([]), openWindow } };
    runInNewContext(readFileSync('public/sw.js', 'utf8'), { self, URL });
    return { listeners, showNotification, openWindow };
  }
  it('shows a fallback for malformed payloads and never installs a private-page cache', async () => {
    const { listeners, showNotification } = worker();
    let task: Promise<unknown> | undefined;
    listeners.push({ data: { json: () => { throw new Error('Malformed'); } }, waitUntil: (value: Promise<unknown>) => { task = value; } });
    await task;
    expect(showNotification).toHaveBeenCalledWith('Keeply reminder', expect.objectContaining({ body: 'Open Keeply to review your reminders.' }));
    expect(Object.keys(listeners)).toEqual(['push', 'notificationclick']);
  });
  it('opens only approved same-origin targets', async () => {
    for (const [url, expected] of [
      ['https://evil.test/private', 'https://keeplyph.com/dashboard'],
      ['/api/cron/notifications', 'https://keeplyph.com/dashboard'],
      ['/settings/alerts', 'https://keeplyph.com/settings/alerts'],
      ['/items/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa#date-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'https://keeplyph.com/items/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa#date-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
    ]) {
      const { listeners, openWindow } = worker();
      let task: Promise<unknown> | undefined;
      listeners.notificationclick({ notification: { close: vi.fn(), data: { url } }, waitUntil: (value: Promise<unknown>) => { task = value; } });
      await task; expect(openWindow).toHaveBeenCalledWith(expected);
    }
  });
});
