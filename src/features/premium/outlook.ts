import { addDays } from '@/features/items/planning';
import { plannerMonths, type HouseholdPlanner, type PlannerHorizon, type PlannerMonth, type PlannerRow } from './planner';
import { spendingGroup, type SpendingGroup } from './checkup';

export interface OutlookContributor {
  item_id:string; date_id:string; product_name:string; label:string; costs:SpendingGroup;
}
export interface OutlookMonth extends PlannerMonth {
  starts_on:string; ends_on:string; costs:SpendingGroup; contributors:OutlookContributor[];
}
export interface HouseholdOutlook extends Omit<HouseholdPlanner,'months'> {
  months:OutlookMonth[]; costs:SpendingGroup; positive_source_count:number;
  month:string|null; filtered_total:number;
}
export function isOutlookMonth(month:PlannerMonth):month is OutlookMonth { return 'costs' in month && 'starts_on' in month; }
export function monthEnd(month:string) {
  const date=new Date(month+'T00:00:00Z');date.setUTCMonth(date.getUTCMonth()+1,0);
  return date.toISOString().slice(0,10);
}
export function partialMonth(month:OutlookMonth) { return month.starts_on!==month.month||month.ends_on!==monthEnd(month.month); }
export function outlookHighest(plan:HouseholdOutlook) {
  if(plan.positive_source_count<2)return null;
  const ranked=plan.months.filter(month=>BigInt(month.costs.total_minor)>0n).sort((a,b)=>BigInt(a.total_minor)===BigInt(b.total_minor)?a.month.localeCompare(b.month):BigInt(a.total_minor)>BigInt(b.total_minor)?-1:1);
  if(!ranked.length)return null;
  return {month:ranked[0],ties:ranked.filter(month=>month.total_minor===ranked[0].total_minor).length,only_month:ranked.length===1};
}
/** Positive means the second selected period has a higher recorded total. */
export function outlookDifference(first:OutlookMonth,second:OutlookMonth) {
  if(first.month===second.month||!first.costs.known_count||!second.costs.known_count)return null;
  return BigInt(second.total_minor)-BigInt(first.total_minor);
}
/** Aggregates the shared sample projection before selecting a month or detail page. */
export function sampleOutlook(rows:PlannerRow[],today:string,days:PlannerHorizon,month?:string,before?:string,id?:string):HouseholdOutlook {
  const ends_on=addDays(today,days),all=rows.filter(row=>row.due_on>=today&&row.due_on<=ends_on);
  const costs=all.filter(row=>row.cost_expected);
  const months=plannerMonths(all,today,ends_on).map(period=>{
    const selected=costs.filter(row=>row.due_on.slice(0,7)===period.month.slice(0,7));
    const contributors=[...new Set(selected.map(row=>row.date_id))].map(date_id=>{
      const entries=selected.filter(row=>row.date_id===date_id),row=entries[0];
      return {date_id,item_id:row.item_id,product_name:row.product_name,label:row.label,costs:spendingGroup(entries)};
    }).filter(row=>BigInt(row.costs.total_minor)>0n).sort((a,b)=>BigInt(a.costs.total_minor)===BigInt(b.costs.total_minor)?a.date_id.localeCompare(b.date_id):BigInt(a.costs.total_minor)>BigInt(b.costs.total_minor)?-1:1).slice(0,3);
    return {...period,starts_on:period.month<today?today:period.month,ends_on:monthEnd(period.month)>ends_on?ends_on:monthEnd(period.month),costs:spendingGroup(selected),contributors};
  });
  const validMonth=months.some(entry=>entry.month===month)?month!:null;
  const selected=all.filter(row=>!validMonth||row.due_on.slice(0,7)===validMonth.slice(0,7));
  const page=selected.filter(row=>!before||!id||row.due_on>before||(row.due_on===before&&row.date_id>id)).sort((a,b)=>a.due_on.localeCompare(b.due_on)||a.date_id.localeCompare(b.date_id));
  return {today,ends_on,days,total:all.length,total_minor:spendingGroup(costs).total_minor,months,costs:spendingGroup(costs),positive_source_count:new Set(costs.filter(row=>(row.amount_minor??0)>0).map(row=>row.date_id)).size,month:validMonth,filtered_total:selected.length,rows:page.slice(0,25),has_more:page.length>25};
}
