import { pushPublicKey } from '@/lib/web-push';
import { requireUser } from '@/lib/auth';
import { AlertOptions } from '@/components/alert-options';
import { InstallSetup } from '@/components/install-setup';
import { getUsage } from '@/features/purchases/queries';
export const metadata = { title: 'Alert Options' };
export default async function AlertOptionsPage() {
  const [{ profile, userId }, usage] = await Promise.all([requireUser(), getUsage()]);
  return <><div className="page-heading"><div><h1>Alert Options</h1><p>A helpful nudge, wherever you prefer.</p></div></div><InstallSetup publicKey={pushPublicKey()} accountId={userId} claimed={usage.installation_premium_claimed} /><section className="panel narrow-form"><AlertOptions key={profile.updated_at + String(profile.phone_verified_at)} initial={profile} pushPublicKey={pushPublicKey()} rewardClaimed={usage.installation_premium_claimed}/>{profile.email_delivery_blocked && <p className="alert error spaced">Email delivery is paused after a bounce or complaint. Contact support to restore it.</p>}</section></>;
}
