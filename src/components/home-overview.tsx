import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { sampleItems } from '@/lib/demo';
import { formatDate, todayIn } from '@/lib/domain';
import { comingUp, dateRows } from '@/features/items/domain';
import { occurrenceAmount } from '@/features/items/planning';
import { paymentDate } from '@/features/templates/categories';
import { formatTotal, paymentTotal, sampleInsights } from '@/features/items/insights';
import { ItemIdentityIcon } from './reminder-icon';
import styles from './home-introduction.module.css';

export function HomeOverview() {
  const today = todayIn();
  const items = sampleItems(today);
  const { payments } = sampleInsights(items, today);
  const upcoming = comingUp(dateRows(items), today).slice(0, 3);

  return <section className={styles.overview} aria-labelledby="home-overview-heading">
    <div className={styles.previewHeading}><h2 id="home-overview-heading">Your next 30 days</h2><span>Sample household</span></div>
    <div className={styles.total}>
      <span>Payments to plan for</span>
      <strong>{formatTotal(paymentTotal(payments))}</strong>
      <p>{payments.estimated_count > 0 && <>Includes {payments.estimated_count} estimates. </>}{payments.unset_count > 0 && <>{payments.unset_count} {payments.unset_count === 1 ? 'amount' : 'amounts'} to add.</>}</p>
    </div>
    <h3>Coming up</h3>
    <ul className={styles.upcoming}>{upcoming.map(row => {
      const amount = occurrenceAmount(row.date, row.occurrence);
      return <li key={row.date.id}>
        <ItemIdentityIcon item={row.item} size={20} />
        <div className={styles.item}><strong>{row.item.product_name}</strong><span>{row.date.label} · {formatDate(row.occurrence.due_on, true)}</span></div>
        <div className={styles.amount}><strong>{amount.amount == null ? paymentDate(row.item.reminder_preset, row.date.kind, row.date.label) ? 'Amount to add' : 'Date to prepare for' : formatTotal(String(amount.amount))}</strong>{amount.amount != null && amount.certainty === 'estimated' && <span>Estimated amount</span>}</div>
      </li>;
    })}</ul>
    <Link href="/demo#planning-heading" className={styles.previewLink}>Explore the calendar <ArrowRight size={16} aria-hidden="true" /></Link>
    <p className={styles.sampleNote}>Fictional records you can explore in the sample account.</p>
  </section>;
}
