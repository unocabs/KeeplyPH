import { z } from 'zod';

/** Only known browser push services may receive server requests. */
export function allowedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash &&
      url.pathname !== '/' && value.length <= 2048 && (
        url.hostname === 'fcm.googleapis.com' || url.hostname === 'updates.push.services.mozilla.com' ||
        /^[a-z0-9-]+\.push\.apple\.com$/.test(url.hostname) || /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname)
      );
  } catch { return false; }
}
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().max(2048).refine(allowedPushEndpoint, 'Unsupported push service.'),
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}={0,2}$/).refine(value => Buffer.from(value, 'base64url').length === 65 && Buffer.from(value, 'base64url')[0] === 4),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/).refine(value => Buffer.from(value, 'base64url').length === 16),
  }),
});
export interface PushDeviceStatus { enabled: boolean; registered: boolean; deviceCount: number }
