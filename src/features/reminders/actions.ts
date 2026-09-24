'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { uuidSchema } from '@/lib/validation';
import { errorMessage } from '@/lib/errors';
import type { ActionResult } from '@/lib/domain';
export async function changeCoverage(id: string, revision: number, enabled: boolean, replacement?: { id: string; revision: number }): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success || !Number.isInteger(revision) || typeof enabled !== 'boolean' || (replacement && (!uuidSchema.safeParse(replacement.id).success || !Number.isInteger(replacement.revision)))) return { error: 'Invalid item selection.' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('set_item_coverage', { p_id: id, p_revision: revision, p_enabled: enabled, p_replace: replacement?.id || null, p_replace_revision: replacement?.revision ?? null });
  if (error) return { error: errorMessage(error) };
  revalidatePath('/items', 'layout'); revalidatePath('/dashboard'); revalidatePath('/settings', 'layout');
  return { success: enabled ? 'Reminder coverage enabled.' : 'Reminder coverage turned off. Your dates are safely kept.' };
}
export async function coverageChoices() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('list_items', { p_filter: 'reminders' });
  if (error) throw new Error('Unable to load reminder selections.');
  return (data as unknown as {id:string;product_name:string;revision:number}[]).map(i=>({id:i.id,name:i.product_name,revision:i.revision}));
}
