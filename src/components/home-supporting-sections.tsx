import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PremiumPlanningExample } from './premium-planning-example';
import styles from './home-supporting-sections.module.css';

export function HomeSupportingSections() {
  return <>
    <PremiumPlanningExample />
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

  </>;
}
