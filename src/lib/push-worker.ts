import 'server-only';
import { z } from 'zod';
import { adminClient } from './supabase/admin';
import { pushReady, sendWebPush, reminderPush, pushTtl } from './web-push';
const jobsSchema = z.array(z.object({ id: z.string().uuid(), lease_token: z.string().uuid() }));
const preparedSchema = z.object({ id: z.string().uuid(), endpoint: z.string(), keys: z.object({ p256dh: z.string(), auth: z.string() }), itemId: z.string().uuid(), dateId: z.string().uuid(), product: z.string(), kind: z.string(), dueOn: z.string(), timezone: z.string() });
export async function deliverPushJobs(started: number): Promise<number> {
  if (!pushReady() || Date.now() - started > 35000) return 0;
  const admin = adminClient();
  const { data, error } = await admin.rpc('claim_push_jobs', { p_limit: 2 });
  if (error) throw new Error('Push claim failed');
  let accepted = 0;
  for (const job of jobsSchema.parse(data)) {
    if (Date.now() - started > 40000) break;
    const { data: prepared, error: prepareError } = await admin.rpc('prepare_push_job', { p_id: job.id, p_lease: job.lease_token });
    if (prepareError) throw new Error('Push preparation failed');
    if (!prepared) continue;
    const value = preparedSchema.parse(prepared);
    const ttl = pushTtl(value.dueOn, value.timezone);
    const result = ttl > 0 ? await sendWebPush(value, reminderPush(value), ttl) : { status: 'failed' as const, error: 'date_elapsed' };
    const { error: finishError } = await admin.rpc('finish_push_job', { p_id: job.id, p_lease: job.lease_token, p_status: result.status, p_error: result.error });
    if (finishError) throw new Error('Push acknowledgment failed');
    if (result.status === 'expired') {
      const { error: expireError } = await admin.rpc('expire_push_subscription', { p_endpoint: value.endpoint, p_auth: value.keys.auth });
      if (expireError) throw new Error('Push subscription cleanup failed');
    }
    if (result.status === 'accepted') accepted++;
  }
  return accepted;
}
