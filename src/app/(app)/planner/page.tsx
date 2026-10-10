import { getHouseholdPlanner, getHouseholdOutlook } from '@/features/items/queries';
import { getUsage } from '@/features/purchases/queries';
import { requiredDate } from '@/features/items/validation';
import { uuidSchema } from '@/lib/validation';
import { plannerHorizon } from '@/features/premium/planner';
import { HouseholdPlannerView } from '@/components/household-planner';
export const metadata={title:'Household Outlook'};
export default async function PlannerPage({searchParams}:{searchParams:Promise<{days?:string;month?:string;before?:string;id?:string}>}) {
 const [query,usage]=await Promise.all([searchParams,getUsage()]);
 const requested=plannerHorizon(query.days),days=requested>30&&!usage.household_premium?30:requested;
 const month=requested===days&&/^\d{4}-\d{2}-01$/.test(query.month||'')&&requiredDate.safeParse(query.month).success?query.month:undefined;
 const valid=requested===days&&requiredDate.safeParse(query.before).success&&uuidSchema.safeParse(query.id).success;
 const outlook=usage.household_premium?await getHouseholdOutlook(days,month,valid?query.before:undefined,valid?query.id:undefined):null;
 const plan=outlook??await getHouseholdPlanner(30,usage.household_premium?undefined:month,usage.household_premium?undefined:valid?query.before:undefined,usage.household_premium?undefined:valid?query.id:undefined);
 const selectedMonth=outlook?.month??(outlook?undefined:usage.household_premium?undefined:month);
 return <HouseholdPlannerView usage={usage} requestedDays={requested} key={plan.days+':'+selectedMonth+':'+query.before} plan={plan} premium={Boolean(outlook)} month={selectedMonth||undefined} before={valid?query.before:undefined}/>;
}
