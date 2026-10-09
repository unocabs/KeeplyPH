import { getPaymentPlan, getPaymentActionContexts } from '@/features/items/queries';
import { requiredDate } from '@/features/items/validation';
import { uuidSchema } from '@/lib/validation';
import { HouseholdPaymentPlan } from '@/components/payment-plan';
export const metadata={title:'Payments to plan for'};
export default async function PaymentsPage({searchParams}:{searchParams:Promise<{before?:string;id?:string}>}) {
  const query=await searchParams,valid=requiredDate.safeParse(query.before).success&&uuidSchema.safeParse(query.id).success;
  const plan=await getPaymentPlan(valid?query.before:undefined,valid?query.id:undefined);
  return <HouseholdPaymentPlan key={valid?query.before+':'+query.id:'first'} plan={plan} contexts={await getPaymentActionContexts(plan)} paged={valid}/>;
}
