import { currentOccurrence, isActiveReminder, itemIdentity, type ItemIdentity, type ItemWithDetails } from '@/features/items/domain';
import { addDays, occurrenceAmount, type AmountCertainty } from '@/features/items/insights';
import { nextRecurringDate } from '@/features/items/recurrence';
import { paymentDate } from '@/features/templates/categories';
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
 const rows:PlannerRow[]=[],ends=addDays(today,days);
 for(const item of items.filter(isActiveReminder))for(const date of item.dates){
  const current=currentOccurrence(date);if(!current)continue;
  const amount=occurrenceAmount(date,current),costExpected=paymentDate(item.reminder_preset,date.kind,date.label)||date.payment_amount_minor!=null||current.expected_amount_minor!=null;
  const append=(due:string,projected:boolean)=>rows.push({identity:itemIdentity(item),item_id:item.id,product_name:item.product_name!,date_id:date.id,label:date.label,occurrence_id:projected?null:current.id,due_on:due,amount_minor:projected?date.payment_amount_minor??null:amount.amount,certainty:projected?(date.payment_amount_minor==null?'unset':date.payment_amount_certainty||'unverified'):amount.certainty,projected,cost_expected:costExpected,kind:date.kind});
  if(current.due_on>=today&&current.due_on<=ends)append(current.due_on,false);
  if(!date.recurrence_months||date.recurrence_policy==='from_completion')continue;
  let next=nextRecurringDate(date.recurrence_anchor||current.due_on,current.due_on>=today?current.due_on:addDays(today,-1),date.recurrence_months,date.recurrence_ends_on||null);
  for(let n=0;n<13&&next&&next<=ends;n++){
   if(!date.occurrences.some(o=>o.due_on===next&&['completed','skipped','superseded'].includes(o.status)))append(next,true);
   next=nextRecurringDate(date.recurrence_anchor||current.due_on,next,date.recurrence_months,date.recurrence_ends_on||null);
  }
 }
 return rows.sort((a,b)=>a.due_on.localeCompare(b.due_on)||a.date_id.localeCompare(b.date_id));
}
export function samplePlanner(items:ItemWithDetails[],today:string,days:PlannerHorizon,month?:string,before?:string,beforeId?:string):HouseholdPlanner {
 const all=samplePlannerRows(items,today,days),rows=all.filter(row=>(!month||row.due_on.slice(0,7)===month.slice(0,7))&&(!before||!beforeId||row.due_on>before||(row.due_on===before&&row.date_id>beforeId)));
 return {today,ends_on:addDays(today,days),days,total:all.length,total_minor:all.reduce((sum,row)=>sum+BigInt(row.amount_minor??0),0n).toString(),months:plannerMonths(all,today,addDays(today,days)),rows:rows.slice(0,25),has_more:rows.length>25};
}
