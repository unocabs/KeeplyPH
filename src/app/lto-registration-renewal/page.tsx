import { headers } from 'next/headers';
import { PublicAuthLink } from '@/components/public-auth-link';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Brand } from '@/components/brand';
import styles from './page.module.css';
import { PlateChecker } from './plate-checker';
import { DocumentPreview } from './document-preview';

const title = 'LTO Car Registration Renewal & Date Calculator';
const description = 'Check your LTO car registration renewal schedule with a free plate number calculator. Find requirements, fees, online steps and answers for your next renewal.';
const charter = 'https://lto.gov.ph/wp-content/uploads/2025/11/MV-CC-2025.pdf';
const externalCharter = 'https://lto.gov.ph/wp-content/uploads/2025/09/LTO-CC-2025-External.pdf';
const manual = 'https://lto.gov.ph/wp-content/uploads/2023/10/FDM-vol.-2-2nd-Edition.pdf';
const ncr = 'https://www.ltoncr.com/renewal-of-motor-vehicle-mv-registration/';
const plateMemo = 'https://lto.gov.ph/wp-content/uploads/2023/08/Memo_04122023_.pdf';
const pageUrl = 'https://www.keeplyph.com/lto-registration-renewal';
const reminder = '/add/car?focus=registration';
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October'];

export const metadata: Metadata = {
  title: { absolute: title }, description,
  alternates: { canonical: '/lto-registration-renewal' },
  openGraph: { title, description, url: '/lto-registration-renewal', siteName: 'Keeply PH', locale: 'en_PH', type: 'article' },
  twitter: { card: 'summary_large_image', title, description },
};

