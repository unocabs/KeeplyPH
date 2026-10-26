import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { formatDate, todayIn } from '@/lib/domain';
import { sampleItems } from '@/lib/demo';
import { formatTotal } from '@/features/items/insights';
import { ItemIdentityIcon } from './reminder-icon';
import styles from './household-showcase.module.css';

export function HouseholdShowcase() {
  const items = sampleItems(todayIn());
  const bill = items.find(item => item.reminder_preset === 'internet-bill')!;
  const aircon = items.find(item => item.template_key === 'aircon')!;
  const history = aircon.activity_history!.activities.filter(activity => !activity.voided_at).slice(0, 2);
  const receipt = items.find(item => item.template_key === 'receipt' && item.documents?.length)!;
  const warranty = receipt.dates.find(date => date.kind === 'warranty')?.occurrences.find(occurrence => occurrence.status === 'open');

  return <section id="how-it-works" className={styles.showcase} aria-labelledby="example-title">
    <div className={styles.heading}><div className="eyebrow">A LOOK INSIDE KEEPLY</div><h2 id="example-title">Know what’s next. Keep what’s done.</h2><p>Dates, history and useful records stay with the thing they belong to.</p></div>
    <p className={styles.sampleNote}>Fictional records from the sample account.</p>
    <div className={styles.grid}>
      <article className={styles.card}>
        <span className={styles.kicker}>BILLS &amp; UTILITIES</span><h3>Give the next bill a place.</h3><p>Keep its date and amount together. Record the payment when you’ve handled it.</p>
        <div className={styles.preview}><div className={styles.itemHeading}><ItemIdentityIcon item={bill} size={20}/><strong>{bill.product_name}</strong></div><dl className={styles.details}><div><dt>Next payment</dt><dd>{formatDate(bill.dates[0].occurrences.find(occurrence => occurrence.status === 'open')!.due_on, true)}</dd></div><div><dt>Amount</dt><dd>{formatTotal(String(bill.dates[0].payment_amount_minor))}</dd></div></dl></div>
        <Link href={'/demo/items/' + bill.id}>Open sample bill <ArrowRight size={16} aria-hidden="true"/></Link>
      </article>
      <article className={styles.card}>
        <span className={styles.kicker}>HOME MAINTENANCE</span><h3>Remember the last service.</h3><p>Find the work recorded last time, its cost and the notes you kept.</p>
        <div className={styles.preview}><div className={styles.itemHeading}><ItemIdentityIcon item={aircon} size={20}/><strong>{aircon.product_name}</strong></div><ol className={styles.history}>{history.map(activity => <li key={activity.id}><Check size={14} aria-hidden="true"/><div><time dateTime={activity.completed_on}>{formatDate(activity.completed_on, true)}</time><strong>{activity.title}</strong>{activity.amount_minor != null && <span>{formatTotal(String(activity.amount_minor))} recorded cost</span>}</div></li>)}</ol></div>
        <Link href={'/demo/items/' + aircon.id + '#activity-history-heading'}>Open service history <ArrowRight size={16} aria-hidden="true"/></Link>
      </article>
      <article className={styles.card}>
        <span className={styles.kicker}>PURCHASES &amp; WARRANTIES</span><h3>Find the proof when you need it.</h3><p>Keep the purchase details, receipt and warranty date together for a repair or follow-up.</p>
        <div className={styles.preview}><div className={styles.itemHeading}><ItemIdentityIcon item={receipt} size={20}/><strong>{receipt.product_name}</strong></div><dl className={styles.details}><div><dt>Receipt</dt><dd>Saved with this item</dd></div>{warranty && <div><dt>Warranty date</dt><dd>{formatDate(warranty.due_on, true)}</dd></div>}</dl></div>
        <Link href={'/demo/items/' + receipt.id}>Open receipt and warranty <ArrowRight size={16} aria-hidden="true"/></Link>
      </article>
    </div>
    <nav className={styles.guides} aria-label="Bills, receipts and home maintenance"><Link href="/bill-tracker">Bill tracker guide</Link><Link href="/aircon-cleaning-schedule">Aircon cleaning guide</Link><Link href="/warranty-tracker">Receipt and warranty guide</Link></nav>
  </section>;
}
