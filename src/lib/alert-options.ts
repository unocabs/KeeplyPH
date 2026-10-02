// SMS is postponed. Re-enable only as part of a deliberate launch.
export const SMS_LAUNCH_ENABLED = false;
/** Keep SMS domestic for the launch provider; accept familiar PH formatting. */
export function normalizePhone(value: string): string | null {
  const compact = value.trim().replace(/[\s()-]/g, '');
  const number = compact.startsWith('09') ? '+63' + compact.slice(1) : compact.startsWith('639') ? '+' + compact : compact;
  return /^\+639\d{9}$/.test(number) ? number : null;
}
export interface AlertPreferences {
  email_reminders_enabled: boolean;
  push_reminders_enabled?: boolean;
  push_subscription_count?: number;
  phone_number?: string | null;
  phone_verified_at?: string | null;
  sms_reminders_enabled?: boolean;
  phone_prompt_dismissed?: boolean;
}
export function alertsPaused(profile: AlertPreferences & { email_delivery_blocked: boolean }) {
  return !(profile.email_reminders_enabled && !profile.email_delivery_blocked) && !(profile.push_reminders_enabled && (profile.push_subscription_count || 0) > 0) && !(SMS_LAUNCH_ENABLED && profile.sms_reminders_enabled && profile.phone_verified_at);
}
export const SMS_MONTHLY_LIMIT = 30;
