'use client';

import Link from 'next/link';
import { useState, useTransition, type ReactNode } from 'react';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { changeDemoPlan } from '@/app/demo/actions';
import type { DemoPlan } from '@/lib/demo-plan';
import styles from './demo-plan-switch.module.css';

function usePlanChange() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  function change(plan: DemoPlan) {
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await changeDemoPlan(plan);
        setError(result.error);
      } catch {
        setError('The sample plan could not be changed. Try again.');
      }
    });
  }
  return { pending, error, change };
}

export function DemoPlanSwitch({ plan }: { plan: DemoPlan }) {
  const { pending, error, change } = usePlanChange();
  return <section className={styles.bar} aria-label="Compare sample plans" data-demo-plan={plan}>
    <div className={styles.intro}><SlidersHorizontal size={19} aria-hidden="true"/><div><strong>Compare Free &amp; Premium</strong><p>Same sample household. See what each plan includes.</p></div></div>
    <div className={styles.controls}>
      <div className={styles.options} role="group" aria-label="Sample plan" aria-busy={pending}>
        {(['free', 'premium'] as const).map(value => <button key={value} type="button" aria-pressed={plan === value} disabled={pending} onClick={() => { if (plan !== value) change(value); }}>{value === 'free' ? 'Free' : 'Premium'}</button>)}
      </div>
      <p className={styles.status} role="status">{pending ? 'Switching sample plan…' : plan === 'free' ? 'Viewing Free sample' : 'Viewing Premium sample'}</p>
    </div>
    <p className={styles.description}>{plan === 'free' ? 'Records, alerts, history and planning for the next 30 days.' : 'Everything in Free, plus spending insights, monthly comparisons and planning up to a year ahead.'}</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
  </section>;
}

export function DemoPremiumButton({ children = 'Switch to Premium sample' }: { children?: ReactNode }) {
  const { pending, error, change } = usePlanChange();
  return <div className={styles.tryPremium}><button type="button" className="button secondary" disabled={pending} onClick={() => change('premium')}>{pending ? 'Switching sample plan…' : children}{!pending && <ArrowRight size={16} aria-hidden="true"/>}</button>{error && <p className={styles.error} role="alert">{error}</p>}</div>;
}

export function DemoCheckupInvitation() {
  return <section className={'panel ' + styles.invitation} aria-labelledby="demo-checkup-invitation">
    <span className="eyebrow">FREE SAMPLE</span><h1 id="demo-checkup-invitation">Spending insights are included with Premium.</h1>
    <p>Your Free sample still includes records, alerts, history, upcoming amounts and your next 30 days. Switch plans above to try the spending checkup with the same fictional expenses.</p>
    <DemoPremiumButton/>
    <Link className="text-button" href="/demo/planner?days=30">Open the Free 30-day plan <ArrowRight size={16} aria-hidden="true"/></Link>
  </section>;
}
