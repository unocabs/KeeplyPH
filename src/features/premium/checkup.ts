import { addDays, sampleHouseholdPlanningRows } from '@/features/items/planning';
import { paymentTotal, type PaymentPlan, type PlannedPayment } from '@/features/items/insights';
import type { ItemWithDetails } from '@/features/items/domain';
import { reminderCategories } from '@/features/templates/categories';

export interface SpendingGroup {
  total:number; known_count:number; positive_count:number; unset_count:number;
  total_minor:string; estimated_minor:string;
}
export interface SpendingPeriod extends SpendingGroup { starts_on:string; ends_on:string }
export interface SpendingCategory extends SpendingGroup { category:string }
export interface CheckupRow extends PlannedPayment { reporting_category:string }
export interface SpendingCheckup extends Omit<PaymentPlan,'rows'> {
  weeks:SpendingPeriod[]; categories:SpendingCategory[]; rows:CheckupRow[];
  filtered_total:number; week:string|null; category:string|null;
  source_count:number; positive_source_count:number;
}
export interface CheckupFilter { week?:string; category?:string; before?:string; id?:string }
export const spendingCategories=reminderCategories.map(group=>group.key);
export function spendingCategoryLabel(category:string) {
  return reminderCategories.find(group=>group.key===category)?.label ?? 'Other important dates';
}
/** Percentages use exact minor units, rounded only for display. */
export function spendingShare(amount:string,total:string):string|null {
  const numerator=BigInt(amount),denominator=BigInt(total);
  if(denominator<=0n)return null;
  const tenths=(numerator*1000n+denominator/2n)/denominator;
  if(numerator>0n&&tenths===0n)return '<0.1%';
  if(numerator<denominator&&tenths===1000n)return '>99.9%';
  return `${tenths/10n}${tenths%10n?'.'+tenths%10n:''}%`;
}
export function checkupInsights(plan:SpendingCheckup) {
  const positive=plan.weeks.reduce((sum,week)=>sum+week.positive_count,0);
  if(positive<2||plan.positive_source_count<2||BigInt(paymentTotal(plan))===0n)return null;
  const ranked=[...plan.weeks].filter(week=>BigInt(week.total_minor)>0n).sort((a,b)=>BigInt(a.total_minor)===BigInt(b.total_minor)?a.starts_on.localeCompare(b.starts_on):BigInt(a.total_minor)>BigInt(b.total_minor)?-1:1);
  const highest=ranked[0],ties=ranked.filter(week=>week.total_minor===highest.total_minor).length;
  return {highest,ties,only_period:ranked.length===1,share:spendingShare(highest.total_minor,paymentTotal(plan))!};
}
export function spendingGroup(rows:Pick<CheckupRow,'amount_minor'|'certainty'>[]):SpendingGroup {
  return {total:rows.length,known_count:rows.filter(row=>row.amount_minor!=null).length,positive_count:rows.filter(row=>(row.amount_minor??0)>0).length,
    unset_count:rows.filter(row=>row.amount_minor==null).length,total_minor:rows.reduce((sum,row)=>sum+BigInt(row.amount_minor??0),0n).toString(),
    estimated_minor:rows.filter(row=>row.certainty==='estimated').reduce((sum,row)=>sum+BigInt(row.amount_minor??0),0n).toString()};
}
/** Sample calculations use the same projection as Free totals and the extended planner. */
export function sampleSpendingCheckup(items:ItemWithDetails[],today:string,filter:CheckupFilter={}):SpendingCheckup {
  const all=sampleHouseholdPlanningRows(items,today,30).filter(row=>row.cost_expected);
  const weeks=Array.from({length:5},(_,index)=>{
    const starts_on=addDays(today,index*7),ends_on=addDays(today,Math.min(index*7+6,30));
    return {starts_on,ends_on,...spendingGroup(all.filter(row=>row.due_on>=starts_on&&row.due_on<=ends_on))};
  });
  const week=weeks.some(week=>week.starts_on===filter.week)?filter.week!:null;
  const category=spendingCategories.includes(filter.category??'')?filter.category!:null;
  const period=weeks.find(period=>period.starts_on===week);
  const selected=all.filter(row=>(!period||(row.due_on>=period.starts_on&&row.due_on<=period.ends_on))&&(!category||row.reporting_category===category));
  const page=selected.filter(row=>!filter.before||!filter.id||row.due_on>filter.before||(row.due_on===filter.before&&row.date_id>filter.id)).sort((a,b)=>a.due_on.localeCompare(b.due_on)||a.date_id.localeCompare(b.date_id));
  const categories=[...new Set(all.map(row=>row.reporting_category))].sort().map(category=>({category,...spendingGroup(all.filter(row=>row.reporting_category===category))}));
  const sum=(certainty:string)=>all.filter(row=>row.certainty===certainty).reduce((sum,row)=>sum+BigInt(row.amount_minor??0),0n).toString();
  return {today,ends_on:addDays(today,30),currency:'PHP',total:all.length,confirmed_minor:sum('confirmed'),estimated_minor:sum('estimated'),unverified_minor:sum('unverified'),
    confirmed_count:all.filter(row=>row.certainty==='confirmed').length,estimated_count:all.filter(row=>row.certainty==='estimated').length,unverified_count:all.filter(row=>row.certainty==='unverified').length,unset_count:all.filter(row=>row.amount_minor==null).length,
    weeks,categories,source_count:new Set(all.map(row=>row.date_id)).size,positive_source_count:new Set(all.filter(row=>(row.amount_minor??0)>0).map(row=>row.date_id)).size,filtered_total:selected.length,week,category,rows:page.slice(0,25),has_more:page.length>25};
}
