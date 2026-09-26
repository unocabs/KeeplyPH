import { AppShell } from '@/components/app-shell';
import { requireUser } from '@/lib/auth';
import { getUsage } from '@/features/purchases/queries';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';
import { FeedbackForm } from '@/components/feedback-form';
import { feedbackStatusSchema } from '@/features/feedback/schema';
import { isConfigured } from '@/lib/env';
export const metadata = { title: 'Add feedback', robots: { index: false, follow: false } };
export default async function FeedbackPage() {
  if (!isConfigured()) redirect('/login?next=/feedback');
  const supabase = await serverClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims.sub) redirect('/login?next=/feedback');
  const { data, error } = await supabase.rpc('feedback_status', {});
  const [{ profile }, usage] = await Promise.all([requireUser(), getUsage()]);
  return <AppShell name={profile.display_name} hasExtraSlots={(usage.slot_limit ?? 3) > 3}><div className="page-heading"><div><h1>Add feedback</h1><p>Help shape a calmer, more useful Keeply.</p></div></div>{error ? <section className="panel"><h2>Feedback is temporarily unavailable.</h2><p className="section-description">Please try again shortly. Your existing items and reminder slots are unchanged.</p></section> : <FeedbackForm submissionId={randomUUID()} initialStatus={feedbackStatusSchema.parse(data)}/>}</AppShell>;
}
