'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { type ActionResult } from '@/lib/domain';
import { uuidSchema } from '@/lib/validation';
import { errorMessage } from '@/lib/errors';
import { isTemplate, isReminderPreset } from '@/features/templates';
import { dateSchema, requiredDate } from './validation';
import { isMotorcycleBrand } from './motorcycle-brands';
import { isSubscriptionBrand } from './subscription-brands';
import { isCarBrand } from './car-brands';
import { isLender } from './lenders';
import { isInsurer, insurancePreset } from './insurers';
import { isUtility, utilityPreset } from './utilities';
function refresh() { revalidatePath('/dashboard'); revalidatePath('/checkup'); revalidatePath('/items', 'layout'); revalidatePath('/purchases','layout'); revalidatePath('/settings/billing'); }
export async function createItemDraft(id: string, template: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success || !isTemplate(template)) return { error: 'Choose a supported reminder type.' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('create_item_draft', { p_id: id, p_template: template });
  return error ? { error: errorMessage(error) } : { id };
}
// A new reminder keeps the same ID across retries. If a response was lost after
// saving, return the existing reminder rather than replaying a stale revision.
export async function createAndSaveItem(form: FormData, template: string): Promise<ActionResult> {
  const id = String(form.get('id') || '');
  const draft = await createItemDraft(id, template);
  if (draft.error) return draft;
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from('items').select('state').eq('id', id).eq('user_id', userId).single();
  if (error || !data) return { error: 'Unable to check this reminder. Your details are kept; please try saving again.' };
  if (data.state === 'saved') return { id };
  return saveItem(form);
}
export async function saveItem(form: FormData): Promise<ActionResult> {
  const id = String(form.get('id') || ''), label = String(form.get('label') || '').trim(), notes = String(form.get('notes') || ''), revision = Number(form.get('revision'));
  if (!uuidSchema.safeParse(id).success || !label || label.length > 160 || notes.length > 5000 || !Number.isInteger(revision) || revision < 1) return { error: 'Please check the name and details.' };
  const preset = String(form.get('preset') || '');
  if (preset && !isReminderPreset(preset)) return { error: 'Choose a supported reminder type.' };
  const brand = form.has('car_brand') ? String(form.get('car_brand') || '') : null;
  if (brand && !isCarBrand(brand)) return { error: 'Choose a supported car brand.' };
  const motorcycleBrand = form.has('motorcycle_brand') ? String(form.get('motorcycle_brand') || '') : null;
  if (motorcycleBrand && !isMotorcycleBrand(motorcycleBrand)) return { error: 'Choose a supported motorcycle brand.' };
  if (brand && motorcycleBrand) return { error: 'Choose a brand for this vehicle type.' };
  const subscriptionBrand = form.has('subscription_brand') ? String(form.get('subscription_brand') || '') : null;
  if (subscriptionBrand && !isSubscriptionBrand(subscriptionBrand, preset)) return { error: 'Choose a supported service or gym brand.' };
  if (subscriptionBrand && (brand || motorcycleBrand)) return { error: 'Choose a brand for this reminder type.' };
  const lenderId = form.has('lender_id') ? String(form.get('lender_id') || '') : null;
  const lenderName = form.has('lender_name') ? String(form.get('lender_name') || '').trim() : null;
  if (lenderId && !isLender(lenderId, preset)) return { error: 'Choose a lender for this loan type.' };
  if ((lenderName && (lenderId !== 'other' || lenderName.length > 160)) || (lenderId !== null && subscriptionBrand)) return { error: 'Please check the lender details.' };
  const insurerId = form.has('insurer_id') ? String(form.get('insurer_id') || '') : null;
  const insurerName = form.has('insurer_name') ? String(form.get('insurer_name') || '').trim() : null;
  if (insurerId !== null && (!insurancePreset('other', preset) || (insurerId && !isInsurer(insurerId, preset)))) return { error: 'Choose an insurer for this insurance type.' };
  if ((insurerName && (insurerId !== 'other' || insurerName.length > 160)) || (insurerId !== null && (lenderId !== null || subscriptionBrand || brand || motorcycleBrand))) return { error: 'Please check the insurer details.' };
  const utilityId = form.has('utility_id') ? String(form.get('utility_id') || '') : null;
  const utilityName = form.has('utility_name') ? String(form.get('utility_name') || '').trim() : null;
  if (utilityId !== null && (!utilityPreset('other', preset) || (utilityId && !isUtility(utilityId, preset)))) return { error: 'Choose a biller for this bill type.' };
  if ((utilityName && (utilityId !== 'other' || utilityName.length > 160)) || (utilityId !== null && (insurerId !== null || lenderId !== null || subscriptionBrand || brand || motorcycleBrand))) return { error: 'Please check the biller details.' };
  let date = null;
  if (form.get('date')) {
    try { const parsed = dateSchema.safeParse(JSON.parse(String(form.get('date')))); if (!parsed.success) return { error: parsed.error.issues[0].message }; date = parsed.data; } catch { return { error: 'Check the date details.' }; }
  }
  const { supabase } = await requireUser();
  const parameters = { p_id: id, p_revision: revision, p_label: label, p_notes: notes, p_date: date, p_preset: preset || (form.has('preset') ? '' : null) };
  const { error } = utilityId !== null
    ? await supabase.rpc('save_utility_item_with_date', { ...parameters, p_utility_id: utilityId, p_utility_name: utilityName })
    : insurerId !== null
    ? await supabase.rpc('save_insurance_item_with_date', { ...parameters, p_insurer_id: insurerId, p_insurer_name: insurerName })
    : lenderId !== null
    ? await supabase.rpc('save_loan_item_with_date', { ...parameters, p_lender_id: lenderId, p_lender_name: lenderName, p_car_brand: brand, p_motorcycle_brand: motorcycleBrand })
    : subscriptionBrand !== null
    ? await supabase.rpc('save_subscription_item_with_date', { ...parameters, p_subscription_brand: subscriptionBrand })
    : motorcycleBrand !== null
    ? await supabase.rpc('save_motorcycle_item_with_date', { ...parameters, p_motorcycle_brand: motorcycleBrand })
    : await supabase.rpc('save_item_with_date', { ...parameters, p_car_brand: brand });
  if (error) return { error: errorMessage(error) }; refresh();
  const {data:coverage}=await supabase.rpc('item_coverage',{p_id:id});
  return { id, uncovered: Boolean(date?.reminders_enabled && (coverage as {coverage?:string})?.coverage !== 'covered') };
}
export async function saveDate(id: string, itemId: string, revision: number, value: unknown): Promise<ActionResult> {
  const parsed = dateSchema.safeParse(value);
  if (!uuidSchema.safeParse(id).success || !uuidSchema.safeParse(itemId).success || !Number.isInteger(revision) || revision < 0) return { error: 'Invalid date.' };
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('save_important_date', { p_id: id, p_item_id: itemId, p_revision: revision, p_data: parsed.data });
  if (error) return { error: errorMessage(error) }; refresh(); return { id };
}
export async function completeDate(id: string, revision: number, completed: string, next: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success || !Number.isInteger(revision) || !requiredDate.safeParse(completed).success || (next && !requiredDate.safeParse(next).success)) return { error: 'Check the completion and next dates.' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('complete_date', { p_id: id, p_revision: revision, p_completed: completed, p_next: next || null });
  if (error) return { error: errorMessage(error) }; refresh(); return { success: 'One less thing to remember.' };
}
export async function archiveItem(id: string, revision: number, archive: boolean): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success || !Number.isInteger(revision)) return { error: 'Invalid reminder.' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('archive_item', { p_id: id, p_revision: revision, p_archive: archive });
  if (error) return { error: errorMessage(error) }; refresh(); return { success: archive ? 'Reminder archived. Its alerts are paused.' : 'Reminder restored.' };
}
export async function deleteItem(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return { error: 'Invalid reminder.' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('delete_item', { p_id: id });
  if (error) return { error: errorMessage(error) }; refresh(); return { success: 'Reminder removed.' };
}

export async function dateHistory(id:string,before:number) {
 if(!uuidSchema.safeParse(id).success||!Number.isInteger(before)||before<1)throw new Error('Invalid history cursor.');
 const {supabase}=await requireUser();const {data,error}=await supabase.rpc('date_history',{p_id:id,p_before:before});
 if(error)throw new Error('Unable to load history.');return data as unknown as import('./domain').Occurrence[];
}

export async function snoozeDate(id: string, occurrence: string, revision: number, choice: string, on?: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success || !uuidSchema.safeParse(occurrence).success || !Number.isInteger(revision) || revision < 1 ||
    !['tomorrow', 'three_days', 'custom', 'cancel'].includes(choice) || (choice === 'custom' && !requiredDate.safeParse(on).success)) return { error: 'Choose a future reminder date.' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('snooze_date', { p_id: id, p_occurrence: occurrence, p_revision: revision, p_choice: choice, p_on: choice === 'custom' ? on : null });
  if (error) return { error: error.message.includes('ALERTS_UNAVAILABLE') ? 'Enable alert coverage and a delivery channel first.' : error.message.includes('INVALID_INPUT') ? 'Choose a future date at 9 AM in your account timezone.' : errorMessage(error) };
  refresh(); return { success: choice === 'cancel' ? 'Snooze cancelled.' : 'Reminder snoozed.' };
}
