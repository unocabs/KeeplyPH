import { getSpendingCheckup } from '@/features/items/queries';
import { getUsage } from '@/features/purchases/queries';
import { requiredDate } from '@/features/items/validation';
import { uuidSchema } from '@/lib/validation';
import { spendingCategories, type CheckupFilter } from '@/features/premium/checkup';
import { SpendingCheckupView, SpendingCheckupInvitation } from '@/components/spending-checkup';

export const metadata={title:'30-Day Spending Checkup'};
export default async function CheckupPage({searchParams}:{searchParams:Promise<CheckupFilter>}) {
 const [query,usage]=await Promise.all([searchParams,getUsage()]);
 if(!usage.household_premium)return <SpendingCheckupInvitation/>;
 const cursor=requiredDate.safeParse(query.before).success&&uuidSchema.safeParse(query.id).success;
 const plan=await getSpendingCheckup({week:requiredDate.safeParse(query.week).success?query.week:undefined,
   category:spendingCategories.includes(query.category??'')?query.category:undefined,before:cursor?query.before:undefined,id:cursor?query.id:undefined});
 return plan?<SpendingCheckupView plan={plan} paged={cursor}/>:<SpendingCheckupInvitation/>;
}
