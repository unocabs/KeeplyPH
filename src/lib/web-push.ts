import 'server-only';
import { createHash } from 'node:crypto';
import { request } from 'node:https';
import webPush from 'web-push';
import { allowedPushEndpoint, pushSubscriptionSchema } from './push-subscription';
import { formatDate, todayIn } from './domain';
import { appUrl } from './env';

export function pushReady() {
  return process.env.PUSH_DELIVERY_ENABLED === 'true' && Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}
export function pushPublicKey() { return pushReady() ? process.env.VAPID_PUBLIC_KEY! : null; }
export type PushSendStatus = 'accepted' | 'retry' | 'failed' | 'unknown' | 'expired';
export function pushResponseStatus(code: number): PushSendStatus {
  if (code >= 200 && code < 300) return 'accepted';
  if (code === 404 || code === 410) return 'expired';
  if (code === 429 || code >= 500) return 'retry';
  return 'failed';
}
export function reminderPush(input: { id: string; itemId: string; dateId: string; product: string; kind: string; dueOn: string }) {
  return {
    title: 'Keeply reminder', body: `${input.product.slice(0, 80)} · ${input.kind.slice(0, 80)}. Due ${formatDate(input.dueOn)}.`,
    url: `/items/${encodeURIComponent(input.itemId)}#date-${encodeURIComponent(input.dateId)}`, tag: 'keeply-' + input.id,
  };
}
/** Do not leave an obsolete date on a device for weeks after the send. */
export function pushTtl(dueOn: string, timezone: string, now = new Date()) {
  if (dueOn < todayIn(timezone, now)) return 0;
  // The due-day message expires within an hour; earlier messages within six hours.
  return dueOn === todayIn(timezone, now) ? 3600 : 21600;
}
export async function sendWebPush(subscription: unknown, payload: { title: string; body: string; url: string; tag: string }, ttl = 3600): Promise<{ status: PushSendStatus; error: string | null }> {
  if (!pushReady()) return { status: 'failed', error: 'push_disabled' };
  const parsed = pushSubscriptionSchema.safeParse(subscription);
  if (!parsed.success || !allowedPushEndpoint(parsed.data.endpoint)) return { status: 'failed', error: 'invalid_subscription' };
  try {
    const details = webPush.generateRequestDetails(parsed.data, JSON.stringify(payload), {
      TTL: ttl, urgency: 'normal', topic: createHash('sha256').update(payload.tag).digest('base64url').slice(0, 32),
      vapidDetails: { subject: process.env.VAPID_SUBJECT!, publicKey: process.env.VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! },
    });
    // Absolute deadline; destroy the request instead of leaving a background send running.
    const code = await new Promise<number>((resolve, reject) => {
      const req = request(details.endpoint, { method: details.method, headers: details.headers, signal: AbortSignal.timeout(5000) }, response => {
        response.resume(); resolve(response.statusCode || 0);
      });
      req.on('error', reject); req.end(details.body);
    });
    return { status: pushResponseStatus(code), error: code >= 200 && code < 300 ? null : 'http_' + code };
  } catch {
    // Push services have no application-level idempotency key. Avoid blind retries after an ambiguous send.
    return { status: 'unknown', error: 'provider_response_unknown' };
  }
}
export const pushTestPayload = () => ({ title: 'Keeply notifications are connected', body: 'This is a test. Your enabled reminders will follow your selected alert timings.', url: appUrl() + '/settings/alerts', tag: 'keeply-push-test' });
