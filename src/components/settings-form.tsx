'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { updatePreferences, deleteAccount } from '@/features/account/actions';
import type { ActionResult, Profile } from '@/lib/domain';
export function SettingsForm({ profile, demo = false }: { profile: Profile; demo?: boolean }) {
  const previewAction = async (): Promise<ActionResult> => ({ success: 'Sample preference updated for this preview only. Sign in to save your preferences.' });
  const [state, action, pending] = useActionState(demo ? previewAction : updatePreferences, {});
  const [deletion, deleteAction, deleting] = useActionState(deleteAccount, {});
  const zones = [...new Set([profile.timezone, 'Asia/Manila', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'UTC'])];
  return <><section className="panel"><h2>Your preferences</h2><p className="section-description">A few details to make Keeply feel like yours.</p><form action={action} className="settings-form spaced">
    <label>Your name<input name="display_name" defaultValue={profile.display_name} maxLength={160} autoComplete="name" /></label>
    <label>Timezone<select name="timezone" defaultValue={profile.timezone}>{zones.map(z => <option key={z}>{z}</option>)}</select></label>
    <Link href={(demo ? '/demo' : '') + '/settings/alerts'} className="button secondary">Alert Options →</Link>
    <p className="hint">Manage email alerts in Alert Options. SMS is coming soon.</p>
    <label className="checkbox-row"><input name="renewal_emails_enabled" type="checkbox" defaultChecked={profile.renewal_emails_enabled !== false} /><span><strong>Remind me to renew my extra slots</strong><p>One email before the 30-day pack expires and one at expiry. No automatic charges.</p></span></label>
    <label className="checkbox-row"><input name="analytics_enabled" type="checkbox" defaultChecked={profile.analytics_enabled || false}/><span><strong>Help improve Keeply (optional)</strong><p>Share counts of saves, alert opt-ins and completions. No names, document contents or due dates. Raw events expire after 90 days; turning this off removes your linked events.</p></span></label>
    {profile.email_delivery_blocked && <p className="alert error">Email delivery is paused after a bounced email or complaint. Contact support before re-enabling delivery.</p>}
    {state.error && <p className="alert error" role="alert">{state.error}</p>}{state.success && <p className="alert success" role="status">{state.success}</p>}
    <button className="button primary" disabled={pending}>{pending ? 'Saving…' : 'Save preferences'}</button>
  </form></section>
  <details className="danger-zone"><summary>Delete your account</summary><p>This permanently removes your reminders, files, and account. Access is revoked immediately; file cleanup completes in the background. Payment records needed for accounting may be retained without your account link.</p>
    {demo ? <Link href="/login" className="text-button">Sign in to manage your account →</Link> : <form action={deleteAction} className="settings-form"><label>Type DELETE to confirm<input name="confirmation" autoComplete="off" required pattern="DELETE" /></label><p className="hint">For your security, sign out and sign in again within 10 minutes of requesting deletion.</p>{deletion.error && <p className="alert error" role="alert">{deletion.error}</p>}<button className="button danger" disabled={deleting}>{deleting ? 'Requesting deletion…' : 'Permanently delete account'}</button></form>}
  </details></>;
}
