import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import type {Usage} from '@/lib/domain';
import {premiumExpiry,premiumExpiryHeading} from '@/features/premium/discovery';
import styles from './premium.module.css';
export function PremiumPlannerPreview({demo=false,usage}:{demo?:boolean;usage:Usage}) {
 const premium=usage.household_premium,expired=!demo&&premiumExpiry(usage);
 return <section className={styles.preview} aria-label="Household Premium planning" data-premium-surface="dashboard" data-premium-preview="" data-premium-expired={expired?'':undefined}><Sparkles size={24} aria-hidden="true"/><div><span className="eyebrow">{demo?'PREMIUM SAMPLE':premium?'YOUR PREMIUM CHECKUP':'KEEPLY PREMIUM'}</span><h2>{expired?premiumExpiryHeading(usage):'Understand your next 30 days better'}</h2><p>{demo?'Explore a sample spending checkup, then review the expenses behind each insight.':premium?'See your highest-cost period, what’s driving your costs, and a practical planning takeaway.':expired?'Your records, history, alerts and next 30 days are still here. Continue organising for free, or unlock Premium planning again.':'See your highest-cost period, what contributes most, and where amounts are still missing. Your Free calendar and totals stay available.'}</p>{!premium&&!demo&&<p>₱59 for 30 days · ₱499 for one year · No automatic renewal</p>}</div><div className={styles.previewActions}><Link className="button secondary" href={(demo?'/demo':'')+'/checkup'}>{demo?'Explore Premium':premium?'Open my checkup':'Explore the checkup'} <ArrowRight size={16}/></Link>{!premium&&!demo&&<Link className="text-button" href="/demo/checkup" data-premium-event="premium_sample_opened">Explore a sample account</Link>}</div></section>;
}
