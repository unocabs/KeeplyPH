import { verifyCheckout, verifyRefund } from '@/features/billing/reconciliation';
import { adminClient } from '@/lib/supabase/admin';
import { requireEnv } from '@/lib/env';
import { paymentMode } from '@/lib/paymongo';
import { verifyPaymongoSignature } from '@/lib/paymongo-signature';
import { parsePaymongoEvent } from '@/lib/paymongo-event';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  if (process.env.PAYMENTS_ENABLED !== 'true') return new Response('Unavailable', { status: 503 });
  if (Number(request.headers.get('content-length') || 0) > 262144) return new Response('Too large', { status: 413 });
  const reader=request.body?.getReader();if(!reader)return new Response('Missing body',{status:400});
  const decoder=new TextDecoder();let raw='',size=0;
  for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144){await reader.cancel();return new Response('Too large',{status:413});}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();
  try {
    const live = paymentMode();
    if (!verifyPaymongoSignature(raw, request.headers.get('paymongo-signature') || '', requireEnv('PAYMONGO_WEBHOOK_SECRET'), live)) return new Response('Invalid signature', { status: 400 });
    const event = parsePaymongoEvent(JSON.parse(raw)), attributes = event.attributes;
    if (attributes.livemode !== live) return new Response('Invalid environment', { status: 400 });
    const admin = adminClient();
    if (attributes.type === 'checkout_session.payment.paid') {
      if (!/^cs_[A-Za-z0-9]+$/.test(attributes.data.id)) return new Response('Invalid checkout', { status: 400 });
      await verifyCheckout(attributes.data.id, event.id);
    } else if (attributes.type.includes('refund') || attributes.type.includes('dispute')) {
      const paymentId = String(attributes.data.attributes.payment_id || (attributes.data.id.startsWith('pay_') ? attributes.data.id : ''));
      const { error } = await admin.rpc('record_billing_review', { p_event_id: event.id, p_payment_id: paymentId, p_type: attributes.type });
      if (error) throw new Error('Review failed');
      if(attributes.data.id.startsWith('ref_')) await verifyRefund(attributes.data.id);
    }
    return Response.json({ received: true });
  } catch { console.error('paymongo_webhook_processing_failed'); return new Response('Retry later', { status: 500 }); }
}
