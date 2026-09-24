import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { validateFile } from '@/lib/files';
import { checkOrigin } from '@/lib/security';
import { uuidSchema } from '@/lib/validation';
import { errorMessage } from '@/lib/errors';
import type { Document } from '@/lib/domain';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkOrigin(request)) return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) return Response.json({ error: 'Invalid file.' }, { status: 400 });
  const { supabase, userId } = await requireUser();
  const { data, error: lookupError } = await supabase.rpc('begin_document_validation', { p_id: id });
  if (lookupError) return Response.json({ error: errorMessage(lookupError) }, { status: lookupError.message.includes('RATE_LIMITED') ? 429 : 404 });
  const doc = data as unknown as Document;
  if (!doc) return Response.json({ error: 'File not found.' }, { status: 404 });
  if (doc.state === 'ready') return Response.json({ document: doc });
  if (Date.parse(doc.upload_expires_at) < Date.now()) return Response.json({ error: 'This upload expired. Remove it and try again.' }, { status: 410 });
  const admin = adminClient();
  const { data: blob, error } = await admin.storage.from('upload-staging').download(doc.staging_key);
  if (error || !blob) return Response.json({ error: 'Upload not received yet. Retry this file.' }, { status: 409 });
  try {
    const file = await validateFile(Buffer.from(await blob.arrayBuffer()));
    const { error: writeError } = await admin.storage.from('purchase-documents').upload(doc.object_key, file.bytes, { contentType: file.mime, upsert: false, cacheControl: '0' });
    if (writeError) {
      // An interrupted or simultaneous attempt may have already written the same immutable object.
      const { data: existing } = await admin.storage.from('purchase-documents').download(doc.object_key);
      if (!existing || !Buffer.from(await existing.arrayBuffer()).equals(file.bytes)) throw new Error('Unable to store this file. Please retry.');
    }
    const { error: finalError } = await admin.rpc('finalize_document', { p_id: id, p_user_id: userId, p_size: file.bytes.length, p_mime: file.mime, p_checksum: file.checksum });
    if (finalError) return Response.json({ error: 'This upload is no longer available. Remove it and try again.' }, { status: 409 });
    return Response.json({ document: { ...doc, state: 'ready', size_bytes: file.bytes.length, mime_type: file.mime, checksum: file.checksum } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to process this file.' }, { status: 422 });
  }
}
