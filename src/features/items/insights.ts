import { formatDate, formatMoney } from '@/lib/domain';
import { itemCategory } from '@/features/templates/categories';
import { currentOccurrence, dateRows, isActiveReminder, type ItemIdentity, type ItemWithDetails, type DateWithDetails } from './domain';
import { addDays, occurrenceAmount, sampleHouseholdPlanningRows, type AmountCertainty } from './planning';
export { addDays, occurrenceAmount, type AmountCertainty } from './planning';

export const readinessKeys = ['purchase_date','warranty','important_date','registration','service_date','service_history'] as const;
export type ReadinessKey = typeof readinessKeys[number];
export type ReadinessState = 'missing' | 'complete' | 'unknown' | 'not_applicable' | 'dismissed';
export interface ReadinessCheck { key: ReadinessKey; state: ReadinessState }
export const readinessCopy: Record<ReadinessKey, { label: string; help: string }> = {
  purchase_date: { label: 'Purchase date', help: 'Keep when you bought it with your purchase details.' },
  warranty: { label: 'Warranty end date', help: 'Add coverage only if this purchase has a warranty.' },
  important_date: { label: 'Important date', help: 'Add the next payment, appointment or deadline when you know it.' },
  registration: { label: 'Registration date', help: 'Keep the renewal date from your current documents.' },
  service_date: { label: 'Next service date', help: 'Keep your next cleaning or maintenance date.' },
  service_history: { label: 'Service history', help: 'Record a completed service to start your maintenance history.' },
};
export const readinessStateLabels: Record<ReadinessState,string> = {
  missing: 'To add', complete: 'Saved', unknown: 'Not known yet', not_applicable: 'Not applicable', dismissed: 'Suggestion hidden',
};
export function readinessDate(item:ItemWithDetails,key:ReadinessKey) {
  if(key==='registration')return item.dates.find(date=>date.kind==='registration');
  if(key==='warranty')return item.dates.find(date=>date.kind==='warranty');
  if(key==='service_date')return item.dates.find(date=>date.kind==='service') ?? item.dates[0];
  if(key==='important_date')return item.dates[0];
}
export function readinessSavedValue(item:ItemWithDetails,key:ReadinessKey):{value:string;detail?:string}|null {
  if(key==='purchase_date')return item.purchased_on ? {value:formatDate(item.purchased_on),detail:item.price_minor==null?undefined:'Purchase price: '+formatMoney(item.price_minor)} : null;
  if(key==='service_history') {
    const service=item.activity_history?.activities.filter(activity=>activity.activity_type==='service'&&!activity.voided_at).sort((a,b)=>b.completed_on.localeCompare(a.completed_on))[0];
    return service ? {value:formatDate(service.completed_on),detail:service.title+(service.amount_minor==null?'':' · Cost: '+formatMoney(service.amount_minor))} : null;
  }
  const date=readinessDate(item,key);
  if(!date)return null;
  const current=currentOccurrence(date);
  const due=current?.due_on ?? [...date.occurrences].sort((a,b)=>b.due_on.localeCompare(a.due_on))[0]?.due_on;
  if(!due)return null;
  const amount=current?occurrenceAmount(date,current):null;
  return {value:(current?'':'Last recorded: ')+formatDate(due),detail:amount?.amount==null?undefined:(amount.certainty==='estimated'?'Estimated cost: ':'Expected cost: ')+formatMoney(amount.amount)};
}
/** Sample account mirror of the database rules. Private records use authoritative checks. */
export function readinessChecks(item: ItemWithDetails): ReadinessCheck[] {
  if (item.readiness_checks) return item.readiness_checks;
  const checks: ReadinessCheck[] = [];
  const add = (key: ReadinessKey, complete: boolean) => checks.push({key,state:complete ? 'complete' : 'missing'});
  if (item.template_key === 'receipt') {
    add('purchase_date',Boolean(item.purchased_on));
    if (['appliances','electronics'].includes(item.category || '')) add('warranty',item.dates.some(d=>d.kind==='warranty'));
  }
  if (['car','motorcycle'].includes(item.template_key)) add('registration',item.dates.some(d=>d.kind==='registration'));
  if (itemCategory(item)==='maintenance') add('service_date',item.dates.length>0);
  if (['car','motorcycle','aircon'].includes(item.template_key) || itemCategory(item)==='maintenance') add('service_history',Boolean(item.activity_history?.activities.some(a=>!a.voided_at && a.activity_type==='service')));
  if (!['receipt','car','motorcycle','aircon'].includes(item.template_key) && itemCategory(item)!=='maintenance') add('important_date',item.dates.length>0);
  return checks.sort((a,b)=>a.key.localeCompare(b.key));
}
export function readinessComplete(checks: ReadinessCheck[]) { return checks.every(c=>['complete','not_applicable'].includes(c.state)); }
export function paymentTotal(plan:Pick<PaymentPlan,'confirmed_minor'|'estimated_minor'|'unverified_minor'>):string {
  return (BigInt(plan.confirmed_minor)+BigInt(plan.estimated_minor)+BigInt(plan.unverified_minor)).toString();
}
export interface PlannedPayment {identity?:ItemIdentity;item_id:string;product_name:string;date_id:string;label:string;occurrence_id:string|null;due_on:string;amount_minor:number|null;certainty:AmountCertainty;projected:boolean}
export interface PaymentActionContext {
  revision:number; can_record_payment:boolean;
  service_schedule?:Pick<DateWithDetails,'recurrence_months'|'recurrence_policy'|'interval_months'>;
}
export function paymentActionContext(date:Pick<DateWithDetails,'revision'|'kind'|'recurrence_months'|'recurrence_policy'|'interval_months'>):PaymentActionContext {
  return {revision:date.revision,can_record_payment:date.kind!=='warranty',...(date.kind==='service'?{service_schedule:{recurrence_months:date.recurrence_months,recurrence_policy:date.recurrence_policy,interval_months:date.interval_months}}:{})};
}
export interface PaymentPlan {
  today:string;ends_on:string;currency:'PHP';total:number;confirmed_minor:string;estimated_minor:string;unverified_minor:string;
  confirmed_count:number;estimated_count:number;unverified_count:number;unset_count:number;has_more:boolean;rows:PlannedPayment[];
}
/** Keep sample totals in sync without implying a persisted payment or bill. */
export function previewPaymentChange(plan:PaymentPlan,row:PlannedPayment,change:{amount:number|null;certainty:AmountCertainty}|'paid'):PaymentPlan {
  const result={...plan,rows:plan.rows.filter(candidate=>candidate.date_id!==row.date_id||candidate.due_on!==row.due_on)};
  const adjust=(certainty:AmountCertainty,amount:number|null,direction:1|-1)=>{
    if(certainty==='unset')result.unset_count+=direction;
    else {
      const count=`${certainty}_count` as 'confirmed_count'|'estimated_count'|'unverified_count';
      const sum=`${certainty}_minor` as 'confirmed_minor'|'estimated_minor'|'unverified_minor';
      result[count]+=direction;result[sum]=(BigInt(result[sum])+BigInt(amount??0)*BigInt(direction)).toString();
    }
  };
  adjust(row.certainty,row.amount_minor,-1);
  if(change==='paid')result.total--;
  else {
    adjust(change.certainty,change.amount,1);
    result.rows.push({...row,amount_minor:change.amount,certainty:change.certainty});
    result.rows.sort((a,b)=>a.due_on.localeCompare(b.due_on)||a.date_id.localeCompare(b.date_id));
  }
  return result;
}
export interface HouseholdInsights {
  today:string;
  readiness:{total:number;ready:number;unknown:number;dismissed:number;rows:{item_id:string;product_name:string;key:ReadinessKey}[]};
  week:{ends_on:string;payment_count:number;date_count:number;overdue_count:number;unconfirmed_count:number;services:{item_id:string;product_name:string;date_id:string;label:string;due_on:string}[]};
  payments:PaymentPlan;
}
/** Totals arrive as decimal integer strings to preserve exact money across large accounts. */
export function formatTotal(minor: string) {
  const value=BigInt(minor), cents=value%100n;
  return new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0}).format(value/100n)+(cents ? '.'+String(cents).padStart(2,'0') : '');
}
export function samplePaymentRows(items:ItemWithDetails[],today:string):PlannedPayment[] {
  return sampleHouseholdPlanningRows(items,today,30).filter(row=>row.cost_expected).map(row=>({
    identity:row.identity,item_id:row.item_id,product_name:row.product_name,date_id:row.date_id,label:row.label,
    occurrence_id:row.occurrence_id,due_on:row.due_on,amount_minor:row.amount_minor,certainty:row.certainty,projected:row.projected,
  }));
}
export function samplePaymentPlan(items:ItemWithDetails[],today:string,before?:string,beforeId?:string):PaymentPlan {
  const all=samplePaymentRows(items,today), page=all.filter(r=>!before || !beforeId || r.due_on>before || (r.due_on===before&&r.date_id>beforeId));
  const sum=(certainty:AmountCertainty)=>all.filter(r=>r.certainty===certainty).reduce((total,r)=>total+BigInt(r.amount_minor || 0),0n).toString();
  return {today,ends_on:addDays(today,30),currency:'PHP',total:all.length,confirmed_minor:sum('confirmed'),estimated_minor:sum('estimated'),unverified_minor:sum('unverified'),
    confirmed_count:all.filter(r=>r.certainty==='confirmed').length,estimated_count:all.filter(r=>r.certainty==='estimated').length,unverified_count:all.filter(r=>r.certainty==='unverified').length,unset_count:all.filter(r=>r.certainty==='unset').length,
    has_more:page.length>25,rows:page.slice(0,25)};
}
export function sampleInsights(items:ItemWithDetails[],today:string):HouseholdInsights {
  const active=items.filter(isActiveReminder),checks=active.flatMap(item=>readinessChecks(item).map(check=>({...check,item_id:item.id,product_name:item.product_name!})));
  const rows=dateRows(active),payments=samplePaymentPlan(active,today);
  return {today,payments,readiness:{total:active.length,ready:active.filter(item=>readinessComplete(readinessChecks(item))).length,unknown:checks.filter(c=>c.state==='unknown').length,dismissed:checks.filter(c=>c.state==='dismissed').length,rows:checks.filter(c=>c.state==='missing').sort((a,b)=>a.item_id.localeCompare(b.item_id)||a.key.localeCompare(b.key)).slice(0,3)},
    week:{ends_on:addDays(today,6),payment_count:samplePaymentRows(active,today).filter(r=>r.due_on<=addDays(today,6)).length,date_count:rows.filter(r=>r.occurrence.due_on>=today&&r.occurrence.due_on<=addDays(today,6)).length,
      overdue_count:rows.filter(r=>r.occurrence.due_on<today).length,unconfirmed_count:active.flatMap(i=>i.dates.flatMap(d=>d.occurrences.filter(o=>o.status==='unconfirmed'))).length,
      services:rows.filter(r=>r.occurrence.due_on>=today&&r.occurrence.due_on<=addDays(today,6)&&(r.date.kind==='service'||itemCategory(r.item)==='maintenance')).slice(0,2).map(r=>({item_id:r.item.id,product_name:r.item.product_name!,date_id:r.date.id,label:r.date.label,due_on:r.occurrence.due_on}))}};
}
/** Search only saved, authorised content. Private search runs before cursor pagination. */
export function sampleSearchMatches(item:ItemWithDetails,query:string) {
  const text=[item.product_name,item.template_key,item.reminder_preset?.replaceAll('-',' '),itemCategory(item),item.notes,item.merchant,item.purchased_on,
    ...item.dates.flatMap(d=>[d.label,d.notes,d.starts_on,...d.occurrences.map(o=>o.due_on)]),
    ...(item.activity_history?.activities.filter(a=>!a.voided_at).flatMap(a=>[a.title,a.notes,a.completed_on]) || []),
    ...item.documents.filter(d=>d.state==='ready').map(d=>d.original_name)].join(' ').toLowerCase();
  return text.includes(query.trim().slice(0,160).toLowerCase());
}
export function readinessHref(itemId:string,key:ReadinessKey,base='') {
  return key==='purchase_date' ? base+'/purchases/'+itemId+'/edit' : key==='warranty' ? base+'/purchases/'+itemId+'/edit?focus=warranty' : base+'/items/'+itemId+(key==='service_history'?'#activity-history-heading':'?addDate=1#add-important-date');
}
