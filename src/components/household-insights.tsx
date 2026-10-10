import Link from 'next/link';
import { ArrowRight, CalendarDays, Lightbulb, ReceiptText, Sun, CircleAlert } from 'lucide-react';
import { formatDate } from '@/lib/domain';
import { formatTotal, paymentTotal, type HouseholdInsights, type PaymentPlan } from '@/features/items/insights';
import type { ItemWithDetails } from '@/features/items/domain';
import { ItemIdentityIcon, DateIcon } from './reminder-icon';
import styles from './household-insights.module.css';
import { ReadinessSuggestions } from './readiness-suggestions';

export function PaymentTotals({plan}:{plan:PaymentPlan}) {
  const known=plan.confirmed_count+plan.estimated_count+plan.unverified_count;
  return <div className={styles.paymentBudget}>
    {known>0 ? <p className={styles.budgetAmount}>{formatTotal(paymentTotal(plan))}<span>{paymentTotal(plan)==='0'?'Saved amounts total zero':plan.unset_count>0?'Known upcoming costs':'Upcoming costs to prepare for'}</span></p> : <p className={styles.budgetEmpty}>{plan.total>0?'Amounts not added yet':'No upcoming expenses'}</p>}
    {plan.estimated_count>0&&<p className={styles.budgetNote}>{formatTotal(plan.estimated_minor)} of this total is estimated.</p>}
    {plan.unverified_count>0&&<p className={styles.budgetNote}>{formatTotal(plan.unverified_minor)} uses saved amounts you haven’t confirmed.</p>}
    {plan.unset_count>0&&<div className={styles.budgetGuidance}><p><strong>Make your spending picture more accurate</strong></p><p>{plan.unset_count} upcoming {plan.unset_count===1?'expense needs':'expenses need'} an amount. Add an estimate to include {plan.unset_count===1?'it':'them'} in your total.</p></div>}
    {plan.total===0&&<p className={styles.budgetNote}>Add bills, renewals, or expected maintenance costs to build your upcoming spending picture.</p>}
  </div>;
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
        {week.services.map(service=><Link className={styles.briefItem} key={service.date_id} href={base+'/items/'+service.item_id+'#date-'+service.date_id}><ItemIdentityIcon item={items.find(item=>item.id===service.item_id)} size={21}/><span><strong className={styles.serviceAction}><DateIcon kind="service" size={17}/>{service.label}</strong><small>{service.product_name}</small><small>{formatDate(service.due_on,true)}</small></span><ArrowRight size={16} aria-hidden="true"/></Link>)}
      </div>
      {!week.date_count && !week.payment_count && !attention && <p className={styles.quietWeek}>A little breathing room. Your week looks quiet.</p>}
      <p className={styles.footer}>Payments include saved payment schedules and dates with an expected cost. Add a cost to include a service or renewal. Repeating payments may include projected dates. This summary does not confirm payments or appointments.</p>
    </section>;
}

export function HouseholdInsightCards({insights,items=[],base='',scope='preview'}:{insights:HouseholdInsights;items?:ItemWithDetails[];base?:string;scope?:string}) {
  const {readiness,payments}=insights;
  return <div className={styles.columns}>
      <section className={'panel '+styles.card} aria-labelledby="payment-summary-heading"><h3 tabIndex={-1} id="payment-summary-heading" className={styles.title}><ReceiptText size={21} aria-hidden="true"/>Your Total Household Spending</h3><p className={styles.meta}>Next 30 days · {formatDate(payments.today,true)} to {formatDate(payments.ends_on,true)}</p><p className={styles.meta}>Based on the expenses you&apos;ve added to Keeply.</p><PaymentTotals plan={payments}/><Link className={styles.cardAction} href={base+(payments.total===0?'/add?category=bills':'/items/payments')}>{payments.total===0?'Add a household expense':payments.unset_count>0?'Add missing amounts':'View payments'} <ArrowRight size={16} aria-hidden="true"/></Link><p className={styles.footer}>Upcoming saved amounts and repeating schedules. Paid, completed, and overdue dates are excluded.</p></section>
      <section className={'panel '+styles.card+' '+styles.detailsCard} aria-labelledby="readiness-summary-heading"><h3 tabIndex={-1} id="readiness-summary-heading" className={styles.title}><Lightbulb size={21} aria-hidden="true"/>Details to add</h3><p className={styles.meta}>{readiness.rows.length ? "A few useful details are missing from your records. Add them whenever you’re ready." : "Keep useful details here, so you don’t have to remember them later."}</p><p className={styles.detailCount}>{readiness.ready} of {readiness.total} items have their relevant key details saved or marked not applicable.</p>{readiness.total>0 && <progress className={styles.progress} value={readiness.ready} max={readiness.total} aria-label="Items with key details resolved"/>}<ReadinessSuggestions readiness={readiness} items={items} base={base} scope={scope}/><Link className={styles.cardAction} href={base+'/items?filter=incomplete'}>Add useful details <ArrowRight size={16} aria-hidden="true"/></Link><p className={styles.footer}>Save it here, so you don’t have to remember it later.</p></section>
  </div>;
}
