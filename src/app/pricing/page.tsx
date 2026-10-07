import Link from 'next/link';
import { Check } from 'lucide-react';
import { SlotPlans } from '@/components/slot-plans';
import { Brand } from '@/components/brand';
import { configuredPaymentMethods } from '@/lib/paymongo';
export const metadata = {
  title: 'Pricing — free alerts & extra slots',
  description: 'Save unlimited items with 3 free alert slots. Choose 5–100 extra slots, from ₱29 per 30 days or ₱249 permanently. Manual renewal, no automatic charges.',
  alternates: { canonical: '/pricing' },
};
export default function PricingPage() {
  const methods = configuredPaymentMethods();
  const paymentsEnabled = process.env.PAYMENTS_ENABLED === 'true' && methods.length > 0;
  return <><nav className="public-nav"><Brand /><Link href="/add" className="button primary">Get started</Link></nav><main className="landing" id="main-content"><div className="landing-hero"><div className="eyebrow">SIMPLE PLANS. LESS TO THINK ABOUT.</div><h1>Start small.<br /><em>Keep a little more.</em></h1><p>Save unlimited items. Get alerts for 3 items free.</p><p className="pricing-explanation">Multiple dates on the same item count as one alert slot. Pay only when more items need alerts.</p></div><section className="panel free-plan space-bottom"><div><h2>Free</h2><div className="plan-price">₱0 <small>no payment needed</small></div></div><ul className="plan-list"><li><Check size={16}/>Unlimited saved items</li><li><Check size={16}/>Alerts for 3 items, with multiple dates each</li><li><Check size={16}/>100 MB of private file storage</li></ul><Link href="/add" className="button secondary">Start for free</Link></section><SlotPlans/>
  <section className="panel pricing-payment spaced" aria-labelledby="payment-title"><h2 id="payment-title">Know what happens when you pay.</h2>{paymentsEnabled ? <p>Checkout is handled by PayMongo. Configured methods: {methods.join(', ')}. Available methods are shown at checkout.</p> : <p>Paid checkout is not open yet. You can start with your free account.</p>}<p>The selected quantity and price are shown before payment. Your alerts become available after payment is verified; returning from checkout alone does not activate a pack. Keeply does not store your full card details.</p><div className="related-tools"><Link href="/terms#payment-problems">Payment help &amp; refund requests →</Link><Link href="/privacy#contact">Contact Keeply →</Link></div></section>
  <p className="privacy-note">File-enabled templates support up to 6 files, 10 MB each. Alert packs do not add file storage. Prices in Philippine pesos.</p><p className="hint centered">Alerts are optional. Email is the default; browser notifications depend on your device and settings. SMS is coming soon.</p></main></>;
}
