import { Dashboard } from '@/components/dashboard';
import { requireUser } from '@/lib/auth';
import { getUsage } from '@/features/purchases/queries';
import { getDashboardItems } from '@/features/items/queries';
import { todayIn } from '@/lib/domain';
export const metadata = { title: 'Overview' };
export default async function DashboardPage() {
  const { profile } = await requireUser();
  const [items, usage] = await Promise.all([getDashboardItems(), getUsage()]);
  return <Dashboard items={items} usage={usage} name={profile.display_name} today={todayIn(profile.timezone)} />;
}
