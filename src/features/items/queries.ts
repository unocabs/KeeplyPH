import { alertsPaused } from '@/lib/alert-options';
import 'server-only';
import { requireUser } from '@/lib/auth';
import type { ItemWithDetails } from './domain';
export interface ItemQuery { filter?:string; q?:string; template?:string; cursor?:string; cursorId?:string }
export async function getHouseholdInsights(): Promise<import('./insights').HouseholdInsights> {
 const {supabase}=await requireUser();const {data,error}=await supabase.rpc('household_insights',{});
 if(error)throw new Error('Unable to load household insights. Please retry.');return data as unknown as import('./insights').HouseholdInsights;
}
export async function getPaymentPlan(before?:string,beforeId?:string): Promise<import('./insights').PaymentPlan> {
 const {supabase}=await requireUser();const {data,error}=await supabase.rpc('household_payment_plan',{p_before:before || null,p_before_id:beforeId || null});
 if(error)throw new Error('Unable to load payment planning. Please retry.');return data as unknown as import('./insights').PaymentPlan;
}
export async function getItems(query:ItemQuery={}): Promise<ItemWithDetails[]> {
 const {supabase,profile}=await requireUser();
 const validCursor=query.cursor&&query.cursorId&&/^\d{4}-/.test(query.cursor)&&/^[0-9a-f-]{36}$/i.test(query.cursorId)&&Number.isFinite(Date.parse(query.cursor));
 const {data,error}=await supabase.rpc('list_items',{p_filter:query.filter||'all',p_query:(query.q||'').slice(0,160),p_template:query.template||'all',p_cursor:validCursor?query.cursor:null,p_cursor_id:validCursor?query.cursorId:null});
 if(error)throw new Error('Unable to load your reminders.');return (data as unknown as ItemWithDetails[]).map(item => ({ ...item, alert_delivery_paused: alertsPaused(profile) }));
}
export async function getDashboardItems():Promise<ItemWithDetails[]> {
 const {supabase,profile}=await requireUser();const {data,error}=await supabase.rpc('dashboard_timeline_items',{});
 if(error)throw new Error('Unable to load overview.');return (data as unknown as ItemWithDetails[]).map(item => ({ ...item, alert_delivery_paused: alertsPaused(profile) }));
}
export async function getItem(id: string, selectedOccurrence?: string): Promise<ItemWithDetails | null> {
  const { supabase, profile } = await requireUser();
  const {data,error}=await supabase.rpc('item_detail',{p_id:id});
  if(error)throw new Error('Unable to load this reminder.');if(!data)return null;
  const item=data as unknown as ItemWithDetails;
  // Deep links may point beyond the bounded initial occurrence history.
  if (selectedOccurrence && /^[0-9a-f-]{36}$/i.test(selectedOccurrence) && !item.dates.some(date => date.occurrences.some(o => o.id === selectedOccurrence))) {
    const {data:target,error:targetError} = await supabase.from('date_occurrences').select('*').eq('id',selectedOccurrence).eq('user_id',profile.id).maybeSingle();
    if(targetError)throw new Error('Unable to load the selected reminder.');
    if(target) { const date=item.dates.find(date => date.id === target.date_id); if(date)date.selected_occurrence=target; }
  }
  const [previewResult, historyResult] = await Promise.all([
    supabase.rpc('reminder_preview', { p_item_id: id }),
    supabase.rpc('item_activity_history', { p_item: id }),
  ]);
  const { data: preview, error: previewError } = previewResult;
  if(historyResult.error) throw new Error('Unable to load activity history.');
  if(previewError) throw new Error('Unable to load alert schedule.');
  const schedule = preview as unknown as { date_id: string; next_scheduled_on: string }[];
  return { ...item, activity_history: historyResult.data as unknown as import('./activity').ActivityPage, alert_delivery_paused: alertsPaused(profile), dates: item.dates.map(date => ({ ...date, next_scheduled_on: schedule.find(s=>s.date_id===date.id)?.next_scheduled_on || null })) };
}

export async function getUnconfirmedSummary(before?:string,beforeId?:string): Promise<import('./activity').UnconfirmedSummary> {
  const {supabase}=await requireUser();
  const {data,error}=await supabase.rpc('unconfirmed_occurrence_summary',{p_before:before || null,p_before_id:beforeId || null});
  if(error)throw new Error('Unable to load reminders requiring review.');
  return data as unknown as import('./activity').UnconfirmedSummary;
}

export interface VehicleChoice { id: string; product_name: string | null; car_brand?: string | null; motorcycle_brand?: string | null }
export async function getVehicleChoices(template: 'car' | 'motorcycle'): Promise<VehicleChoice[]> {
  const { supabase, userId } = await requireUser();
  const choices: VehicleChoice[] = [];
  // Read every page so older vehicles remain available in the add flow.
  for (let start = 0; ; start += 200) {
    const { data, error } = await supabase.from('items').select('id,product_name,car_brand,motorcycle_brand')
      .eq('user_id', userId).eq('template_key', template).eq('state', 'saved').is('archived_at', null)
      .order('created_at', { ascending: false }).order('id', { ascending: false }).range(start, start + 199);
    if (error) throw new Error('Unable to load your vehicles. Please retry.');
    choices.push(...data);
    if (data.length < 200) return choices;
  }
}
