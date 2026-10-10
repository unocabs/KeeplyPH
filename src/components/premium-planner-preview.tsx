import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import styles from './premium.module.css';
export function PremiumPlannerPreview({demo=false,premium=false}:{demo?:boolean;premium?:boolean}) {
 return <section className={styles.preview} aria-label="Household Premium planning"><Sparkles size={28} aria-hidden="true"/><div><span className="eyebrow">{demo?'PREMIUM SAMPLE':premium?'YOUR PREMIUM PLANNER':'PLAN A LITTLE FURTHER AHEAD'}</span><h2>Your household has a bigger picture.</h2><p>{demo?'Explore a year of bills, maintenance and renewals. Open a month and try changing a sample amount.':premium?'Review monthly costs and upcoming obligations across the year, using the records you’ve saved.':'See the next 30 days together, then explore how Premium helps you prepare for the months ahead.'}</p></div><Link className="button secondary" href={(demo?'/demo':'')+'/planner?days='+(demo||premium?'365':'30')}>{demo?'Explore Premium':premium?'Plan my year':'Open household planner'} <ArrowRight size={16}/></Link></section>;
}
