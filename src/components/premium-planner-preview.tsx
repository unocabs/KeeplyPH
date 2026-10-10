import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import styles from './premium.module.css';
export function PremiumPlannerPreview({demo=false,premium=false}:{demo?:boolean;premium?:boolean}) {
 return <section className={styles.preview} aria-label="Household Premium planning"><Sparkles size={28} aria-hidden="true"/><div><span className="eyebrow">{demo?'PREMIUM SAMPLE':premium?'YOUR PREMIUM CHECKUP':'KEEPLY PREMIUM'}</span><h2>Understand your next 30 days better</h2><p>{demo?'Explore a sample spending checkup, then review the expenses behind each insight.':premium?'See your highest-cost period, what’s driving your costs, and a practical planning takeaway.':'Your Free calendar and totals stay here. Explore how a Premium spending checkup helps you prepare.'}</p></div><Link className="button secondary" href={(demo?'/demo':'')+'/checkup'}>{demo?'Explore Premium':premium?'Open my checkup':'Explore the checkup'} <ArrowRight size={16}/></Link></section>;
}
