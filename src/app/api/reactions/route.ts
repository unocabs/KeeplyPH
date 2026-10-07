import { z } from 'zod';
import { checkOrigin } from '@/lib/security';
import { isConfigured } from '@/lib/env';
import { adminClient } from '@/lib/supabase/admin';

const input = z.object({ id: z.string().uuid(), reaction: z.enum(['helpful', 'easy', 'love']) }).strict();
function enabled() { return isConfigured() && process.env.PUBLIC_REACTIONS_ENABLED === 'true'; }
const noStore = { 'Cache-Control': 'no-store' };
export async function GET() {
  if (!enabled()) return Response.json({ available: false }, { headers: noStore });
  try {
    const { data, error } = await adminClient().rpc('public_reactions_ready', {});
    return Response.json({ available: !error && data === true }, { headers: noStore });
  } catch { return Response.json({ available: false }, { headers: noStore }); }
}
export async function POST(request: Request) {
  if (!checkOrigin(request)) return new Response(null, { status: 403 });
  if (!enabled()) return new Response(null, { status: 503 });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return new Response(null, { status: 415 });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  let content = '';
  try {
    const decoder = new TextDecoder(); let size = 0;
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 512) { await reader.cancel(); return new Response(null, { status: 413 }); }
      content += decoder.decode(value, { stream: true });
    }
    content += decoder.decode();
  } catch { return new Response(null, { status: 400 }); }
  let parsed;
  try { parsed = input.safeParse(JSON.parse(content)); } catch { return new Response(null, { status: 400 }); }
  if (!parsed.success) return new Response(null, { status: 400 });
  try {
    const { error } = await adminClient().rpc('record_public_reaction', { p_id: parsed.data.id, p_reaction: parsed.data.reaction });
    if (error) return new Response(null, { status: error.message.includes('RATE_LIMIT') ? 429 : 503 });
    return Response.json({ saved: true }, { headers: noStore });
  } catch { return new Response(null, { status: 503 }); }
}
