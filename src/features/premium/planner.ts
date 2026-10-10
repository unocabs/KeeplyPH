import { type ItemIdentity, type ItemWithDetails } from '@/features/items/domain';
import { addDays, sampleHouseholdPlanningRows, type AmountCertainty } from '@/features/items/planning';
export const plannerHorizons = [30, 90, 365] as const;
export type PlannerHorizon = typeof plannerHorizons[number];
export function plannerHorizon(value?: string): PlannerHorizon { return value === '90' ? 90 : value === '365' ? 365 : 30; }
export interface PlannerRow { identity?:ItemIdentity;item_id:string;product_name:string;date_id:string;label:string;occurrence_id:string|null;due_on:string;amount_minor:number|null;certainty:AmountCertainty;projected:boolean;cost_expected:boolean;kind:string }
export interface PlannerMonth { month:string;date_count:number;total_minor:string;estimated_count:number;unverified_count:number;unset_count:number }
export interface HouseholdPlanner {today:string;ends_on:string;days:PlannerHorizon;total:number;total_minor:string;months:PlannerMonth[];rows:PlannerRow[];has_more:boolean}
export function plannerMonths(rows:PlannerRow[],today:string,endsOn:string):PlannerMonth[] {
 const months:PlannerMonth[]=[];
 for(let month=today.slice(0,7)+'-01';month<=endsOn;){
  const selected=rows.filter(row=>row.due_on.slice(0,7)===month.slice(0,7));
  months.push({month,date_count:selected.length,total_minor:selected.reduce((sum,row)=>sum+BigInt(row.amount_minor??0),0n).toString(),estimated_count:selected.filter(row=>row.certainty==='estimated').length,unverified_count:selected.filter(row=>row.certainty==='unverified').length,unset_count:selected.filter(row=>row.cost_expected&&row.certainty==='unset').length});
  const date=new Date(month+'T00:00:00Z');date.setUTCMonth(date.getUTCMonth()+1);month=date.toISOString().slice(0,10);
 }
 return months;
}
export function samplePlannerRows(items:ItemWithDetails[],today:string,days:PlannerHorizon):PlannerRow[] {
 return sampleHouseholdPlanningRows(items,today,days).map(row=>({
  identity:row.identity,item_id:row.item_id,product_name:row.product_name,date_id:row.date_id,label:row.label,
  occurrence_id:row.occurrence_id,due_on:row.due_on,amount_minor:row.amount_minor,certainty:row.certainty,
  projected:row.projected,cost_expected:row.cost_expected,kind:row.kind,
 }));
}
export function samplePlanner(items:ItemWithDetails[],today:string,days:PlannerHorizon,month?:string,before?:string,beforeId?:string):HouseholdPlanner {
 const all=samplePlannerRows(items,today,days),rows=all.filter(row=>(!month||row.due_on.slice(0,7)===month.slice(0,7))&&(!before||!beforeId||row.due_on>before||(row.due_on===before&&row.date_id>beforeId)));
 return {today,ends_on:addDays(today,days),days,total:all.length,total_minor:all.reduce((sum,row)=>sum+BigInt(row.amount_minor??0),0n).toString(),months:plannerMonths(all,today,addDays(today,days)),rows:rows.slice(0,25),has_more:rows.length>25};
}
