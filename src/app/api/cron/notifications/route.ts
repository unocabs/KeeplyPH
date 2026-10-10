import { deliverHouseholdEmails } from '@/lib/household-email-worker';
import { deliverReminderIdeas } from '@/lib/reminder-idea-worker';
import { deliverPushJobs } from '@/lib/push-worker';
import { pushReady } from '@/lib/web-push';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { appUrl } from '@/lib/env';
import { validCron } from '@/lib/security';
import { sendSms, smsReady } from '@/lib/sms';
import { reminderSms } from '@/lib/reminder-email';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!validCron(request)) return new Response('Unauthorized', { status: 401 });
  const started = Date.now();
  try {
    const admin = adminClient();
    const { error: recurrenceError } = await admin.rpc('advance_recurring_dates', {});
    if (recurrenceError) throw new Error('Recurring schedule advancement failed');
    if (process.env.EMAIL_DELIVERY_ENABLED !== 'true' && !smsReady() && !pushReady()) return Response.json({ skipped: 'Alert delivery is disabled' });
    let pushAccepted = 0;
    try { pushAccepted = await deliverPushJobs(started); } catch { console.error('push_worker_failed'); }
    let smsAccepted = 0;
    if (smsReady()) {
      try {
        const { data, error } = await admin.rpc('claim_sms_jobs', { p_limit: 2 });
        if (error) throw new Error('SMS claim failed');
        const jobs = z.array(z.object({ id: z.string().uuid(), lease_token: z.string().uuid(), phone: z.string(), expiration_date: z.string(), product_name: z.string(), purchase_id: z.string().uuid(), date_id: z.string().uuid(), kind: z.string(), date_kind: z.string() })).parse(data);
        for (const job of jobs) {
          if (Date.now() - started > 40000) break;
          const message = reminderSms({ product: job.product_name, kind: job.kind, dateKind: job.date_kind, expires: job.expiration_date, purchaseId: job.purchase_id, url: appUrl() });
          const { data: prepared, error } = await admin.rpc('prepare_sms', { p_id: job.id, p_lease: job.lease_token });
          if (error) throw new Error('SMS preparation failed');
          if (!prepared) continue;
          const result = await sendSms(job.phone, message);
          const { error: finishError } = await admin.rpc('finish_sms', { p_id: job.id, p_lease: job.lease_token, p_status: result.status, p_provider_id: result.providerId, p_error: result.error });
          if (finishError) throw new Error('SMS acknowledgment failed');
          if (result.status === 'accepted') smsAccepted++;
        }
      } catch { console.error('sms_worker_failed'); }
    }
    if (process.env.EMAIL_DELIVERY_ENABLED !== 'true') return Response.json({ smsAccepted, pushAccepted });
    const accepted=await deliverHouseholdEmails(started);
    // Finish important messages first and leave spacing before an optional suggestion send.
    let ideasAccepted = 0;
    try { ideasAccepted = await deliverReminderIdeas(started); } catch { console.error('reminder_idea_worker_failed'); }
    return Response.json({ accepted, smsAccepted, pushAccepted, ideasAccepted });
  } catch { console.error('notification_worker_failed'); return new Response('Retry later', { status: 500 }); }
}
