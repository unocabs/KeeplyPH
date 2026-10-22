import { addDays, sampleHouseholdPlanningRows } from '@/features/items/planning';
import { paymentTotal, type PaymentPlan, type PlannedPayment } from '@/features/items/insights';
import type { ItemIdentity, ItemWithDetails } from '@/features/items/domain';
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
  availability?:'30_day_only';
  mode?:'30'|'payday'; saved_payday?:string|null; expired_payday?:boolean; after_payday_count?:number; comparison?:CheckupComparison;
}
export interface CheckupFilter { week?:string; category?:string; before?:string; id?:string; mode?:string; payday?:string; view?:string; changePage?:string }
export interface CheckupChange {
 item_id:string; date_id:string; due_on:string; product_name:string; label:string; identity?:ItemIdentity; record_available:boolean;
 before_present:boolean; after_present:boolean; before_minor:string|null; after_minor:string|null;
 before_estimated:boolean|null; after_estimated:boolean|null;
 reason:'added'|'removed'|'amount_added'|'amount_removed'|'amount_changed'|'estimate_changed';
}
export type CheckupComparison = {status:'first_use'|'outside_coverage'} | {
 status:'available'; reviewed_on:string; captured_at?:string; previous_minor:string; current_minor:string;
 previous_missing:number; current_missing:number; previous_known:number; current_known:number;
 change_count:number; page:number; has_more:boolean; rows:CheckupChange[];
};
export interface CheckupActions {
 savePayday?:(date:string)=>Promise<{error?:string}>;
 capture?:()=>Promise<{error?:string}>;
}
/** Payday itself belongs to the next preparation period. Saved dates never recur implicitly. */
export function checkupRange(today:string,payday?:string|null,mode?:string) {
 const valid=Boolean(payday&&payday>today&&payday<=addDays(today,365));
 return {mode:(mode!=='30'&&valid?'payday':'30') as '30'|'payday',ends_on:mode!=='30'&&valid?addDays(payday!,-1):addDays(today,30)};
}
export function checkupHref(base:string,plan:Pick<SpendingCheckup,'mode'|'saved_payday'>,filter:Record<string,string|null|undefined>={}) {
 const query=new URLSearchParams();
 if(plan.mode)query.set('mode',plan.mode);
 if(base&&plan.saved_payday)query.set('payday',plan.saved_payday);
 for(const [key,value] of Object.entries(filter))if(value)query.set(key,value);
 return base+'/checkup'+(query.size?'?'+query:'');
}

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
  const range=checkupRange(today,filter.payday,filter.mode);
  const horizon=Math.round((Date.parse(range.ends_on)-Date.parse(today))/86400000);
  const all=sampleHouseholdPlanningRows(items,today,horizon).filter(row=>row.cost_expected);
  const weeks=Array.from({length:Math.floor(horizon/7)+1},(_,index)=>{
    const starts_on=addDays(today,index*7),ends_on=addDays(today,Math.min(index*7+6,horizon));
    return {starts_on,ends_on,...spendingGroup(all.filter(row=>row.due_on>=starts_on&&row.due_on<=ends_on))};
  });
  const week=weeks.some(week=>week.starts_on===filter.week)?filter.week!:null;
  const category=spendingCategories.includes(filter.category??'')?filter.category!:null;
  const period=weeks.find(period=>period.starts_on===week);
  const selected=all.filter(row=>(!period||(row.due_on>=period.starts_on&&row.due_on<=period.ends_on))&&(!category||row.reporting_category===category));
  const page=selected.filter(row=>!filter.before||!filter.id||row.due_on>filter.before||(row.due_on===filter.before&&row.date_id>filter.id)).sort((a,b)=>a.due_on.localeCompare(b.due_on)||a.date_id.localeCompare(b.date_id));
  const categories=[...new Set(all.map(row=>row.reporting_category))].sort().map(category=>({category,...spendingGroup(all.filter(row=>row.reporting_category===category))}));
  const sum=(certainty:string)=>all.filter(row=>row.certainty===certainty).reduce((sum,row)=>sum+BigInt(row.amount_minor??0),0n).toString();
  return {today,ends_on:range.ends_on,mode:range.mode,saved_payday:filter.payday||null,expired_payday:Boolean(filter.payday&&filter.payday<=today),after_payday_count:range.mode==='payday'?sampleHouseholdPlanningRows(items,today,30).filter(row=>row.cost_expected&&row.due_on>=filter.payday!).length:0,currency:'PHP',total:all.length,confirmed_minor:sum('confirmed'),estimated_minor:sum('estimated'),unverified_minor:sum('unverified'),
    confirmed_count:all.filter(row=>row.certainty==='confirmed').length,estimated_count:all.filter(row=>row.certainty==='estimated').length,unverified_count:all.filter(row=>row.certainty==='unverified').length,unset_count:all.filter(row=>row.amount_minor==null).length,
    weeks,categories,source_count:new Set(all.map(row=>row.date_id)).size,positive_source_count:new Set(all.filter(row=>(row.amount_minor??0)>0).map(row=>row.date_id)).size,filtered_total:selected.length,week,category,rows:page.slice(0,25),has_more:page.length>25};
}

/** Fictional sample baseline. Never used for private account history. */
export function sampleCheckupComparison(items:ItemWithDetails[],today:string,filter:CheckupFilter={}):CheckupComparison {
 const range=checkupRange(today,filter.payday,filter.mode);
 const all=sampleHouseholdPlanningRows(items,today,365).filter(row=>row.cost_expected&&row.due_on<=range.ends_on);
 const eligible=all.filter(row=>row.certainty==='estimated'&&(row.amount_minor??0)>=50000);
 const changed=eligible.find(row=>row.reporting_category==='vehicles'&&row.kind==='service')??eligible[0];
 const sum=all.reduce((total,row)=>total+BigInt(row.amount_minor??0),0n),difference=changed?50000n:0n;
 return {status:'available',reviewed_on:addDays(today,-1),previous_minor:(sum-difference).toString(),current_minor:sum.toString(),
 previous_missing:all.filter(row=>row.amount_minor==null).length,current_missing:all.filter(row=>row.amount_minor==null).length,
 previous_known:all.filter(row=>row.amount_minor!=null).length,current_known:all.filter(row=>row.amount_minor!=null).length,
 change_count:changed?1:0,page:0,has_more:false,rows:changed?[{...changed,record_available:true,before_present:true,after_present:true,
 before_minor:(BigInt(changed.amount_minor!)-difference).toString(),after_minor:String(changed.amount_minor),before_estimated:true,after_estimated:true,reason:'amount_changed'}]:[]};
}
