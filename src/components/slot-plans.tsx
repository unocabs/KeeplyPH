'use client';
import Link from 'next/link';
import { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { formatMoney } from '@/lib/domain';
import { MAX_SLOTS, isSlotCount, packPrice, products, type Product } from '@/features/billing/products';

export function SlotPlans({ action, pending = false, enabled = true, permanentSlots = 0, initialSlots = 5, paidUntil }: {
  action?: (form: FormData) => void; pending?: boolean; enabled?: boolean;
  permanentSlots?: number; initialSlots?: number; paidUntil?: string | null;
}) {
  const id = useId();
  const max = MAX_SLOTS - permanentSlots;
  const [selected, setSelected] = useState(isSlotCount(initialSlots) ? initialSlots : 5);
  const slots = Math.min(selected, max);
  if (max < 5) return <section className="panel"><h2>All the room you need.</h2><p className="section-description">You have 100 permanent extra slots, plus your 3 free slots.</p></section>;
  return <>
    <section className="panel slot-selector space-bottom">
      <div className="section-heading"><label htmlFor={id}>How many extra slots?</label><output htmlFor={id} aria-live="polite">{slots} extra slots</output></div>
      <p className="section-description">{permanentSlots + slots + 3} total alert slots, including your 3 free slots{permanentSlots ? ` and ${permanentSlots} permanent slots` : ''}.</p>
      <input id={id} type="range" min="5" max={max} step="5" value={slots} disabled={pending} onChange={e => setSelected(Number(e.target.value))} aria-valuetext={`${slots} extra slots, ${permanentSlots + slots + 3} total`} />
      <div className="slot-scale"><span>5 slots</span>{max >= 25 && <button type="button" className={'slot-best' + (slots === 25 ? ' selected' : '')} disabled={pending} onClick={() => setSelected(25)}>25 slots <span>Best option</span></button>}<span>{max} slots</span></div>
    </section>
    <div className="settings-grid slot-plan-grid">
      {(permanentSlots ? ['slots_permanent'] : ['slots_30', 'slots_permanent']).map(value => {
        const product = value as Product;
        const price = packPrice(product, slots);
        const permanent = product === 'slots_permanent';
        return <section className="panel plan-card" key={product}>
          <div className="section-heading"><h2>+{slots} {permanent ? 'permanent' : 'alert'} slots</h2>{slots === 25 && <span className="best-option">Best option</span>}</div>
          <div className="original-price"><span className="sr-only">Original price: </span><s>{formatMoney(price.originalAmount)}</s></div>
          <div className="plan-price"><span className="sr-only">Current price: </span>{formatMoney(price.amount)} <small>{products[product].period}</small></div>
          <ul className="plan-list"><li><Check size={16}/>{permanentSlots + slots + 3} total alert slots</li><li><Check size={16}/>{permanent ? 'Extra slots stay permanently' : 'Renew manually through PayMongo'}</li><li><Check size={16}/>{permanent ? 'One-time payment' : 'No automatic charges'}</li></ul>
          {!permanent && paidUntil && <p className="hint space-bottom">Your next 30-day term starts after your prepaid time ends. The selected slot count applies to that next term.</p>}
          {permanent && paidUntil && <p className="hint space-bottom">Permanent slots replace your temporary pack immediately. Unused time is not automatically refunded.</p>}
          {action ? <form action={action}><input type="hidden" name="product" value={product}/><input type="hidden" name="slots" value={slots}/><button className="button primary wide" disabled={!enabled || pending}>{pending ? 'Preparing checkout…' : `${!permanent && paidUntil ? 'Renew' : 'Add'} ${slots} slots · ${formatMoney(price.amount)}`}</button></form> : <Link href="/add" className="button primary wide">Create your account</Link>}
        </section>;
      })}
    </div>
  </>;
}
