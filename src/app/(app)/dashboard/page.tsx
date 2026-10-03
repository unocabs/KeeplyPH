import { Dashboard } from '@/components/dashboard';
import { requireUser } from '@/lib/auth';
import { getUsage } from '@/features/purchases/queries';
import { getDashboardItems } from '@/features/items/queries';
import { todayIn } from '@/lib/domain';
import { InstallSetup } from '@/components/install-setup';
import { pushPublicKey } from '@/lib/web-push';
export const metadata = { title: 'Overview' };
export default async function DashboardPage() {
  const { profile, userId } = await requireUser();
  const [items, usage] = await Promise.all([getDashboardItems(), getUsage()]);
  return <Dashboard items={items} usage={usage} name={profile.display_name} today={todayIn(profile.timezone)} setup={<InstallSetup publicKey={pushPublicKey()} accountId={userId} claimed={usage.install_reward_claimed} dashboard />} />;
}