export default async function Page() {
  const nonce = (await headers()).get('x-nonce') || undefined;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article', '@id': pageUrl + '#guide',
        headline: title, description, url: pageUrl, mainEntityOfPage: pageUrl,
        inLanguage: 'en-PH', dateModified: '2026-10-01',
        author: { '@type': 'Organization', name: 'Keeply PH', url: 'https://www.keeplyph.com' },
        publisher: { '@type': 'Organization', name: 'Keeply PH', url: 'https://www.keeplyph.com' },
        citation: [charter, externalCharter, manual, ncr, plateMemo],
      },
      {
        '@type': 'BreadcrumbList', '@id': pageUrl + '#breadcrumb',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.keeplyph.com' },
          { '@type': 'ListItem', position: 2, name: 'LTO registration renewal', item: pageUrl },
        ],
      },
    ],
  };
  return <>
    <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <nav className="public-nav" aria-label="Main navigation"><Brand /><div><Link href="/vehicle-registration-reminder">Vehicle reminders</Link><PublicAuthLink /></div></nav>
    <main id="main-content" className={styles.guide}>
      <header className={styles.hero}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true"> / </span><span>LTO registration renewal</span></nav>
        <div className="eyebrow">FREE TOOL FOR PHILIPPINE CAR OWNERS</div>
        <h1>LTO car registration renewal<br /><em>&amp; date calculator</em></h1>
        <p className={styles.intro}>Find your renewal schedule, prepare the right documents, and plan your next visit. Start with the free plate number calculator, then follow the car registration renewal guide below.</p>
        <p className={styles.review}>By <a href="#sources">Keeply PH</a> · Guide updated <time dateTime="2026-10-01">October 1, 2026</time> · Based on official LTO sources.</p>
        <div className="hero-actions"><a href="#renewal-calculator" className="button primary">Check my renewal schedule ↓</a><a href="#requirements" className="button secondary">See renewal requirements</a></div>
        <p className={styles.disclosure}>This guide covers vehicle registration, not driver’s license renewal. Keeply PH is an independent reminder app; renewal transactions are completed through LTO.</p>
      </header>
      <nav className={styles.jump} aria-label="On this page">{[['renewal-calculator','Renewal date calculator'],['renewal-overview','Quick guide'],['schedule','Plate number schedule'],['requirements','Requirements'],['steps','Steps'],['costs','Costs'],['special-cases','Special cases'],['questions','Questions'],['sources','Sources']].map(([id,label]) => <a key={id} href={'#'+id}>{label}</a>)}</nav>

      <PlateChecker currentYear={Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date()))} />

      <section id="renewal-overview" className={`${styles.section} ${styles.overview}`} aria-labelledby="overview-heading">
        <h2 id="overview-heading">How to renew your car registration in the Philippines</h2>
        <p>Start with your schedule, then choose the renewal route that applies to your vehicle.</p>
        <ol className={styles.overviewSteps}>
          <li><a href="#renewal-calculator">Check your renewal schedule</a><p>Find the standard plate-based window and confirm the deadline in your vehicle record.</p></li>
          <li><a href="#requirements">Prepare insurance and inspection requirements</a><p>Confirm the applicable inspection route and which records your providers must transmit.</p></li>
          <li><a href="#steps">Renew through LTMS or an LTO office</a><p>Check online eligibility before choosing the portal or a walk-in transaction.</p></li>
          <li><a href="#costs">Pay the assessment and keep your Official Receipt</a><p>Plan for the applicable fees, then save your confirmed next renewal date as a reminder.</p></li>
        </ol>
      </section>

      <section id="requirements" className={styles.section}>
        <span className={styles.number}>01 / PREPARE</span><h2>LTO car registration renewal requirements</h2>
        <p>Here’s where to get each document. Click a document name to see an illustrated example. The notes explain which version you need for your renewal route.</p>
        <div className={styles.tableWrap}><table><caption>Private-car renewal checklist</caption><thead><tr><th scope="col">What you need</th><th scope="col">Where to get it</th></tr></thead><tbody>
          <tr><th scope="row"><DocumentPreview kind="orcr" /><small className={styles.itemNote}>Photocopy for initial renewal in MVIRS only; not required for online renewal.</small></th><td>Use your existing vehicle documents issued by LTO. If they are missing, contact the LTO office that holds your registration record.</td></tr>
          <tr><th scope="row"><DocumentPreview kind="coc" /><small className={styles.itemNote}>The insurance record must be electronically authenticated.</small></th><td>Buy the required Compulsory Third Party Liability (CTPL) cover from an Insurance Commission-accredited insurer or its authorized seller. Ask them to confirm transmission for LTO renewal.</td></tr>
          <tr><th scope="row"><DocumentPreview kind="inspection" /><small className={styles.itemNote}>Online renewal uses the electronically transmitted PMVIC report. The LTO MVIR alternative is for the applicable walk-in route.</small></th><td>Bring your car to a Private Motor Vehicle Inspection Center (PMVIC) for its transmitted report, or ask an LTO district/extension office about the Motor Vehicle Inspection Report (MVIR) route.</td></tr>
          <tr><th scope="row"><DocumentPreview kind="cec" /><small className={styles.itemNote}>For the MVIR route when the vehicle was not inspected at a PMVIC; electric vehicles are excluded. This route does not support online renewal.</small></th><td>Visit an accredited Private Emission Testing Center (PETC). The center conducts the test and electronically transmits the certificate.</td></tr>
        </tbody></table></div>
        <p className={styles.source}>Source: <a href={charter}>LTO 2025 motor-vehicle Citizen’s Charter, renewal checklist (printed page 205 onward)</a>.</p>
        <aside className={styles.note}><strong>Check the inspection route before booking.</strong><p>The checklist gives alternatives. Ask your provider which report it transmits and confirm that it supports your intended renewal route.</p></aside>
      </section>

      <section id="schedule" className={styles.section}>
        <span className={styles.number}>02 / CHECK YOUR DATES</span><h2>Car registration renewal schedule by plate number <a className={styles.headingAnchor} href="#schedule" aria-label="Link to registration schedule">🔗</a></h2>
        <p>In LTO’s standard staggered schedule, the last plate digit gives the month and the second-to-last digit gives the working-day window.</p>
        <div className={styles.columns}>
          <div className={styles.tableWrap}><table><caption>Registration month</caption><thead><tr><th scope="col">Last digit</th><th scope="col">Month</th></tr></thead><tbody>{months.map((month,index)=><tr key={month}><th scope="row">{(index+1)%10}</th><td>{month}</td></tr>)}</tbody></table></div>
          <div><div className={styles.tableWrap}><table><caption>Working days within that month</caption><thead><tr><th scope="col">Second-to-last digit</th><th scope="col">Window</th></tr></thead><tbody>{[['1, 2, 3','1st–7th'],['4, 5, 6','8th–14th'],['7, 8','15th–21st'],['9, 0','22nd–last day']].map(([digit,window])=><tr key={digit}><th scope="row">{digit}</th><td>{window}</td></tr>)}</tbody></table></div>
          </div>
        </div>
        <p className={styles.source}>Source: <a href={manual}>LTO Filipino Driver’s Manual, volume 2, second edition, printed page 17</a>.</p>
        <aside className={styles.note}><strong>Confirm the year and any exceptions.</strong><p>Check your vehicle record and current <a href="https://lto.gov.ph/">LTO advisories</a> before choosing a date. For first renewals, missing or special plates, holidays or announced extensions, ask LTO which deadline applies.</p></aside>
      </section>

      <section id="steps" className={styles.section}>
        <span className={styles.number}>03 / COMPLETE YOUR RENEWAL</span><h2>How to renew car registration online or at an LTO office</h2>
        <div className={styles.columns}>
          <div className={styles.route}><span className="badge none">LTMS portal</span><h3>Online renewal through the LTMS portal</h3><p>The charter lists a previous LTMS renewal transaction as a condition.</p><ol><li>Log into LTMS and validate requirements.</li><li>Select payment and save the application confirmation.</li><li>Pay and receive the Official Receipt by email.</li></ol><p>Inspection still requires a physical vehicle check. If your vehicle or renewal is unavailable in your account, ask LTO to check your record.</p><a className="text-button" href="https://portal.lto.gov.ph/">Open the official LTMS portal ↗</a><p className={styles.source}><a href={charter}>2025 charter, printed page 208</a></p></div>
          <div className={styles.route}><span className="badge none">LTO office</span><h3>Walk-in renewal at an LTO office</h3><ol><li>Prepare the requirements for your vehicle and chosen inspection route.</li><li>At an authorized district or extension office, provide your Client ID for requirement validation.</li><li>LTO processes the application confirmation and any applicable approvals.</li><li>Pay the assessed fees and keep your Official Receipt.</li></ol><p>Allow time for preparation, provider visits and queues.</p><p className={styles.source}><a href={externalCharter}>2025 external-services charter, individual walk-in procedure</a>; <a href={ncr}>LTO NCR receipt guidance</a>.</p></div>
        </div>
      </section>

      <section id="costs" className={styles.section}>
        <span className={styles.number}>04 / PLAN YOUR BUDGET</span><h2>LTO car registration renewal fees and budget</h2>
        <p>For an on-time renewal of a light passenger car in the ₱1,600 MVUC category, use <strong>about ₱3,000 as a starting budget</strong>. This is an illustrative budget, not an LTO quotation or a cap.</p>
        <div className={styles.note}><strong>Example: ₱1,600 + ₱610.40 + ₱600 = ₱2,810.40</strong><p>This adds a light-car registration charge, a published one-year CTPL price, and a ₱600 inspection assumption. Round up to about ₱3,000, then add any other assessed fees. The inspection assumption comes from the 2021 reduced-fee benchmark; confirm today’s price with your center.</p></div>
        <dl className={styles.costs}>
          <div><dt>Registration / MVUC</dt><dd><strong>₱1,600 in this example.</strong> LTO’s table lists that rate for light passenger cars up to 1,600 kg in its 2001-onward category. Medium and heavy categories list ₱3,600 and ₱8,000 respectively for 2001-onward models. Check the classification and gross vehicle weight on your record; SUVs and utility vehicles have separate schedules.</dd></div>
          <div><dt>CTPL insurance</dt><dd><strong>₱610.40 for one year</strong> is the published private-car/utility-vehicle price from BDO Insure used here. Confirm your provider’s current total. This is CTPL, not comprehensive insurance.</dd></div>
          <div><dt>Inspection</dt><dd><strong>₱600 assumed in the example.</strong> This is a historical reduced-fee benchmark, not a verified current quote. Ask your chosen center for its current price and what it includes before booking.</dd></div>
          <div><dt>Excluded from the example</dt><dd>Other LTO-assessed charges, payment-channel fees, late penalties, repairs, retests and any additional transactions. A heavier vehicle or a different classification can cost substantially more.</dd></div>
        </dl>
        <aside className={styles.penaltyCta} aria-labelledby="penalty-reminder-title"><div><span className="eyebrow">PLAN AHEAD FOR RENEWAL</span><h3 id="penalty-reminder-title">A heads-up before late fees become a worry.</h3><p>Give yourself time to arrange insurance, inspection and renewal. Save your confirmed deadline in Keeply and choose alerts before it’s due.</p><p className={styles.disclosure}>You still complete the renewal with LTO. Reminders help you plan; they do not extend your deadline or waive penalties.</p></div><Link className="button primary" href={reminder}>Remind me before renewal →</Link></aside>
        <p className={styles.source}>Budget inputs checked September 30, 2026: <a href={manual}>LTO MVUC table, printed page 21</a>; <a href="https://www.bdo.com.ph/bdo-insure/personal/ctpl">BDO Insure’s published CTPL prices</a>; <a href="https://www.pna.gov.ph/articles/1131822">2021 DOTr reduced-inspection-fee announcement, reported by PNA</a>. Confirm the current LTO assessment and provider quotes.</p>
      </section>

      <section id="special-cases" className={styles.section}>
        <span className={styles.number}>05 / CHECK BEFORE YOU GO</span><h2>Special cases and additional renewal documents</h2>
        <p>LTO NCR identifies additional requirements for tax-exempt and special-economic-zone vehicles, for-hire vehicles, stolen and recovered vehicles, and reactivation from storage.</p>
        <ul><li><strong>For-hire vehicles:</strong> franchise documentation applies; tricycles have permit requirements.</li><li><strong>Stolen and recovered vehicles:</strong> recovery and alarm-related documents apply.</li><li><strong>Stored vehicles:</strong> the Receipt of Return Plate and Licenses is among the requirements.</li></ul>
        <p className={styles.source}><a href={ncr}>Read LTO NCR’s additional requirements</a> and confirm the current checklist with the handling office.</p>
        <p>For a first renewal, overdue registration, changed ownership or missing records, get vehicle-specific instructions from LTO before relying on this private-car guide.</p>
      </section>

      <section id="questions" className={`${styles.section} ${styles.faq}`}>
        <h2>Car registration renewal questions</h2>
        <details><summary>Can I complete my first car registration renewal online?</summary><p>The <a href={charter}>2025 LTO motor-vehicle Citizen’s Charter</a> lists a previous LTMS renewal transaction as an online-renewal condition. If this is your first renewal, check with the handling LTO office rather than assuming your vehicle is eligible for the portal.</p></details>
        <details><summary>Can I renew my car registration early?</summary><p>Advance renewal is covered in LTO guidance, including examples two months before the scheduled renewal in its <a href={plateMemo}>April 2023 plate-transition memorandum</a>. Ask LTO to confirm how early you can renew and the applicable assessment for your vehicle before booking.</p></details>
        <details><summary>How do I check my renewal date if my permanent plate is missing or has changed?</summary><p>Use your current OR/CR and ask the handling LTO office to confirm your schedule. The <a href={plateMemo}>LTO plate-transition memorandum</a> addresses registration adjustments when a permanent plate is issued. This calculator supports regular plates; it does not determine a deadline from a conduction sticker, temporary plate or changed registration record.</p></details>
        <details><summary>What should I do if my car registration is overdue?</summary><p>Contact LTO with your current vehicle documents to confirm the renewal requirements and assessed fees, including any applicable penalties. The calculator shows a standard window, not whether your registration is still valid. See the <a href={ncr}>LTO NCR renewal guidance</a> for the transaction checklist; a reminder does not extend your registration.</p></details>
        <details><summary>How do I check my car registration renewal date?</summary><p>Use the <a href="#renewal-calculator">LTO renewal date calculator</a> with your plate’s last two digits and the renewal year from your registration record. It shows the standard month and date window. Confirm your actual deadline with your current documents or LTO, especially for a first renewal or an announced extension.</p></details>
        <details><summary>Can I check my LTO renewal schedule without entering my full plate number?</summary><p>Yes. The calculator only needs the last two digits. Your entry stays in your browser, and checking the schedule does not require an account.</p></details>
        <details><summary>Which requirements should I prepare?</summary><p>Start with the <a href="#requirements">conditional checklist</a>. The inspection route and online eligibility matter, so confirm those before paying a provider.</p></details>
        <details><summary>Do I need both PMVIC inspection and separate emissions testing?</summary><p>Do not treat the inspection alternatives as a requirement to buy both. Check the <a href="#requirements">inspection and CEC conditions</a> with your chosen provider and LTO.</p></details>
        <details><summary>Can every car owner renew online?</summary><p>Check the <a href="#steps">online eligibility and steps</a> before choosing that route. If the portal cannot process your vehicle, contact LTO for guidance.</p></details>
        <details><summary>Is this the same as driver’s license renewal?</summary><p>No. This guide is about registering a vehicle. A driver’s license is a separate document and renewal transaction.</p></details>
        <details><summary>Can Keeply renew my registration?</summary><p>Keeply stores the date you confirm and sends alerts you choose. It does not submit a renewal, calculate an official deadline or collect LTO fees.</p></details>
      </section>

      <section className={styles.cta}><span className="eyebrow">ONE LESS DATE TO REMEMBER</span><h2>Know your renewal date?<br />Give yourself a heads-up.</h2><p>Add your car, enter the date you’ve confirmed, and choose reminders. No full plate number is needed.</p><Link className="button primary" href={reminder}>Set my renewal reminder →</Link><p className={styles.disclosure}>Google sign-in is required to save. Alerts are optional.</p><Link className="text-button" href="/vehicle-registration-reminder">Explore Keeply’s vehicle reminders →</Link></section>

      <section id="sources" className={`${styles.section} ${styles.sources}`}><h2>Official sources and review notes</h2><p>Original source excerpts reviewed September 30, 2026; additional online-eligibility and plate-transition excerpts checked October 1, 2026. Prepared by Keeply PH using official LTO publications. Direct access to the LTO PDFs was unavailable during review, so the relevant indexed excerpts were used alongside official supporting material. These sources may be updated by later LTO issuances. Confirm your transaction’s requirements and assessment with LTO.</p><ul><li><a href={charter}>LTO 2025 motor-vehicle Citizen’s Charter</a> — renewal checklist and portal process, printed pages 205 onward.</li><li><a href={externalCharter}>LTO 2025 external-services Citizen’s Charter</a> — individual walk-in procedure.</li><li><a href={manual}>LTO Filipino Driver’s Manual, volume 2</a> — standard registration schedule, printed page 17.</li><li><a href={plateMemo}>LTO April 2023 plate-transition memorandum</a> — registration adjustments and advance-renewal examples.</li><li><a href={ncr}>LTO NCR motor-vehicle renewal guidance</a> — special cases and receipt guidance.</li><li><a href="https://portal.lto.gov.ph/">Official LTMS portal</a> · <a href="https://lto.gov.ph/">LTO announcements and services</a></li></ul></section>
    </main>
  </>;
}
