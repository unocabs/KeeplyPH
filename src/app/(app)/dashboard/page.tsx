import { Dashboard } from '@/components/dashboard';
import { requireUser } from '@/lib/auth';
import { getUsage } from '@/features/purchases/queries';
import { getDashboardItems, getUnconfirmedSummary, getHouseholdInsights } from '@/features/items/queries';
import { todayIn } from '@/lib/domain';
import { InstallSetup } from '@/components/install-setup';
import { pushPublicKey } from '@/lib/web-push';
export const metadata = { title: 'Overview' };
export default async function DashboardPage() {
  const { profile, userId } = await requireUser();
  const [items, usage, unconfirmed, insights] = await Promise.all([getDashboardItems(), getUsage(), getUnconfirmedSummary(), getHouseholdInsights()]);
  return <Dashboard items={items} usage={usage} unconfirmed={unconfirmed} insights={insights} name={profile.display_name} today={todayIn(profile.timezone)} setup={<InstallSetup publicKey={pushPublicKey()} accountId={userId} claimed={usage.install_reward_claimed} dashboard />} />;
}
