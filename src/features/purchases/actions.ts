'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { parseMoney, type ActionResult } from '@/lib/domain';
import { isProductType } from './product-types';
import { errorMessage } from '@/lib/errors';
import { purchaseSchema, warrantySchema, uuidSchema } from '@/lib/validation';
export async function createDraft(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return { error: 'Invalid purchase.' };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('create_purchase_draft', { p_id: id });
  return error ? { error: errorMessage(error) } : { id: data! };
}
export async function savePurchase(form: FormData): Promise<ActionResult> {
  const id = String(form.get('id') || '');
  const revision = Number(form.get('revision'));
  if (!uuidSchema.safeParse(id).success || !Number.isInteger(revision) || revision < 1) return { error: 'Invalid purchase.' };
  let price: number | null;
  try { price = parseMoney(String(form.get('price') || '')); } catch { return { error: 'Enter a valid price with at most two decimal places.' }; }
  const input = purchaseSchema.safeParse({
    product_name: String(form.get('product_name') || ''), purchased_on: String(form.get('purchased_on') || ''),
    merchant: String(form.get('merchant') || ''), category: String(form.get('category') || ''),
    notes: String(form.get('notes') || ''), price_minor: price,
  });
  if (!input.success) return { error: input.error.issues[0].message };
  const productType = form.has('product_type') ? String(form.get('product_type') || '') : undefined;
  if (productType && !isProductType(productType, input.data.category)) return { error: 'Choose an item type that matches the category.' };
  const purchaseData = productType === undefined ? input.data : {...input.data, product_type:productType};
  const hasWarranty = form.get('has_warranty') === 'on';
  const warranty = hasWarranty ? warrantySchema.safeParse({
    starts_on: String(form.get('starts_on') || ''), expires_on: String(form.get('expires_on') || ''),
    serial_number: String(form.get('serial_number') || ''), notes: String(form.get('warranty_notes') || ''),
    reminders_enabled: form.get('reminders_enabled') === 'on',
  }) : null;
  if (warranty && !warranty.success) return { error: warranty.error.issues[0].message };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('save_purchase', { p_id: id, p_revision: revision, p_data: purchaseData, p_warranty: warranty?.success ? warranty.data : null });
  if (error) return { error: errorMessage(error) };
  revalidatePath('/dashboard'); revalidatePath('/checkup'); revalidatePath('/items'); revalidatePath('/items/' + id); revalidatePath('/purchases'); revalidatePath('/purchases/' + id); revalidatePath('/settings/billing');
  const {data:coverage}=await supabase.rpc('item_coverage',{p_id:id});
  return { id, uncovered: Boolean(warranty?.success && warranty.data.reminders_enabled && (coverage as {coverage?:string})?.coverage!=='covered') };
}
export async function deletePurchase(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return { error: 'Invalid purchase.' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('delete_purchase', { p_id: id });
  if (error) return { error: errorMessage(error) };
  revalidatePath('/dashboard'); revalidatePath('/checkup'); revalidatePath('/purchases');
  return { success: 'Purchase removed.' };
}
