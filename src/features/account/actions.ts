'use server';
import { safeAuthIntent } from '@/lib/auth-intent';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { serverClient } from '@/lib/supabase/server';
import { appUrl, isConfigured } from '@/lib/env';
import { type ActionResult } from '@/lib/domain';
import { errorMessage } from '@/lib/errors';
export async function signIn(form: FormData) {
  if (!isConfigured()) redirect('/login?setup=needed');
  const next = safeAuthIntent(String(form.get('next') || '/dashboard'));
  const supabase = await serverClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google', options: { redirectTo: appUrl() + '/auth/callback?next=' + encodeURIComponent(next), queryParams: { prompt: 'select_account' } },
  });
  if (error || !data.url) redirect('/login?error=signin');
  redirect(data.url);
}
export async function signOut() {
  const supabase = await serverClient();
  await supabase.auth.signOut();
  redirect('/login');
}
export async function updatePreferences(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const name = String(form.get('display_name') || '').trim();
  const timezone = String(form.get('timezone') || '');
  if (name.length > 160) return { error: 'Your name is too long.' };
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }); } catch { return { error: 'Choose a valid timezone.' }; }
  const { error } = await supabase.rpc('update_preferences', { p_name: name, p_timezone: timezone, p_email_enabled: form.get('email_reminders_enabled') === 'on' });
  if (error) return { error: errorMessage(error) };
  const { error: renewalError } = await supabase.rpc('update_renewal_preference', { p_enabled: form.get('renewal_emails_enabled') === 'on' });
  if (renewalError) return { error: errorMessage(renewalError) };
  const { error: analyticsError } = await supabase.rpc('update_analytics_preference', { p_enabled: form.get('analytics_enabled') === 'on' });
  if (analyticsError) return { error: errorMessage(analyticsError) };
  revalidatePath('/settings'); revalidatePath('/dashboard');
  return { success: 'Your preferences are saved.' };
}
export async function deleteAccount(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  if (form.get('confirmation') !== 'DELETE') return { error: 'Type DELETE to confirm.' };
  const { supabase } = await requireUser();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.last_sign_in_at || Date.now() - Date.parse(data.user.last_sign_in_at) > 600000) return { error: 'Sign out and sign in again before deleting your account. Then return here within 10 minutes.' };
  const { error } = await supabase.rpc('request_account_deletion', {});
  if (error) return { error: errorMessage(error) };
  await supabase.auth.signOut();
  redirect('/account-deleted');
}
