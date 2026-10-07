'use server';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { appUrl } from '@/lib/env';
import { checkoutSchema, paymongo, paymentMode, validCheckoutUrl } from '@/lib/paymongo';
import { errorMessage } from '@/lib/errors';
import { isProduct, isSlotCount, packPrice, packDescription } from './products';
import type { ActionResult } from '@/lib/domain';
type Order = { id: string; create_checkout: boolean; checkout_url: string | null; slot_count: number; amount_minor: number };
export async function startCheckout(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  if (process.env.PAYMENTS_ENABLED !== 'true') return { error: 'Payments are not available yet. Your Free account is ready to use.' };
  const { profile } = await requireUser();
  const product = String(form.get('product') || '');
  if (!isProduct(product)) return { error: 'Choose an alert pack.' };
  const slots = Number(form.get('slots'));
  if (!isSlotCount(slots)) return { error: 'Choose 5–100 slots in increments of 5.' };
  let url = '';
  try {
    const live = paymentMode();
    const { data, error } = await adminClient().rpc('create_pack_order', { p_user: profile.id, p_id: crypto.randomUUID(), p_product: product, p_live: live, p_slots: slots });
    if (error) return { error: errorMessage(error) };
    const order = data as unknown as Order;
    if (order.slot_count !== slots || order.amount_minor !== packPrice(product, slots).amount) throw new Error('Unexpected order price');
    if (order.checkout_url && validCheckoutUrl(order.checkout_url)) url = order.checkout_url;
    else if (!order.create_checkout) return { error: 'Your checkout is still being prepared. Refresh shortly. If this continues, contact support with the order reference in your billing history.' };
    else {
      const methods = (process.env.PAYMONGO_PAYMENT_METHODS || 'qrph').split(',').map(s => s.trim());
      if (!methods.length || methods.some(m => !['card', 'gcash', 'paymaya', 'qrph'].includes(m))) throw new Error('Invalid payment method');
      const result = checkoutSchema.parse(await paymongo('/v2/checkout_sessions', {
        line_items: [{ name: `${slots} ${product === 'slots_30' ? 'alert slots — 30 days' : 'permanent alert slots'}`, amount: order.amount_minor, currency: 'PHP', quantity: 1 }],
        payment_method_types: methods, reference_number: order.id, metadata: { keeply_order_id: order.id },
        success_url: appUrl() + '/settings/billing?payment=return&order=' + order.id,
        cancel_url: appUrl() + '/settings/billing?payment=cancelled&order=' + order.id, send_email_receipt: true,
        description: packDescription(product, slots), pass_on_fees: false,
      }));
      url = result.data.attributes.checkout_url || '';
      if (result.data.attributes.livemode !== live || !validCheckoutUrl(url)) throw new Error('Unexpected checkout');
      const { error: attachError } = await adminClient().rpc('attach_checkout', { p_id: order.id, p_checkout_id: result.data.id, p_url: url });
      if (attachError) throw new Error('Unable to attach checkout');
    }
  } catch { return { error: 'We could not open checkout. Please refresh shortly; avoid paying again if you already completed payment.' }; }
  redirect(url);
}
