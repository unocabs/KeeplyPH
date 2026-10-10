import { Billing, type BillingOrder } from '@/components/billing';
import { getUsage } from '@/features/purchases/queries';
import { requireUser } from '@/lib/auth';
import { supportEmail } from '@/lib/env';
import { configuredPaymentMethods } from '@/lib/paymongo';
export const metadata={title:'Plan & billing'};
export default async function BillingPage({searchParams}:{searchParams:Promise<{payment?:string;order?:string}>}) {
 const {supabase,profile}=await requireUser();const [usage,{data,error},query]=await Promise.all([getUsage(),supabase.rpc('get_billing_orders',{}),searchParams]);
 if(error)throw new Error('Unable to load billing history');
 const premiumUntilLabel=usage.household_premium_until?new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:profile.timezone}).format(new Date(usage.household_premium_until)):undefined;
 const orders=data as unknown as BillingOrder[],pendingOrderId=orders.find(entry=>entry.can_resume)?.id;
 return <Billing usage={usage} premiumUntilLabel={premiumUntilLabel} orders={orders} pendingOrderId={pendingOrderId} enabled={process.env.PAYMENTS_ENABLED==='true'&&process.env.PREMIUM_PAYMENTS_ENABLED==='true'&&configuredPaymentMethods().length>0} returned={query.payment} returnedOrderId={query.order} support={supportEmail()} timezone={profile.timezone} testMode={process.env.PAYMONGO_MODE!=='live'}/>;
}
