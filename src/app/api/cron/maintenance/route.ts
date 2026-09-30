import { reconcilePayments } from '@/features/billing/reconciliation';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { validCron } from '@/lib/security';
export const runtime = 'nodejs';
export const maxDuration = 60;
const workSchema = z.object({ objects: z.array(z.object({ id: z.string().uuid(), bucket: z.enum(['upload-staging', 'purchase-documents']), object_key: z.string() })), accounts: z.array(z.string().uuid()), billing_reviews: z.number(), unknown_notifications: z.number() });
export async function POST(request: Request) {
  if (!validCron(request)) return new Response('Unauthorized', { status: 401 });
  const started = Date.now();
  try {
    const admin = adminClient();
    const { error: recurrenceError } = await admin.rpc('advance_recurring_dates', {});
    if (recurrenceError) throw new Error('Recurring schedule advancement failed');
    if(process.env.PAYMENTS_ENABLED==='true') await reconcilePayments(started);
    const { data, error } = await admin.rpc('run_maintenance', {});
    if (error) throw new Error('Maintenance failed');
    const work = workSchema.parse(data);
    const { error: feedbackError } = await admin.rpc('purge_old_feedback', {});
    if (feedbackError) throw new Error('Feedback retention failed');
    let removed = 0, accounts = 0;
    for (const object of work.objects) {
      if (Date.now() - started > 40000) break;
      const { error: removalError } = await admin.storage.from(object.bucket).remove([object.object_key]);
      const { error: recordError } = await admin.rpc('complete_object_deletion', { p_id: object.id, p_success: !removalError });
      if (recordError) throw new Error('Cleanup acknowledgment failed');
      if (!removalError) removed++;
    }
    for (const userId of work.accounts) {
      if (Date.now() - started > 45000) break;
      const { error: deletionError } = await admin.auth.admin.deleteUser(userId);
      if (!deletionError || deletionError.code === 'user_not_found') {
        const { error: completionError } = await admin.rpc('complete_account_deletion', { p_user_id: userId });
        if (completionError) throw new Error('Account acknowledgment failed');
        accounts++;
      }
    }
    if (work.billing_reviews || work.unknown_notifications) console.warn('keeply_operations_attention', { billingReviews: work.billing_reviews, unknownNotifications: work.unknown_notifications });
    return Response.json({ removed, accounts, billing_reviews: work.billing_reviews, unknown_notifications: work.unknown_notifications });
  } catch { console.error('maintenance_worker_failed'); return new Response('Retry later', { status: 500 }); }
}
