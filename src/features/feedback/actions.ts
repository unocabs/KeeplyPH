'use server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { appUrl } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { feedbackInputSchema, feedbackStatusSchema, type FeedbackResult } from './schema';

export async function submitFeedback(_previous: FeedbackResult, form: FormData): Promise<FeedbackResult> {
  if ((await headers()).get('origin') !== appUrl()) return { error: 'Please submit feedback from Keeply.' };
  const { supabase } = await requireUser();
  const parsed = feedbackInputSchema.safeParse({ id: form.get('id'), kind: form.get('kind'), summary: form.get('summary'), notes: form.get('notes') || '' });
  if (!parsed.success) return { error: 'Choose a type, add a 5–120 character summary, and keep notes within 2,000 characters.' };
  const { id, kind, summary, notes } = parsed.data;
  const { data, error } = await supabase.rpc('submit_feedback', {
    p_id: id, p_kind: kind, p_summary: summary, p_notes: notes, p_expect_reward: form.get('expect_reward') === 'true',
  });
  if (error) {
    if (error.message.includes('FEEDBACK_OFFER_CHANGED')) {
      const result = await supabase.rpc('feedback_status', {});
      const status = feedbackStatusSchema.safeParse(result.data);
      return { error: 'Your reward eligibility changed. Review the updated offer, then submit again.', status: status.success ? status.data : undefined };
    }
    if (error.message.includes('FEEDBACK_NOTES_REQUIRED')) return { error: 'Please add at least 30 characters of notes for your one-time reward.' };
    if (error.message.includes('FEEDBACK_REPLAY_CONFLICT')) return { error: 'This submission was already saved. Reload to start a new feedback submission.' };
    if (error.message.includes('RATE_LIMITED')) return { error: 'You can send up to five submissions per day. Please try again tomorrow.' };
    return { error: errorMessage(error, 'We couldn’t save your feedback. Your text is still here; please try again.') };
  }
  const status = feedbackStatusSchema.parse(data);
  const rewarded = typeof data === 'object' && data !== null && 'reward_granted' in data && data.reward_granted === true;
  revalidatePath('/', 'layout');
  return { status, success: rewarded ? 'Thank you! Your feedback is saved and your 30-day reward has been added.' : 'Thank you! Your feedback is saved.' };
}
