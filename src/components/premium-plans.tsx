'use client';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { premiumProducts } from '@/features/premium/products';
import { formatMoney } from '@/lib/domain';
export function PremiumPlans({action,pending=false,enabled=true,awaitingProduct}:{action?:(form:FormData)=>void;pending?:boolean;enabled?:boolean;awaitingProduct?:string}) {
 return <div className="settings-grid slot-plan-grid">{Object.entries(premiumProducts).map(([product,plan])=><section className="panel plan-card" key={product}><span className="eyebrow">KEEPLY PREMIUM</span><h2>{plan.label}</h2><div className="plan-price">{formatMoney(plan.amount)} <small>{plan.period}</small></div><ul className="plan-list"><li><Check size={16}/>Plan up to a year ahead</li><li><Check size={16}/>Explore monthly household costs</li><li><Check size={16}/>Bring bills, maintenance and renewals together</li><li><Check size={16}/>Renew when you choose. No automatic charges.</li></ul>{action?<form action={action}><input type="hidden" name="product" value={product}/><button type="submit" className="button primary wide" disabled={!enabled||pending||Boolean(awaitingProduct&&awaitingProduct!==product)}>{pending?'Preparing checkout…':awaitingProduct===product?'Resume existing checkout':`Choose ${plan.label.toLowerCase()} · ${formatMoney(plan.amount)}`}</button></form>:<Link className="button primary wide" href={'/settings/billing?product='+product}>Explore this plan</Link>}</section>)}</div>;
}
