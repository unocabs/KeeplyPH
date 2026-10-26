import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { sampleItems } from '@/lib/demo';
import { formatDate, todayIn } from '@/lib/domain';
import { formatTotal } from '@/features/items/insights';
import { samplePlannerRows } from '@/features/premium/planner';
import { partialMonth, sampleOutlook } from '@/features/premium/outlook';
import { ItemIdentityIcon } from './reminder-icon';
import styles from './premium-planning-example.module.css';

const monthFormat = new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthName = (month: string) => monthFormat.format(new Date(month + 'T00:00:00Z'));

export function PremiumPlanningExample() {
  const today = todayIn();
  const rows = samplePlannerRows(sampleItems(today), today, 365);
  const plan = sampleOutlook(rows, today, 365);
  // Compare complete calendar months, so a partial current month cannot imply a saving.
  const months = plan.months.filter(month => !partialMonth(month)).slice(0, 2);
  const highlighted = months.reduce((highest, month) => BigInt(month.total_minor) > BigInt(highest.total_minor) ? month : highest);
  const expenses = rows.filter(row => row.cost_expected && row.due_on.slice(0, 7) === highlighted.month.slice(0, 7));
  const contributors = highlighted.contributors.slice(0, 2).flatMap(contributor => {
    const row = expenses.find(expense => expense.date_id === contributor.date_id);
    return row ? [{ ...contributor, identity: row.identity }] : [];
  });

  return <section className={styles.example} aria-labelledby="premium-example-heading">
    <div className={styles.copy}>
      <span className="eyebrow">KEEPLY PREMIUM</span>
      <h2 id="premium-example-heading">See a costly month before it gets close.</h2>
      <p>Regular bills are only part of the picture. Look ahead at saved maintenance, instalments and renewals, then see which expenses make a month cost more.</p>
      <p className={styles.planDifference}>Free helps you organise the next 30 days. Premium lets you compare the months ahead, up to a year.</p>
      <Link className="button primary" href="/demo/planner?days=365">Explore a sample account <ArrowRight size={17} aria-hidden="true" /></Link>
      <p className={styles.offer}>Install Keeply and open it while signed in for a one-time 30-day Premium gift. No card required. No automatic charges.</p>
    </div>
    <div className={styles.preview} role="group" aria-label="Sample monthly cost comparison">
      <div className={styles.previewHeading}><h3>Two months, different costs</h3><span>Sample household</span></div>
      <p className={styles.caption}>Saved upcoming costs, including projected dates.</p>
      <dl className={styles.months}>{months.map(month => <div key={month.month}>
        <dt><time dateTime={month.month.slice(0, 7)}>{monthName(month.month)}</time></dt>
        <dd><strong>{month.costs.known_count > 0 || month.costs.unset_count === 0 ? formatTotal(month.total_minor) : 'Amounts to add'}</strong>
          {month.estimated_count > 0 && <span>Includes estimates</span>}
          {month.unset_count > 0 && <span>{month.unset_count} {month.unset_count === 1 ? 'amount' : 'amounts'} to add</span>}
        </dd>
      </div>)}</dl>
      <h4>Some expenses in {monthName(highlighted.month)}</h4>
      <ul className={styles.expenses}>{contributors.map(contributor => <li key={contributor.date_id}>
        <ItemIdentityIcon item={contributor.identity} size={20} />
        <div className={styles.identity}><strong>{contributor.product_name}</strong><span>{contributor.label}</span></div>
        <div className={styles.amount}><strong>{formatTotal(contributor.costs.total_minor)}</strong>{expenses.some(expense => expense.date_id === contributor.date_id && expense.certainty === 'estimated') && <span>Includes estimates</span>}</div>
      </li>)}</ul>
      <Link className={styles.detailLink} href={'/demo/planner?' + new URLSearchParams({ days: '365', month: highlighted.month }) + '#outlook-selected-heading'}>See all expenses for this month <ArrowRight size={16} aria-hidden="true" /></Link>
      <p className={styles.note}>Fictional records from {formatDate(today, true)}. Totals cover saved expenses, not a complete household budget. Estimates and missing amounts can change them.</p>
    </div>
  </section>;
}
