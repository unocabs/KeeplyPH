'use client';
import Link from 'next/link';
import { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { formatMoney } from '@/lib/domain';
import { MAX_SLOTS, isSlotCount, packPrice, products, type Product } from '@/features/billing/products';

export function SlotPlans({ action, pending = false, enabled = true, permanentSlots = 0, initialSlots = 5, freeSlots = 3, paidUntil, preferredProduct }: {
  action?: (form: FormData) => void; pending?: boolean; enabled?: boolean;
  permanentSlots?: number; initialSlots?: number; freeSlots?: number; paidUntil?: string | null; preferredProduct?: Product;
}) {
  const id = useId();
  const max = MAX_SLOTS - permanentSlots;
  const [selected, setSelected] = useState(isSlotCount(initialSlots) ? initialSlots : 5);
  const slots = Math.min(selected, max);
  if (max < 5) return <section className="panel"><h2>All the room you need.</h2><p className="section-description">You have 100 permanent extra slots, plus your {freeSlots} free slots.</p></section>;
  return <>
    <section className="panel slot-selector space-bottom">
      <div className="section-heading"><label htmlFor={id}>How many more items need alerts?</label><output htmlFor={id} aria-live="polite">{slots} extra slots</output></div>
      <p className="section-description">Alerts for {permanentSlots + slots + freeSlots} items in total, including your {freeSlots} free slots{permanentSlots ? ` and ${permanentSlots} permanent slots` : ''}. Multiple dates on one item share a slot.</p>
      <input id={id} type="range" min="5" max={max} step="5" value={slots} disabled={pending} onChange={e => setSelected(Number(e.target.value))} aria-valuetext={`${slots} extra slots, ${permanentSlots + slots + freeSlots} total`} />
      <div className="slot-scale"><span>5 slots</span>{max >= 25 && <button type="button" className={'slot-best' + (slots === 25 ? ' selected' : '')} disabled={pending} onClick={() => setSelected(25)} aria-describedby={`${id}-recommendation`}>25 slots</button>}<span>{max} slots</span></div>
      {max >= 25 && <p className="slot-recommendation" id={`${id}-recommendation`}><strong>Managing several household obligations?</strong> Room for bills, installments, subscriptions, IDs and renewals, with space for the next thing you want to keep. Choose fewer or more to fit your needs.</p>}
    </section>
    <div className="settings-grid slot-plan-grid">
      {(permanentSlots ? ['slots_permanent'] : ['slots_30', 'slots_permanent']).map(value => {
        const product = value as Product;
        const price = packPrice(product, slots);
        const permanent = product === 'slots_permanent';
        return <section className={'panel plan-card' + (preferredProduct === product ? ' selected-plan' : '')} key={product}>
          <div className="section-heading"><h2>{permanent ? 'One-time purchase' : '30-day access'}</h2></div>
          {preferredProduct === product && <p className="hint spaced">Your selected option · review before paying</p>}

          <div className="plan-price"><span className="sr-only">Current price: </span>{formatMoney(price.amount)} <small>{products[product].period}</small></div>
          <ul className="plan-list"><li><Check size={16}/>{slots} extra items with alerts · {permanentSlots + slots + freeSlots} total</li><li><Check size={16}/>{permanent ? 'No renewal or scheduled expiry' : 'Renew manually through PayMongo'}</li><li><Check size={16}/>{permanent ? 'One payment for the selected slots' : 'No automatic charges'}</li></ul>
          <p className="plan-terms">{permanent ? <>Purchased slots remain available while Keeply operates. <Link href="/terms#permanent-access">What permanent means →</Link></> : 'When access expires, extra alerts pause. Your saved reminders stay accessible.'}</p>
          {!permanent && paidUntil && <p className="hint space-bottom">Your next 30-day term starts after your prepaid time ends. The selected slot count applies to that next term.</p>}
          {permanent && paidUntil && <p className="hint space-bottom">Permanent slots replace your temporary pack immediately. Unused time is not automatically refunded.</p>}
          {/* A full navigation prevents prefetched auth redirects from reusing a different pack's return path. */}
          {action ? <form action={action}><input type="hidden" name="product" value={product}/><input type="hidden" name="slots" value={slots}/><button className="button primary wide" disabled={!enabled || pending}>{pending ? 'Preparing checkout…' : `${!permanent && paidUntil ? 'Renew' : 'Add'} ${slots} slots · ${formatMoney(price.amount)}`}</button></form> : <a href={`/settings/billing?slots=${slots}&product=${product}`} className="button primary wide">Continue with this option</a>}
        </section>;
      })}
    </div>
  </>;
}
