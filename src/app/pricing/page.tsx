import Link from 'next/link';
import { Check } from 'lucide-react';
import { SlotPlans } from '@/components/slot-plans';
import { Brand } from '@/components/brand';
export const metadata = {
  title: 'Pricing — free alerts & extra slots',
  description: 'Save unlimited reminders with 3 free alert slots. Choose 5–100 extra slots, from ₱29 per 30 days or ₱249 permanently. Manual renewal, no automatic charges.',
  alternates: { canonical: '/pricing' },
};
export default function PricingPage() { return <><nav className="public-nav"><Brand /><Link href="/add" className="button primary">Get started</Link></nav><main className="landing" id="main-content"><div className="landing-hero"><div className="eyebrow">SIMPLE PLANS. LESS TO THINK ABOUT.</div><h1>Start small.<br /><em>Keep a little more.</em></h1><p>Keep as many things as you need. Your first 3 alert slots are free.</p></div><section className="panel free-plan space-bottom"><div><h2>Free</h2><div className="plan-price">₱0 <small>to start</small></div></div><ul className="plan-list"><li><Check size={16}/>Unlimited saved reminders</li><li><Check size={16}/>3 alert slots</li><li><Check size={16}/>100 MB of private file storage</li></ul><Link href="/add" className="button secondary">Start for free</Link></section><SlotPlans/><p className="privacy-note">All enabled dates on a reminder share one slot. File-enabled templates support up to 6 files, 10 MB each. Alert packs do not add file storage. Prices in Philippine pesos.</p><p className="hint centered">Alerts are a helpful nudge, not a guarantee of coverage. Check the seller’s warranty terms.</p></main></>; }
