import { requireUser } from '@/lib/auth';
import { AlertOptions } from '@/components/alert-options';
export const metadata = { title: 'Alert Options' };
export default async function AlertOptionsPage() {
  const { profile } = await requireUser();
  return <><div className="page-heading"><div><h1>Alert Options</h1><p>A helpful nudge, wherever you prefer.</p></div></div><section className="panel narrow-form"><AlertOptions key={profile.updated_at + String(profile.phone_verified_at)} initial={profile}/>{profile.email_delivery_blocked && <p className="alert error spaced">Email delivery is paused after a bounce or complaint. Contact support to restore it.</p>}</section></>;
}
