import { UpgradeMetrics } from '@/components/upgrade-metrics';
import { Billing, type BillingOrder, type BillingCoverageItem } from '@/components/billing';
import { getUsage } from '@/features/purchases/queries';
import { requireUser } from '@/lib/auth';
import { supportEmail } from '@/lib/env';
import { configuredPaymentMethods } from '@/lib/paymongo';
import { isProduct, isSlotCount } from '@/features/billing/products';
export const metadata = { title: 'Plan & billing' };
export default async function BillingPage({ searchParams }: { searchParams: Promise<{ payment?: string; order?: string; slots?: string; product?: string }> }) {
  const { supabase, userId } = await requireUser();
  const [usage, { data, error }, query] = await Promise.all([getUsage(), supabase.rpc('get_billing_orders', {}), searchParams]);
  if (error) throw new Error('Unable to load billing history');
  const { data: freeCoverage, error: coverageError } = await supabase.from('items').select('id,product_name').eq('user_id', userId).eq('state', 'saved').is('archived_at', null).not('coverage_requested_at', 'is', null).order('coverage_requested_at', { ascending: true }).order('id', { ascending: true }).limit(3 + (usage.bonus_slots ?? 0));
  if (coverageError) throw new Error('Unable to load your free alert coverage');
  const methods = configuredPaymentMethods();
  const slots = Number(query.slots);
  return <><UpgradeMetrics/><Billing usage={usage} orders={data as unknown as BillingOrder[]} freeCoverage={freeCoverage as BillingCoverageItem[]} enabled={process.env.PAYMENTS_ENABLED === 'true' && methods.length > 0} returned={query.payment} returnedOrderId={query.order} methods={methods} support={supportEmail()} testMode={process.env.PAYMONGO_MODE !== 'live'} checkoutSlots={isSlotCount(slots) ? slots : undefined} preferredProduct={query.product && isProduct(query.product) ? query.product : undefined} /></>;
}
