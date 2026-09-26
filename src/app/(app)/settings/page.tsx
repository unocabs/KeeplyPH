import Link from 'next/link';
import { SettingsForm } from '@/components/settings-form';
import { requireUser } from '@/lib/auth';
import { getUsage } from '@/features/purchases/queries';
export const metadata = { title: 'Settings' };
export default async function SettingsPage() {
  const [{ profile }, usage] = await Promise.all([requireUser(), getUsage()]);
  return <><div className="page-heading"><div><h1>Make yourself at home.</h1><p>Your account, preferences, and a little peace of mind.</p></div></div><div className="settings-grid"><div><SettingsForm profile={profile} /></div><aside className="panel plan-card"><h3>Your plan</h3><div className="plan-price">{usage.slot_limit??3} slots</div><p className="hint">{usage.purchases} saved reminders · {usage.reminders} covered reminders</p><Link href="/settings/billing" className="button secondary wide spaced">Manage plan & billing</Link></aside></div></>;
}
