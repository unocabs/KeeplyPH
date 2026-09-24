import { Resend } from 'resend';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { requireEnv } from '@/lib/env';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 262144) return new Response('Too large', { status: 413 });
  let event: unknown;
  try {
    event = new Resend(requireEnv('RESEND_API_KEY')).webhooks.verify({ payload: raw, headers: { id: request.headers.get('svix-id') || '', timestamp: request.headers.get('svix-timestamp') || '', signature: request.headers.get('svix-signature') || '' }, webhookSecret: requireEnv('RESEND_WEBHOOK_SECRET') });
  } catch { return new Response('Invalid signature', { status: 400 }); }
  const parsed = z.object({ type: z.string(), data: z.object({ email_id: z.string() }) }).safeParse(event);
  if (!parsed.success) return Response.json({ ignored: true });
  if (!['email.delivered', 'email.bounced', 'email.complained'].includes(parsed.data.type)) return Response.json({ ignored: true });
  const { error } = await adminClient().rpc('record_email_event', { p_id: parsed.data.data.email_id, p_type: parsed.data.type });
  return error ? new Response('Retry later', { status: 500 }) : Response.json({ received: true });
}
