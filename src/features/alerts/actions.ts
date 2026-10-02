'use server';
import { createHmac, randomInt } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { requireEnv } from '@/lib/env';
import { SMS_LAUNCH_ENABLED, normalizePhone, type AlertPreferences } from '@/lib/alert-options';
import { sendSms, smsReady } from '@/lib/sms';
import type { ActionResult } from '@/lib/domain';
export async function getAlertPreferences(): Promise<AlertPreferences & { available: boolean }> {
  const { profile } = await requireUser();
  return { email_reminders_enabled: profile.email_reminders_enabled, phone_number: profile.phone_number, phone_verified_at: profile.phone_verified_at, sms_reminders_enabled: profile.sms_reminders_enabled, phone_prompt_dismissed: profile.phone_prompt_dismissed, available: smsReady() };
}
function refresh() { revalidatePath('/settings', 'layout'); revalidatePath('/items', 'layout'); revalidatePath('/dashboard'); }
export async function saveAlertPreferences(phone: string, sms: boolean, email: boolean): Promise<ActionResult> {
  if (!SMS_LAUNCH_ENABLED && (sms || phone.trim())) return { error: 'SMS is coming soon. Email alerts are available now.' };
  const normalized = phone.trim() ? normalizePhone(phone) : null;
  if (phone.trim() && !normalized) return { error: 'Enter a Philippine mobile number, such as 0917 123 4567.' };
  if (sms && !normalized) return { error: 'Add a mobile number to receive SMS.' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('update_alert_preferences', { p_phone: normalized, p_sms: sms, p_email: email });
  if (error) return { error: 'Unable to save alert options. Please try again.' };
  refresh(); return { success: 'Alert options saved.' };
}
export async function dismissPhonePrompt(): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('dismiss_phone_prompt', {});
  return error ? { error: 'Unable to remember your choice. Please try again.' } : { success: 'You can add SMS anytime in Alert Options.' };
}
function digest(user: string, phone: string, code: string) {
  return createHmac('sha256', requireEnv('SMS_VERIFICATION_SECRET')).update(user + '/' + phone + '/' + code).digest('hex');
}
export async function requestPhoneVerification(): Promise<ActionResult> {
  const { userId, profile } = await requireUser();
  if (!smsReady()) return { error: 'SMS setup is not available yet. Your number is saved. Email alerts continue if enabled.' };
  if (!profile.phone_number || !profile.sms_reminders_enabled) return { error: 'Save your number and select SMS first.' };
  const code = String(randomInt(100000, 1000000));
  const { error } = await adminClient().rpc('begin_phone_verification', { p_user: userId, p_phone: profile.phone_number, p_hash: digest(userId, profile.phone_number, code) });
  if (error) return { error: 'Please wait before requesting another code. Verification requests are limited.' };
  const result = await sendSms(profile.phone_number, 'Keeply: Your verification code is ' + code + '. Expires in 10 minutes. Do not share it.');
  return result.status === 'accepted' ? { success: 'Code sent. Check your phone.' } : { error: 'We could not confirm the code was sent. Please wait a minute before trying again.' };
}
export async function verifyPhone(code: string): Promise<ActionResult> {
  if (!smsReady()) return { error: 'SMS is coming soon. Phone verification is not available yet.' };
  const { userId, profile } = await requireUser();
  if (!/^\d{6}$/.test(code) || !profile.phone_number) return { error: 'Enter the six-digit code.' };
  const { data, error } = await adminClient().rpc('verify_alert_phone', { p_user: userId, p_hash: digest(userId, profile.phone_number, code) });
  if (error || data !== true) return { error: 'That code is incorrect or has expired. Request a new code if needed.' };
  refresh(); return { success: 'Phone verified. SMS alerts are ready.' };
}

/** Email preferences remain usable without activating SMS or collecting a phone number. */
export async function saveEmailAlertPreference(email: boolean): Promise<ActionResult> {
  if (typeof email !== 'boolean') return { error: 'Choose a valid email preference.' };
  const { supabase, profile } = await requireUser();
  const { error } = await supabase.rpc('update_preferences', { p_name: profile.display_name, p_timezone: profile.timezone, p_email_enabled: email });
  if (error) return { error: 'Unable to save alert options. Please try again.' };
  refresh(); return { success: 'Alert options saved.' };
}

/** Save independent deadline and discovery preferences atomically. */
export async function saveEmailPreferences(email: boolean, suggestions: boolean): Promise<ActionResult> {
  if (typeof email !== 'boolean' || typeof suggestions !== 'boolean') return { error: 'Choose valid email preferences.' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('update_email_preferences', { p_email: email, p_suggestions: suggestions });
  if (error) return { error: 'Unable to save email preferences. Please try again.' };
  refresh(); return { success: 'Email preferences saved.' };
}
