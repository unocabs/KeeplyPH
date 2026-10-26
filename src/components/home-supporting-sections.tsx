import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { sampleItems } from '@/lib/demo';
import { formatDate, todayIn } from '@/lib/domain';
import { formatTotal } from '@/features/items/insights';
import { samplePlannerRows } from '@/features/premium/planner';
import { sampleOutlook } from '@/features/premium/outlook';
import { ItemIdentityIcon } from './reminder-icon';
import styles from './home-supporting-sections.module.css';

const monthFormat = new Intl.DateTimeFormat('en-PH', { month: 'short', year: 'numeric', timeZone: 'UTC' });

export function HomeSupportingSections() {
  const today = todayIn();
  const plan = sampleOutlook(samplePlannerRows(sampleItems(today), today, 365), today, 365);
  const months = plan.months.slice(0, 3);
  const payments = plan.rows.filter(row => row.cost_expected).slice(0, 3);

  return <>
    <div className={styles.toolsGrid}>
      <section id="loan-payments" className={styles.photoCard} aria-labelledby="home-loan-heading">
        <div className={styles.photo}>
          <Image src="/images/bills/bills-desk.webp" alt="A lavender folder, neatly arranged paperwork and a pencil in soft daylight." fill sizes="(max-width: 720px) calc(100vw - 40px), (max-width: 760px) calc(100vw - 60px), (max-width: 1100px) calc((100vw - 84px) / 2), 508px" />
        </div>
        <div className={styles.cardBody}>
          <h2 id="home-loan-heading">Keep recurring payments organised.</h2>
          <p>Keep loan payment dates, amounts and payment history together. Set a repeat schedule that matches your provider’s dates.</p>
          <div className={styles.actions}>
            <Link className="button secondary" href="/add/other?preset=personal-loan">Add a loan reminder <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link className={styles.guideLink} href="/loan-payment-reminder">Explore loan payments <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
      <section className={styles.photoCard} aria-labelledby="home-registration-heading">
        <div className={styles.photo}>
          <Image src="/images/lto/registration-paperwork.webp" alt="A car key beside a lavender folder and paperwork on a sunlit cream table." fill sizes="(max-width: 720px) calc(100vw - 40px), (max-width: 760px) calc(100vw - 60px), (max-width: 1100px) calc((100vw - 84px) / 2), 508px" />
        </div>
        <div className={styles.cardBody}>
          <h2 id="home-registration-heading">Know when your car registration is due.</h2>
          <p>Check your plate-based renewal window, prepare the requirements and save the date you confirm.</p>
          <div className={styles.actions}>
            <Link className="button secondary" href="/lto-registration-renewal#renewal-calculator">Check my renewal schedule <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </div>

    <section className={styles.premium} aria-labelledby="home-premium-heading">
      <div className={styles.premiumCopy}>
        <span className={styles.premiumLabel}>Keeply Premium</span>
        <h2 id="home-premium-heading">A clearer view of the months ahead.</h2>
        <p>See upcoming household dates and costs together, up to a year ahead.</p>
        <Link className="button primary" href="/demo/planner?days=365">Explore a sample account <ArrowRight size={17} aria-hidden="true" /></Link>
        <p className={styles.offer}>Install Keeply and open it while signed in for a one-time 30-day Premium gift. No card required.</p>
      </div>
      <div className={styles.plannerPreview} role="group" aria-labelledby="home-planner-heading">
        <div className={styles.previewHeading}>
          <h3 id="home-planner-heading">Your months ahead</h3>
          <span className={styles.sampleLabel}>Sample household</span>
        </div>
        <p className={styles.period}>{formatDate(today, true)} to {formatDate(months.at(-1)!.ends_on, true)}</p>
        <p className={styles.costLabel}>Known upcoming costs</p>
        <dl className={styles.months}>
          {months.map(month => <div key={month.month}>
            <dt><time dateTime={month.month.slice(0, 7)}>{monthFormat.format(new Date(month.month + 'T00:00:00Z'))}</time></dt>
            <dd><strong>{month.costs.known_count > 0 || month.costs.unset_count === 0 ? formatTotal(month.total_minor) : 'Amounts to add'}</strong>
              {month.estimated_count > 0 && <span>Includes estimates</span>}
              {month.unset_count > 0 && <span>{month.unset_count} {month.unset_count === 1 ? 'amount' : 'amounts'} to add</span>}
            </dd>
          </div>)}
        </dl>
        <h4 className={styles.paymentsHeading}>Next payments</h4>
        <ol className={styles.payments}>
          {payments.map(row => <li key={row.date_id + ':' + row.due_on}>
            <ItemIdentityIcon item={row.identity} size={20} />
            <div className={styles.paymentIdentity}><strong>{row.product_name}</strong><time dateTime={row.due_on}>{formatDate(row.due_on, true)}</time></div>
            <div className={styles.paymentAmount}><strong>{row.amount_minor == null ? 'Amount to add' : formatTotal(String(row.amount_minor))}</strong>{row.certainty === 'estimated' && <span>Estimated amount</span>}</div>
          </li>)}
        </ol>
        <p className={styles.previewNote}>Fictional records from the sample account. Missing amounts can change the totals.</p>
      </div>
    </section>
  </>;
}
