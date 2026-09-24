import 'server-only';
import { cache } from 'react';
import { requireUser } from '@/lib/auth';
import type { PurchaseWithDetails, Usage } from '@/lib/domain';
export async function getPurchase(id: string): Promise<PurchaseWithDetails | null> {
  const { supabase } = await requireUser();
  const [{ data: purchase, error }, { data: warranty, error: wError }, { data: documents, error: dError }] = await Promise.all([
    supabase.from('purchases').select('*').eq('id', id).maybeSingle(),
    supabase.from('warranties').select('*').eq('purchase_id', id).maybeSingle(),
    supabase.from('documents').select('*').eq('purchase_id', id).order('created_at'),
  ]);
  if (error || wError || dError) throw new Error('Unable to load purchase');
  return purchase ? { ...purchase, warranty, documents: documents || [] } : null;
}
export const getUsage = cache(async function getUsage(): Promise<Usage> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('account_usage', {});
  if (error) throw new Error('Unable to load usage');
  return data as unknown as Usage;
});
