import { getPaymentPlan } from '@/features/items/queries';
import { requiredDate } from '@/features/items/validation';
import { uuidSchema } from '@/lib/validation';
import { HouseholdPaymentPlan } from '@/components/payment-plan';
export const metadata={title:'Payments to plan for'};
export default async function PaymentsPage({searchParams}:{searchParams:Promise<{before?:string;id?:string}>}) {
  const query=await searchParams,valid=requiredDate.safeParse(query.before).success&&uuidSchema.safeParse(query.id).success;
  return <HouseholdPaymentPlan plan={await getPaymentPlan(valid?query.before:undefined,valid?query.id:undefined)} paged={valid}/>;
}
