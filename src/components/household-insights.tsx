import Link from 'next/link';
import { ArrowRight, CalendarDays, Lightbulb, ReceiptText, Sun, CircleAlert } from 'lucide-react';
import { formatDate } from '@/lib/domain';
import { formatTotal, readinessCopy, readinessHref, type HouseholdInsights, type PaymentPlan } from '@/features/items/insights';
import type { ItemWithDetails } from '@/features/items/domain';
import { ItemIdentityIcon } from './reminder-icon';
import styles from './household-insights.module.css';

export function PaymentTotals({plan}:{plan:PaymentPlan}) {
  return <><dl className={styles.totals}>
    <div className={styles.total} data-certainty="confirmed"><dt>Amount checked <span className={styles.totalCount}>· {plan.confirmed_count}</span></dt><dd>{formatTotal(plan.confirmed_minor)}</dd></div>
    <div className={styles.total} data-certainty="estimated"><dt>Estimated <span className={styles.totalCount}>· {plan.estimated_count}</span></dt><dd>{formatTotal(plan.estimated_minor)}</dd></div>
    <div className={styles.total} data-certainty="unverified"><dt>Unverified <span className={styles.totalCount}>· {plan.unverified_count}</span></dt><dd>{formatTotal(plan.unverified_minor)}</dd></div>
  </dl><p className="hint">{plan.unset_count} {plan.unset_count===1?'payment has':'payments have'} no amount saved.</p></>;
}
export function HouseholdWeekSummary({insights,items=[],base='',demo=false}:{insights:HouseholdInsights;items?:ItemWithDetails[];base?:string;demo?:boolean}) {
  const {week,today}=insights, attention=week.overdue_count+week.unconfirmed_count;
  return <section className={styles.brief} aria-labelledby="household-brief-heading">
      <div className={styles.briefHeader}><h3 tabIndex={-1} id="household-brief-heading" className={styles.title}><Sun size={22} aria-hidden="true"/>This week at home</h3><p className={styles.meta}>{formatDate(today,true)} to {formatDate(week.ends_on,true)}{demo?' · Sample':''}</p></div>
      <div className={styles.weekSummary} aria-label="Your week at a glance">
        <Link href={base+'/items?filter=upcoming'}><CalendarDays size={19} aria-hidden="true"/><span><strong>{week.date_count}</strong><small>{week.date_count===1?'date this week':'dates this week'}</small></span><ArrowRight size={15} aria-hidden="true"/></Link>
        <Link href={base+'/items/payments'}><ReceiptText size={19} aria-hidden="true"/><span><strong>{week.payment_count}</strong><small>{week.payment_count===1?'payment this week':'payments this week'}</small></span><ArrowRight size={15} aria-hidden="true"/></Link>
        <Link className={attention ? styles.summaryUrgent : undefined} href={base+'/items?filter=overdue'}><CircleAlert size={19} aria-hidden="true"/><span><strong>{attention}</strong><small>{attention?'need a check':'overdue reminders'}</small></span><ArrowRight size={15} aria-hidden="true"/></Link>
      </div>
      <div className={styles.lines}>
        {week.services.map(service=><Link className={styles.briefItem} key={service.date_id} href={base+'/items/'+service.item_id+'#date-'+service.date_id}><ItemIdentityIcon item={items.find(item=>item.id===service.item_id)} size={21}/><span><strong>{service.product_name}</strong><small>{service.label} · {formatDate(service.due_on,true)}</small></span><ArrowRight size={16} aria-hidden="true"/></Link>)}
      </div>
      {!week.date_count && !week.payment_count && !attention && <p className={styles.quietWeek}>A little breathing room. Your week looks quiet.</p>}
      <p className={styles.footer}>From your saved records. Repeating payments may include projected dates. This summary does not confirm payments or appointments.</p>
    </section>;
}

export function HouseholdInsightCards({insights,items=[],base=''}:{insights:HouseholdInsights;items?:ItemWithDetails[];base?:string}) {
  const {readiness,payments}=insights;
  return <div className={styles.columns}>
      <section className={'panel '+styles.card} aria-labelledby="payment-summary-heading"><h3 tabIndex={-1} id="payment-summary-heading" className={styles.title}><ReceiptText size={21} aria-hidden="true"/>Payments to plan for</h3><p className={styles.meta}>Next 30 days · PHP · {payments.total} saved or projected {payments.total===1?'payment':'payments'}</p><PaymentTotals plan={payments}/><Link className={styles.cardAction} href={base+'/items/payments'}>Review payment amounts <ArrowRight size={16} aria-hidden="true"/></Link><p className={styles.footer}>“Amount checked” means you’ve verified the bill amount for that date. It does not mark it paid. Paid and overdue payments are excluded.</p></section>
      <section className={'panel '+styles.card+' '+styles.detailsCard} aria-labelledby="readiness-summary-heading"><h3 tabIndex={-1} id="readiness-summary-heading" className={styles.title}><Lightbulb size={21} aria-hidden="true"/>Details to add</h3><p className={styles.meta}>{readiness.rows.length ? "A few useful details are missing from your records. Add them whenever you’re ready." : "Keep useful details here, so you don’t have to remember them later."}</p><p className={styles.detailCount}>{readiness.ready} of {readiness.total} items have their relevant key details saved or marked not applicable.</p>{readiness.total>0 && <progress className={styles.progress} value={readiness.ready} max={readiness.total} aria-label="Items with key details resolved"/>}<ul className={styles.suggestions}>{readiness.rows.slice(0,2).map(row=><li key={row.item_id+row.key}><Link href={readinessHref(row.item_id,row.key,base)}><ItemIdentityIcon item={items.find(item=>item.id===row.item_id)} size={21}/><span><strong>{row.product_name}</strong><small>{readinessCopy[row.key].label} to add</small></span><ArrowRight size={15} aria-hidden="true"/></Link></li>)}</ul>{!readiness.rows.length&&<p className="hint spaced">No open suggestions. You can revisit unknown or hidden details on each item.</p>}<Link className={styles.cardAction} href={base+'/items?filter=incomplete'}>Add useful details <ArrowRight size={16} aria-hidden="true"/></Link><p className={styles.footer}>Save it here, so you don’t have to remember it later. {readiness.unknown} {readiness.unknown===1?'detail':'details'} not known yet; {readiness.dismissed} {readiness.dismissed===1?'suggestion':'suggestions'} hidden. Optional files don’t affect this count.</p></section>
  </div>;
}
