import 'server-only';
import { z } from 'zod';
import { adminClient } from './supabase/admin';
import { appUrl, requireEnv } from './env';
import { unsubscribeToken } from './email-unsubscribe';
import { ideaThemes, reminderIdeaEmail } from './reminder-ideas';
const jobsSchema = z.array(z.object({ id: z.string().uuid(), lease_token: z.string().uuid(), user_id: z.string().uuid(), enrollment_id: z.string().uuid(), email: z.string().email(), theme: z.enum(ideaThemes), variant: z.number().int(), payload: z.unknown().nullable() }));
export const ideaPayloadSchema = z.object({ from: z.string(), to: z.string().email(), subject: z.string(), html: z.string(), text: z.string(), headers: z.object({ 'List-Unsubscribe': z.string(), 'List-Unsubscribe-Post': z.literal('List-Unsubscribe=One-Click') }) });
export function reminderIdeasReady() {
  return process.env.EMAIL_DELIVERY_ENABLED === 'true' && process.env.REMINDER_IDEAS_ENABLED === 'true' && (process.env.EMAIL_UNSUBSCRIBE_SECRET?.length || 0) >= 32;
}
export async function deliverReminderIdeas(started: number) {
  if (!reminderIdeasReady() || Date.now() - started > 35000) return 0;
  const admin = adminClient(), apiKey = requireEnv('RESEND_API_KEY'), from = requireEnv('EMAIL_FROM');
  const { data, error } = await admin.rpc('claim_reminder_idea_jobs', { p_limit: 1 });
  if (error) throw new Error('Reminder idea claim failed');
  let accepted = 0;
  for (const job of jobsSchema.parse(data)) {
    if (!reminderIdeasReady() || Date.now() - started > 40000) break;
    const unsubscribe = appUrl() + '/api/email/unsubscribe?token=' + encodeURIComponent(unsubscribeToken(job.user_id, job.enrollment_id));
    const proposal = ideaPayloadSchema.parse(job.payload || reminderIdeaEmail({ from, to: job.email, url: appUrl(), unsubscribe, theme: job.theme, variant: job.variant }));
    const { data: prepared, error } = await admin.rpc('prepare_reminder_idea', { p_id: job.id, p_lease: job.lease_token, p_payload: proposal });
    if (error) throw new Error('Reminder idea preparation failed');
    if (!prepared || !reminderIdeasReady()) continue;
    const payload = ideaPayloadSchema.parse(prepared);
    let status: 'accepted' | 'retry' | 'failed' = 'retry', providerId: string | null = null, code: string | null = null;
    try {
      const response = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(7000), headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'Idempotency-Key': 'keeply-idea/' + job.id }, body: JSON.stringify(payload) });
      if (response.ok) { providerId = z.object({ id: z.string() }).parse(await response.json()).id; status = 'accepted'; accepted++; }
      else { status = response.status === 429 || response.status >= 500 || response.status === 409 ? 'retry' : 'failed'; code = 'http_' + response.status; }
    } catch { code = 'provider_response_unknown'; }
    const { error: finishError } = await admin.rpc('finish_reminder_idea', { p_id: job.id, p_lease: job.lease_token, p_status: status, p_provider_id: providerId, p_error: code });
    if (finishError) throw new Error('Reminder idea acknowledgment failed');
  }
  return accepted;
}
