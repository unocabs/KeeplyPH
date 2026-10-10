import Link from 'next/link';
import { ArrowRight, CalendarDays, History, Lightbulb, ReceiptText, Check, FileText } from 'lucide-react';
import { formatDate, todayIn } from '@/lib/domain';
import { sampleItems } from '@/lib/demo';
import { comingUp, dateRows } from '@/features/items/domain';
import { formatTotal, paymentTotal, readinessCopy, sampleInsights } from '@/features/items/insights';
import { ItemIdentityIcon } from './reminder-icon';
import styles from './household-showcase.module.css';

export function HouseholdShowcase() {
  const today = todayIn();
  const items = sampleItems(today);
  const { payments, readiness, week } = sampleInsights(items, today);
  const upcoming = comingUp(dateRows(items), today).slice(0, 2);
  const aircon = items.find(item => item.template_key === 'aircon')!;
  const history = aircon.activity_history!.activities.filter(activity => !activity.voided_at).slice(0, 2);
  const suggestion = readiness.rows[0];
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.parse(today + 'T00:00:00Z') + index * 86400000);
    return { on: date.toISOString().slice(0, 10), day: date.getUTCDate(), label: new Intl.DateTimeFormat('en-PH', { weekday: 'short', timeZone: 'UTC' }).format(date) };
  });

  return <section className={styles.showcase} aria-labelledby="example-title">
    <div className={styles.heading}><div className="eyebrow">A LOOK INSIDE KEEPLY</div><h2 id="example-title">Know what’s next.<br/>Keep what’s done.</h2><p>Plan the week, find a receipt, or look back at the last service. Your household details stay connected.</p></div>
    <p className={styles.sampleNote}>Fictional sample household. These are the same records you can explore in the sample account.</p>
    <div className={styles.grid}>
      <article className={styles.card}>
        <div className={styles.cardTop}><span className={styles.icon}><CalendarDays size={24} aria-hidden="true"/></span><span className={styles.kicker}>A little look ahead</span></div><h3>See the days ahead.</h3><p>Start with your calendar. “This week at home” brings together your saved dates and useful details to check.</p>
        <div className={styles.preview}><div className={styles.previewHeading}><strong>Your next 30 days</strong><span className={styles.previewBadge}>Sample week</span></div><div className={styles.weekStrip} aria-hidden="true">{days.map((day, index) => <div key={day.on} className={index === 0 ? styles.today : undefined}><span>{day.label}</span><strong>{day.day}</strong><i className={upcoming.some(row => row.occurrence.due_on === day.on) ? styles.hasDate : undefined}/></div>)}</div><ul className={styles.dates}>{upcoming.map(row => <li key={row.date.id}><time className={styles.date} dateTime={row.occurrence.due_on}><span>{new Intl.DateTimeFormat('en-PH', {month:'short', timeZone:'UTC'}).format(new Date(row.occurrence.due_on + 'T00:00:00Z'))}</span><strong>{Number(row.occurrence.due_on.slice(-2))}</strong></time><ItemIdentityIcon item={row.item} size={18}/><strong>{row.item.product_name}</strong></li>)}</ul><p className={styles.note}>{week.payment_count} payment {week.payment_count === 1 ? 'date' : 'dates'} this week, based on saved schedules.</p></div>
        <Link href="/demo#planning-heading">Explore the calendar <ArrowRight size={16} aria-hidden="true"/></Link>
      </article>
      <article className={styles.card + ' ' + styles.paymentCard}>
        <div className={styles.cardTop}><span className={styles.icon}><ReceiptText size={24} aria-hidden="true"/></span><span className={styles.kicker}>Make room in the budget</span></div><h3>Plan for payments.</h3><p>See the next 30 days of saved and projected payments. See one total to set aside, add missing amounts and mark payments paid.</p>
        <div className={styles.preview}><div className={styles.previewHeading}><strong>Payments to plan for</strong><span className={styles.previewBadge}>Next 30 days · PHP</span></div><div className={styles.paymentTotal}><strong>{formatTotal(paymentTotal(payments))}</strong><span>to plan for</span></div>{payments.estimated_count>0&&<p className={styles.note}>Includes {payments.estimated_count} {payments.estimated_count===1?'estimate':'estimates'}</p>}{payments.unset_count>0&&<p className={styles.note}>{payments.unset_count} {payments.unset_count===1?'payment needs':'payments need'} an amount</p>}</div>
        <Link href="/demo/items/payments">View sample payments <ArrowRight size={16} aria-hidden="true"/></Link>
      </article>
      <article className={styles.card + ' ' + styles.historyCard}>
        <div className={styles.cardTop}><span className={styles.icon}><History size={24} aria-hidden="true"/></span><span className={styles.kicker}>A record to come back to</span></div><h3>Remember the last service.</h3><p>Keep completed services, payments and renewals with their item. Add actual costs and notes, and correct a record when needed.</p>
        <div className={styles.preview}><div className={styles.previewHeading}><div className={styles.itemHeading}><ItemIdentityIcon item={aircon} size={20}/><strong>Bedroom aircon</strong></div><span className={styles.previewBadge}>Service history</span></div><ol className={styles.history}>{history.map(activity => <li key={activity.id}><span className={styles.historyCheck}><Check size={13} aria-hidden="true"/></span><div><time dateTime={activity.completed_on}>{formatDate(activity.completed_on, true)}</time><strong>{activity.title}</strong>{activity.amount_minor != null && <span className={styles.cost}>{formatTotal(String(activity.amount_minor))} <small>recorded cost</small></span>}</div></li>)}</ol></div>
        <Link href={'/demo/items/' + aircon.id + '#activity-history-heading'}>Open service history <ArrowRight size={16} aria-hidden="true"/></Link>
      </article>
      <article className={styles.card + ' ' + styles.readinessCard}>
        <div className={styles.cardTop}><span className={styles.icon}><Lightbulb size={24} aria-hidden="true"/></span><span className={styles.kicker}>One detail at a time</span></div><h3>Fill in details at your pace.</h3><p>A name is enough to start. Add useful dates as you find them, or mark a detail as not known yet or not applicable.</p>
        <div className={styles.preview}><div className={styles.previewHeading}><strong>Household readiness</strong><span className={styles.previewBadge}>At your pace</span></div><div className={styles.readinessTotal}><strong>{readiness.ready}<span> / {readiness.total}</span></strong><span>items with key details saved<br/>or marked not applicable</span></div><progress value={readiness.ready} max={readiness.total} aria-label="Sample items with key details resolved"/>{suggestion && <div className={styles.suggestion}><ItemIdentityIcon item={items.find(item => item.id === suggestion.item_id)} size={20}/><div><span>A detail to add</span><strong>{suggestion.product_name}</strong><small>{readinessCopy[suggestion.key].label}</small></div></div>}<p className={styles.note}>A guide to record completeness. Optional files never affect it.</p></div>
        <Link href="/demo#readiness-summary-heading">Explore readiness <ArrowRight size={16} aria-hidden="true"/></Link>
      </article>
    </div>
    <div className={styles.footer}><div className={styles.documentNote}><span className={styles.documentIcon}><FileText size={24} aria-hidden="true"/></span><p>Keep purchase details and documents together, too. <Link href="/demo/items/11111111-1111-4111-8111-111111111111">Open a sample receipt and warranty <ArrowRight size={15} aria-hidden="true"/></Link></p></div><Link href="/demo" className="button secondary">Explore a sample account <ArrowRight size={16} aria-hidden="true"/></Link></div>
  </section>;
}
