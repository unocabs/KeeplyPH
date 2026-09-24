import { UpgradeMetrics } from '@/components/upgrade-metrics';
import { Billing, type BillingOrder } from '@/components/billing';
import { getUsage } from '@/features/purchases/queries';
import { requireUser } from '@/lib/auth';
export const metadata = { title: 'Plan & billing' };
export default async function BillingPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const { supabase } = await requireUser();
  const [usage, { data, error }, query] = await Promise.all([getUsage(), supabase.rpc('get_billing_orders', {}), searchParams]);
  if (error) throw new Error('Unable to load billing history');
  return <><UpgradeMetrics/><Billing usage={usage} orders={data as unknown as BillingOrder[]} enabled={process.env.PAYMENTS_ENABLED === 'true'} returned={query.payment} testMode={process.env.PAYMONGO_MODE !== 'live'} /></>;
}
