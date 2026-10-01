import { renewalEmail } from '@/lib/renewal-email';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { appUrl, requireEnv } from '@/lib/env';
import { validCron } from '@/lib/security';
import { sendSms, smsReady } from '@/lib/sms';
import { reminderSms } from '@/lib/reminder-email';
import { dateReminderEmail } from '@/lib/reminder-email';
export const runtime = 'nodejs';
export const maxDuration = 60;
const jobSchema = z.array(z.object({ id: z.string().uuid(), lease_token: z.string().uuid(), expiration_date: z.string(), product_name: z.string().optional(), kind: z.string().optional(), purchase_id: z.string().uuid().optional(), renewal_kind: z.enum(['before','expired']).optional(), date_id: z.string().uuid().optional(), date_kind: z.string().optional(), recurrence_months: z.number().nullable().optional(), recurrence_anchor: z.string().nullable().optional(), recurrence_ends_on: z.string().nullable().optional(), payment_amount_minor: z.number().nullable().optional(), email: z.string().email(), payload: z.unknown().nullable() }));
const payloadSchema = z.object({ from: z.string(), to: z.string().email(), subject: z.string(), text: z.string(), html: z.string() });
export async function POST(request: Request) {
  if (!validCron(request)) return new Response('Unauthorized', { status: 401 });
  const started = Date.now();
  try {
    const admin = adminClient();
    const { error: recurrenceError } = await admin.rpc('advance_recurring_dates', {});
    if (recurrenceError) throw new Error('Recurring schedule advancement failed');
    if (process.env.EMAIL_DELIVERY_ENABLED !== 'true' && !smsReady()) return Response.json({ skipped: 'Alert delivery is disabled' });
    let smsAccepted = 0;
    if (smsReady()) {
      try {
        const { data, error } = await admin.rpc('claim_sms_jobs', { p_limit: 2 });
        if (error) throw new Error('SMS claim failed');
        const jobs = z.array(z.object({ id: z.string().uuid(), lease_token: z.string().uuid(), phone: z.string(), expiration_date: z.string(), product_name: z.string(), purchase_id: z.string().uuid(), date_id: z.string().uuid(), kind: z.string(), date_kind: z.string() })).parse(data);
        for (const job of jobs) {
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
    if (process.env.EMAIL_DELIVERY_ENABLED !== 'true') return Response.json({ smsAccepted });
    const apiKey = requireEnv('RESEND_API_KEY'), from = requireEnv('EMAIL_FROM');
    // Two SMS and three email messages fit within the function duration with provider timeouts.
    const { data, error } = await admin.rpc('claim_notification_jobs', { p_limit: 2, p_daily_limit: 90 });
    if (error) throw new Error('Claim failed');
    const {data:renewals,error:renewalError}=await admin.rpc('claim_renewal_jobs',{p_limit:1});
    if(renewalError)throw new Error('Renewal claim failed');
    const jobs = jobSchema.parse([...(Array.isArray(data)?data:[]),...(Array.isArray(renewals)?renewals:[])]);
    let accepted = 0, deferred = 0;
    for (const job of jobs) {
      if (Date.now() - started > 40000) { deferred++; continue; } // Unused leases are recovered by the next run.
      const proposal = job.payload || (job.renewal_kind ? renewalEmail({from,to:job.email,expires:job.expiration_date,expired:job.renewal_kind==='expired',url:appUrl()}) : dateReminderEmail({ from, to: job.email, product: job.product_name!, kind: job.kind!, expires: job.expiration_date, purchaseId: job.purchase_id!, dateId: job.date_id, dateKind: job.date_kind, recurrenceMonths: job.recurrence_months, recurrenceAnchor: job.recurrence_anchor, recurrenceEndsOn: job.recurrence_ends_on, paymentAmountMinor: job.payment_amount_minor, url: appUrl() }));
      const { data: prepared, error: prepareError } = await admin.rpc(job.renewal_kind ? 'prepare_renewal' : 'prepare_notification', { p_id: job.id, p_lease: job.lease_token, p_payload: payloadSchema.parse(proposal) });
      if (prepareError) throw new Error('Preparation failed');
      if (!prepared) continue;
      const payload = payloadSchema.parse(prepared);
      let status: 'accepted' | 'retry' | 'failed' = 'retry', providerId: string | null = null, code: string | null = null;
      try {
        // Fetch gives the serverless worker an explicit timeout. Same payload/key on every retry.
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST', signal: AbortSignal.timeout(7000),
          headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'Idempotency-Key': 'keeply-reminder/' + job.id },
          body: JSON.stringify(payload),
        });
        if (response.ok) { const result = z.object({ id: z.string() }).parse(await response.json()); providerId = result.id; status = 'accepted'; accepted++; }
        else { status = response.status === 429 || response.status >= 500 || response.status === 409 ? 'retry' : 'failed'; code = 'http_' + response.status; }
      } catch { code = 'provider_response_unknown'; }
      const { error: finishError } = await admin.rpc('finish_notification', { p_id: job.id, p_lease: job.lease_token, p_status: status, p_provider_id: providerId, p_error: code });
      if (finishError) throw new Error('Acknowledgment failed');
      // Stay below Resend's default two requests per second.
      await new Promise(resolve => setTimeout(resolve, 600));
    }
    return Response.json({ claimed: jobs.length, accepted, smsAccepted, deferred });
  } catch { console.error('notification_worker_failed'); return new Response('Retry later', { status: 500 }); }
}
