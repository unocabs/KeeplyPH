import { alertsPaused } from '@/lib/alert-options';
import 'server-only';
import { requireUser } from '@/lib/auth';
import type { ItemWithDetails } from './domain';
export interface ItemQuery { filter?:string; q?:string; template?:string; cursor?:string; cursorId?:string }
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
export async function getItem(id: string): Promise<ItemWithDetails | null> {
  const { supabase, profile } = await requireUser();
  const {data,error}=await supabase.rpc('item_detail',{p_id:id});
  if(error)throw new Error('Unable to load this reminder.');if(!data)return null;
  const item=data as unknown as ItemWithDetails;
  const { data: preview, error: previewError } = await supabase.rpc('reminder_preview', { p_item_id: id });
  if(previewError) throw new Error('Unable to load alert schedule.');
  const schedule = preview as unknown as { date_id: string; next_scheduled_on: string }[];
  return { ...item, alert_delivery_paused: alertsPaused(profile), dates: item.dates.map(date => ({ ...date, next_scheduled_on: schedule.find(s=>s.date_id===date.id)?.next_scheduled_on || null })) };
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
