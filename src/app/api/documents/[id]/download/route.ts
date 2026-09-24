import { requireUser } from '@/lib/auth';
import { uuidSchema } from '@/lib/validation';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) return new Response('Not found', { status: 404 });
  const { supabase } = await requireUser();
  const { data: doc } = await supabase.from('documents').select('*').eq('id', id).eq('state', 'ready').single();
  if (!doc) return new Response('Not found', { status: 404 });
  const name = doc.original_name.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 160).replace(/\.[^.]+$/, '') + (doc.mime_type === 'application/pdf' ? '.pdf' : '.webp');
  const { data, error } = await supabase.storage.from('purchase-documents').createSignedUrl(doc.object_key, 60, { download: name });
  if (error) return new Response('Unable to download. Please retry.', { status: 503 });
  return new Response(null, { status: 303, headers: { Location: data.signedUrl, 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
}
