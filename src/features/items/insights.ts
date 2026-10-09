import { daysUntil } from '@/lib/domain';
import { itemCategory, paymentDate } from '@/features/templates/categories';
import { currentOccurrence, dateRows, isActiveReminder, type ItemWithDetails, type DateWithDetails, type Occurrence } from './domain';
import { nextRecurringDate } from './recurrence';

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
export type AmountCertainty = 'confirmed' | 'estimated' | 'unverified' | 'unset';
export const amountLabels: Record<AmountCertainty,string> = {confirmed:'Amount checked',estimated:'Estimated',unverified:'Unverified',unset:'Amount not saved'};
export function occurrenceAmount(date: DateWithDetails, occurrence: Occurrence) {
  return occurrence.amount_certainty ? { amount:occurrence.expected_amount_minor ?? null,certainty:occurrence.amount_certainty }
    : { amount:date.payment_amount_minor ?? null,certainty:date.payment_amount_minor == null ? 'unset' as const : date.payment_amount_certainty || 'unverified' as const };
}
export interface PlannedPayment {item_id:string;product_name:string;date_id:string;label:string;occurrence_id:string|null;due_on:string;amount_minor:number|null;certainty:AmountCertainty;projected:boolean}
export interface PaymentPlan {
  today:string;ends_on:string;currency:'PHP';total:number;confirmed_minor:string;estimated_minor:string;unverified_minor:string;
  confirmed_count:number;estimated_count:number;unverified_count:number;unset_count:number;has_more:boolean;rows:PlannedPayment[];
}
export interface HouseholdInsights {
  today:string;
  readiness:{total:number;ready:number;unknown:number;dismissed:number;rows:{item_id:string;product_name:string;key:ReadinessKey}[]};
  week:{ends_on:string;payment_count:number;date_count:number;overdue_count:number;unconfirmed_count:number;services:{item_id:string;product_name:string;date_id:string;label:string;due_on:string}[]};
  payments:PaymentPlan;
}
export function addDays(day: string, count: number) { return new Date(Date.parse(day+'T00:00:00Z')+count*86400000).toISOString().slice(0,10); }
/** Totals arrive as decimal integer strings to preserve exact money across large accounts. */
export function formatTotal(minor: string) {
  const value=BigInt(minor), cents=value%100n;
  return new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0}).format(value/100n)+(cents ? '.'+String(cents).padStart(2,'0') : '');
}
export function samplePaymentRows(items:ItemWithDetails[],today:string):PlannedPayment[] {
  const rows:PlannedPayment[]=[];
  for(const item of items.filter(isActiveReminder)) for(const date of item.dates) {
    const current=currentOccurrence(date);
    if(!current || !(paymentDate(item.reminder_preset,date.kind,date.label) || date.payment_amount_minor!=null || current.expected_amount_minor!=null))continue;
    const {amount,certainty}=occurrenceAmount(date,current);
    if(daysUntil(current.due_on,today)>=0 && daysUntil(current.due_on,today)<=30)rows.push({item_id:item.id,product_name:item.product_name!,date_id:date.id,label:date.label,occurrence_id:current.id,due_on:current.due_on,amount_minor:amount,certainty,projected:false});
    if(!date.recurrence_months || date.recurrence_policy==='from_completion')continue;
    let next=nextRecurringDate(date.recurrence_anchor || current.due_on,current.due_on>=today?current.due_on:addDays(today,-1),date.recurrence_months,date.recurrence_ends_on || null);
    for(let n=0;n<2 && next && next<=addDays(today,30);n++) {
      if(!date.occurrences.some(o=>o.due_on===next && ['completed','skipped','superseded'].includes(o.status)))rows.push({item_id:item.id,product_name:item.product_name!,date_id:date.id,label:date.label,occurrence_id:null,due_on:next,amount_minor:date.payment_amount_minor ?? null,certainty:date.payment_amount_minor==null?'unset':date.payment_amount_certainty || 'unverified',projected:true});
      next=nextRecurringDate(date.recurrence_anchor || current.due_on,next,date.recurrence_months,date.recurrence_ends_on || null);
    }
  }
  return rows.sort((a,b)=>a.due_on.localeCompare(b.due_on)||a.date_id.localeCompare(b.date_id));
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
