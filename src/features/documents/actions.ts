'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { MAX_FILE_BYTES, type Document } from '@/lib/domain';
import { uuidSchema } from '@/lib/validation';
import { errorMessage } from '@/lib/errors';

export async function prepareUpload(id: string, purchaseId: string, kind: string, name: string) {
  if (!uuidSchema.safeParse(id).success || !uuidSchema.safeParse(purchaseId).success || !['receipt', 'warranty', 'vehicle', 'service'].includes(kind)) return { error: 'Invalid upload.' };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('reserve_document', { p_id: id, p_purchase_id: purchaseId, p_kind: kind, p_name: name.slice(0, 255), p_bytes: MAX_FILE_BYTES });
  if (error) return { error: errorMessage(error) };
  const document = data as unknown as Document;
  if (document.state === 'ready') return { document };
  const { data: upload, error: uploadError } = await adminClient().storage.from('upload-staging').createSignedUploadUrl(document.staging_key, { upsert: false });
  if (uploadError) return { error: 'Could not prepare this upload. Please retry.' };
  return { document, token: upload.token };
}
export async function removeDocument(id: string) {
  if (!uuidSchema.safeParse(id).success) return { error: 'Invalid file.' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('remove_document', { p_id: id });
  if (error) return { error: errorMessage(error) };
  revalidatePath('/purchases', 'layout'); revalidatePath('/items', 'layout');
  return { success: 'File removed.' };
}
