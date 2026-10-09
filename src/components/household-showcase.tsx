import Link from 'next/link';
import { ArrowRight, CalendarDays, History, Lightbulb, ReceiptText } from 'lucide-react';
import { formatDate, todayIn } from '@/lib/domain';
import { sampleItems } from '@/lib/demo';
import { comingUp, dateRows } from '@/features/items/domain';
import { formatTotal, readinessCopy, sampleInsights } from '@/features/items/insights';
import styles from './household-showcase.module.css';

export function HouseholdShowcase() {
  const today = todayIn();
  const items = sampleItems(today);
  const { payments, readiness, week } = sampleInsights(items, today);
  const upcoming = comingUp(dateRows(items), today).slice(0, 2);
  const aircon = items.find(item => item.template_key === 'aircon')!;
  const history = aircon.activity_history!.activities.filter(activity => !activity.voided_at).slice(0, 2);
  const suggestion = readiness.rows[0];

  return <section className={styles.showcase} aria-labelledby="example-title">
    <div className={styles.heading}><div className="eyebrow">A LOOK INSIDE KEEPLY</div><h2 id="example-title">Know what’s next.<br/>Keep what’s done.</h2><p>Plan the week, find a receipt, or look back at the last service. Your household details stay connected.</p></div>
    <p className={styles.sampleNote}>Fictional sample household. These are the same records you can explore in the sample account.</p>
    <div className={styles.grid}>
      <article className={styles.card}>
        <span className={styles.icon}><CalendarDays size={23} aria-hidden="true"/></span><h3>See the days ahead.</h3><p>Start with your calendar. Your household brief brings together the week’s saved dates and details to check.</p>
        <div className={styles.preview}><div className={styles.previewHeading}><strong>Your next 30 days</strong><span>Sample</span></div><ul className={styles.dates}>{upcoming.map(row => <li key={row.date.id}><time className={styles.date} dateTime={row.occurrence.due_on}>{new Intl.DateTimeFormat('en-PH', {month:'short', day:'numeric', timeZone:'UTC'}).format(new Date(row.occurrence.due_on + 'T00:00:00Z'))}</time><strong>{row.item.product_name}</strong></li>)}</ul><p className={styles.note}>{week.payment_count} payment {week.payment_count === 1 ? 'date' : 'dates'} this week, based on saved schedules.</p></div>
        <Link href="/demo#planning-heading">Explore the calendar <ArrowRight size={16} aria-hidden="true"/></Link>
      </article>
      <article className={styles.card}>
        <span className={styles.icon}><ReceiptText size={23} aria-hidden="true"/></span><h3>Plan for payments.</h3><p>See the next 30 days of saved and projected payments, with confirmed amounts, estimates and unverified figures kept separate.</p>
        <div className={styles.preview}><div className={styles.previewHeading}><strong>Payments to plan for</strong><span>PHP</span></div><dl className={styles.totals}><div><dt>Confirmed</dt><dd>{formatTotal(payments.confirmed_minor)}</dd></div><div><dt>Estimated</dt><dd>{formatTotal(payments.estimated_minor)}</dd></div><div><dt>Unverified</dt><dd>{formatTotal(payments.unverified_minor)}</dd></div></dl><p className={styles.note}>{payments.unset_count} {payments.unset_count === 1 ? 'payment has' : 'payments have'} no amount saved. Confirming an amount does not mark it paid.</p></div>
        <Link href="/demo/items/payments">Review sample payments <ArrowRight size={16} aria-hidden="true"/></Link>
      </article>
      <article className={styles.card}>
        <span className={styles.icon}><History size={23} aria-hidden="true"/></span><h3>Remember the last service.</h3><p>Keep completed services, payments and renewals with their item. Add actual costs and notes, and correct a record when needed.</p>
        <div className={styles.preview}><div className={styles.previewHeading}><strong>Bedroom aircon</strong><span>History</span></div><ol className={styles.history}>{history.map(activity => <li key={activity.id}><span>{formatDate(activity.completed_on, true)}</span><strong>{activity.title}</strong>{activity.amount_minor != null && <span>{formatTotal(String(activity.amount_minor))} recorded cost</span>}</li>)}</ol></div>
        <Link href={'/demo/items/' + aircon.id + '#activity-history-heading'}>Open service history <ArrowRight size={16} aria-hidden="true"/></Link>
      </article>
      <article className={styles.card}>
        <span className={styles.icon}><Lightbulb size={23} aria-hidden="true"/></span><h3>Fill in details at your pace.</h3><p>A name is enough to start. Add useful dates as you find them, or mark a detail as not known yet or not applicable.</p>
        <div className={styles.preview}><div className={styles.previewHeading}><strong>Household readiness</strong><span>{readiness.ready}/{readiness.total}</span></div><progress value={readiness.ready} max={readiness.total} aria-label="Sample items with key details resolved"/><p className={styles.note}>Items with key details saved or marked not applicable.</p>{suggestion && <p className={styles.suggestion}><strong>{suggestion.product_name}</strong>{readinessCopy[suggestion.key].label} to add</p>}<p className={styles.note}>A guide to record completeness. Optional files never affect it.</p></div>
        <Link href="/demo#readiness-summary-heading">Explore readiness <ArrowRight size={16} aria-hidden="true"/></Link>
      </article>
    </div>
    <div className={styles.footer}><p>Keep purchase details and documents together, too. <Link href="/demo/items/11111111-1111-4111-8111-111111111111">Open a sample receipt and warranty →</Link></p><Link href="/demo" className="button secondary">Explore a sample account <ArrowRight size={16} aria-hidden="true"/></Link></div>
  </section>;
}
