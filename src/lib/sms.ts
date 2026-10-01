import 'server-only';
import { SMS_LAUNCH_ENABLED } from './alert-options';
import { requireEnv } from './env';
export function smsReady() {
  return SMS_LAUNCH_ENABLED && process.env.SMS_DELIVERY_ENABLED === 'true' && Boolean(process.env.SEMAPHORE_API_KEY && process.env.SEMAPHORE_SENDER_NAME && process.env.SMS_VERIFICATION_SECRET);
}
export type SmsResult = { status: 'accepted' | 'failed' | 'unknown'; providerId: string | null; error: string | null };
export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  if (!smsReady()) return { status: 'failed', providerId: null, error: 'sms_unavailable' };
  try {
    const response = await fetch('https://api.semaphore.co/api/v4/messages', {
      method: 'POST', signal: AbortSignal.timeout(7000),
      body: new URLSearchParams({ apikey: requireEnv('SEMAPHORE_API_KEY'), sendername: requireEnv('SEMAPHORE_SENDER_NAME'), number: phone.slice(1), message }),
    });
    // This provider has no documented idempotency key. Never retry an ambiguous POST.
    if (!response.ok) return { status: response.status >= 500 ? 'unknown' : 'failed', providerId: null, error: 'http_' + response.status };
    const result: unknown = await response.json();
    const row = Array.isArray(result) ? result[0] : null;
    if (!row || typeof row.message_id !== 'number' || typeof row.status !== 'string') return { status: 'unknown', providerId: null, error: 'provider_response_unknown' };
    return { status: ['Queued', 'Pending', 'Sent'].includes(row.status) ? 'accepted' : 'failed', providerId: String(row.message_id), error: ['Queued', 'Pending', 'Sent'].includes(row.status) ? null : 'provider_rejected' };
  } catch { return { status: 'unknown', providerId: null, error: 'provider_response_unknown' }; }
}
