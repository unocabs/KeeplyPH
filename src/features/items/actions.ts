'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { type ActionResult } from '@/lib/domain';
import { uuidSchema } from '@/lib/validation';
import { errorMessage } from '@/lib/errors';
import { isTemplate, isReminderPreset } from '@/features/templates';
import { dateSchema, requiredDate } from './validation';
function refresh() { revalidatePath('/dashboard'); revalidatePath('/items', 'layout'); revalidatePath('/purchases','layout'); revalidatePath('/settings/billing'); }
export async function createItemDraft(id: string, template: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success || !isTemplate(template)) return { error: 'Choose a supported reminder type.' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('create_item_draft', { p_id: id, p_template: template });
  return error ? { error: errorMessage(error) } : { id };
}
export async function saveItem(form: FormData): Promise<ActionResult> {
  const id = String(form.get('id') || ''), label = String(form.get('label') || '').trim(), notes = String(form.get('notes') || ''), revision = Number(form.get('revision'));
  if (!uuidSchema.safeParse(id).success || !label || label.length > 160 || notes.length > 5000 || !Number.isInteger(revision) || revision < 1) return { error: 'Please check the name and details.' };
  const preset = String(form.get('preset') || '');
  if (preset && !isReminderPreset(preset)) return { error: 'Choose a supported reminder type.' };
  let date = null;
  if (form.get('date')) {
    try { const parsed = dateSchema.safeParse(JSON.parse(String(form.get('date')))); if (!parsed.success) return { error: parsed.error.issues[0].message }; date = parsed.data; } catch { return { error: 'Check the date details.' }; }
  }
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('save_item_with_date', { p_id: id, p_revision: revision, p_label: label, p_notes: notes, p_date: date, p_preset: preset || (form.has('preset') ? '' : null) });
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
