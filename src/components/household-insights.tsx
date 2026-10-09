import Link from 'next/link';
import { Lightbulb, ReceiptText, Sun } from 'lucide-react';
import { formatDate } from '@/lib/domain';
import { formatTotal, readinessCopy, readinessHref, type HouseholdInsights, type PaymentPlan } from '@/features/items/insights';
import styles from './household-insights.module.css';

export function PaymentTotals({plan}:{plan:PaymentPlan}) {
  return <><dl className={styles.totals}>
    <div className={styles.total}><dt>Confirmed · {plan.confirmed_count}</dt><dd>{formatTotal(plan.confirmed_minor)}</dd></div>
    <div className={styles.total}><dt>Estimated · {plan.estimated_count}</dt><dd>{formatTotal(plan.estimated_minor)}</dd></div>
    <div className={styles.total}><dt>Unverified · {plan.unverified_count}</dt><dd>{formatTotal(plan.unverified_minor)}</dd></div>
  </dl><p className="hint">{plan.unset_count} {plan.unset_count===1?'payment has':'payments have'} no amount saved.</p></>;
}
export function HouseholdInsightCards({insights,base='',demo=false}:{insights:HouseholdInsights;base?:string;demo?:boolean}) {
  const {readiness,week,payments,today}=insights, attention=week.overdue_count+week.unconfirmed_count;
  return <div className={styles.insights}>
    <section className={'panel '+styles.card+' '+styles.brief} aria-labelledby="household-brief-heading">
      <h2 id="household-brief-heading" className={styles.title}><Sun size={22} aria-hidden="true"/>Your household brief</h2>
      <p className={styles.meta}>{formatDate(today,true)} to {formatDate(week.ends_on,true)}{demo?' · Fictional sample':''}</p>
      <p className={styles.briefLead}>{attention ? `${attention} saved ${attention===1?'date or occurrence needs':'dates or occurrences need'} a review.` : week.date_count || week.payment_count ? 'A few saved dates to keep in mind this week.' : 'A quiet week in your saved records.'}</p>
      <div className={styles.lines}>
        <p>{week.payment_count ? <><Link href={base+'/items/payments'}>{week.payment_count} {week.payment_count===1?'payment date':'payment dates'} this week</Link>. Check the amounts before paying.</> : 'No payment dates saved for this week.'}</p>
        {week.services.map(service=><p key={service.date_id}><Link href={base+'/items/'+service.item_id+'#date-'+service.date_id}>{service.product_name}: {service.label}</Link> is saved for {formatDate(service.due_on,true)}.</p>)}
        {readiness.rows[0] && <p><Link href={readinessHref(readiness.rows[0].item_id,readiness.rows[0].key,base)}>One detail to add: {readinessCopy[readiness.rows[0].key].label.toLowerCase()}</Link> for {readiness.rows[0].product_name}.</p>}
        {week.date_count>0 && <p>{week.date_count} saved {week.date_count===1?'date falls':'dates fall'} in the next seven days. <Link href={base+'/items?filter=upcoming'}>Browse upcoming dates</Link>.</p>}
      </div><p className={styles.footer}>Only based on what you’ve saved in Keeply. Repeating payments can include projected dates; this brief does not confirm payments or appointments.</p>
    </section>
    <div className={styles.columns}>
      <section className={'panel '+styles.card} aria-labelledby="payment-summary-heading"><h2 id="payment-summary-heading" className={styles.title}><ReceiptText size={21} aria-hidden="true"/>Payments to plan for</h2><p className={styles.meta}>Next 30 days · PHP · {payments.total} saved or projected {payments.total===1?'payment':'payments'}</p><PaymentTotals plan={payments}/><Link className="text-button spaced" href={base+'/items/payments'}>Review payment amounts →</Link><p className={styles.footer}>Confirmed amounts apply to a single occurrence. Estimates and unverified amounts are shown separately. Completed and overdue payments are excluded.</p></section>
      <section className={'panel '+styles.card} aria-labelledby="readiness-summary-heading"><h2 id="readiness-summary-heading" className={styles.title}><Lightbulb size={21} aria-hidden="true"/>Household readiness</h2><p className={styles.meta}>{readiness.ready} of {readiness.total} items have their relevant key details saved or marked not applicable.</p>{readiness.total>0 && <progress className={styles.progress} value={readiness.ready} max={readiness.total} aria-label="Items with key details resolved"/>}<ul className={styles.suggestions}>{readiness.rows.slice(0,2).map(row=><li key={row.item_id+row.key}><Link href={readinessHref(row.item_id,row.key,base)}><strong>{row.product_name}</strong>{readinessCopy[row.key].label} to add →</Link></li>)}</ul>{!readiness.rows.length&&<p className="hint spaced">No open suggestions. You can revisit unknown or hidden details on each item.</p>}<Link className="text-button spaced" href={base+'/items?filter=incomplete'}>Review incomplete records →</Link><p className={styles.footer}>Record completeness, not a household safety score. {readiness.unknown} details not known yet; {readiness.dismissed} suggestions hidden. Optional file uploads never affect readiness.</p></section>
    </div>
  </div>;
}
