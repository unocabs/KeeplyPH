'use client';

import Link from 'next/link';
import { useEffect, useEffectEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/domain';
import type { BillingOrder } from './billing';

export function PaymentStatus({ order, returned, support }: { order?: BillingOrder; returned: string; support: string }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [pollingEnded, setPollingEnded] = useState(false);
  const awaiting = order?.status === 'pending';
  const refresh = useEffectEvent(() => {
    if (!refreshing && document.visibilityState === 'visible') startTransition(() => router.refresh());
  });

  useEffect(() => {
    if (!awaiting) return;
    const deadline = Date.now() + 120_000;
    const timer = setInterval(() => {
      if (Date.now() >= deadline) {
        clearInterval(timer);
        setPollingEnded(true);
      } else refresh();
    }, 10_000);
    return () => clearInterval(timer);
  }, [awaiting]);

  const confirmed = order?.status === 'paid';
  return <section className="alert info payment-status space-bottom" aria-labelledby="payment-status-title">
    <div role="status" aria-live="polite">
      <h2 id="payment-status-title">{confirmed ? 'Payment confirmed' : order?.status === 'refunded' ? 'Payment refunded' : order?.status === 'review' ? 'Payment under review' : order?.status === 'expired' ? 'Checkout expired' : awaiting ? pollingEnded ? 'Payment confirmation is taking longer' : returned === 'cancelled' ? 'You returned from checkout' : 'Checking your payment' : 'Check your payment history'}</h2>
      <p>{confirmed ? 'Your purchase is recorded. Your current Premium access is shown below.' : order?.status === 'refunded' ? 'This purchase has been refunded. Your current Premium access is shown below.' : order?.status === 'review' ? 'This payment needs a review. Contact support before making another payment.' : order?.status === 'expired' ? 'This checkout has expired. If you were charged, contact support before paying again.' : awaiting ? pollingEnded ? 'PayMongo has not confirmed this payment yet. Use Refresh status or contact support with the reference below. Please avoid paying again.' : returned === 'cancelled' ? 'Returning or cancelling does not prove whether payment completed. We’ll check for confirmation automatically for up to two minutes. If you paid, avoid paying again.' : 'Your plan activates after verified confirmation from PayMongo. Status refreshes automatically for up to two minutes; please avoid paying again.' : 'We could not match this return to an order in your recent billing history. Check the history below or contact support if you were charged.'}</p>
    </div>
    {order && <p className="payment-reference">{formatMoney(order.amount_minor)} · {order.product?.startsWith('premium_') ? `Premium · ${order.product==='premium_year'?'One year':'30 days'}` : order.slot_count ? `${order.slot_count} extra slots · ${order.product === 'slots_permanent' ? 'One-time purchase' : '30-day access'}` : 'Alert access'}<br/>Reference: <code>{order.id}</code></p>}
    <div className="payment-status-actions"><button type="button" className="text-button" disabled={refreshing} onClick={() => startTransition(() => router.refresh())}>{refreshing ? 'Checking…' : 'Refresh status'}</button><a className="text-button" href={`mailto:${support}?subject=${encodeURIComponent('Keeply payment help' + (order ? ' · ' + order.id : ''))}`}>Contact support</a><Link className="text-button" href="/terms#payment-problems">Payment help &amp; refunds →</Link></div>
  </section>;
}
