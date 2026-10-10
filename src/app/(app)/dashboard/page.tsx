import {getPremiumMeasurementContext} from '@/features/premium/queries';
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
  const [items, usage, unconfirmed, insights,measurement] = await Promise.all([getDashboardItems(), getUsage(), getUnconfirmedSummary(), getHouseholdInsights(),getPremiumMeasurementContext()]);
  return <Dashboard discoveryVariant={measurement.variant} accountId={userId} items={items} usage={usage} unconfirmed={unconfirmed} insights={insights} name={profile.display_name} today={todayIn(profile.timezone)} setup={<InstallSetup publicKey={pushPublicKey()} accountId={userId} claimed={usage.installation_premium_claimed} dashboard />} />;
}
