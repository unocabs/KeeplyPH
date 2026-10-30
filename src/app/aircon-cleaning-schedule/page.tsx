import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Check, ClipboardCheck, Wind } from 'lucide-react';
import { Brand } from '@/components/brand';
import { PublicAuthLink } from '@/components/public-auth-link';
import { ReminderIcon } from '@/components/reminder-icon';
import { todayIn } from '@/lib/domain';
import { CleaningPlanner } from './cleaning-planner';
import styles from './page.module.css';

const title = 'Aircon Cleaning Schedule: When, What & Cost';
const description = 'Plan your next aircon cleaning date, compare published service prices and quote inclusions, and prepare for the visit. A practical household guide from Keeply.';
const pageUrl = 'https://www.keeplyph.com/aircon-cleaning-schedule';
const sources = {
  midea: 'https://www.midea.com/ph/news/aircon-cleaning-schedule-in-the-philippines--filters--self-cleaning--and-professional-deep-cleaning',
  daikin: 'https://www.daikin.com/products/ac/services/maintenance_tips',
  panasonic: 'https://www.panasonic.com/ph/air-solutions/learn-more/how-to-clean-your-ac-unit-servicing.html',
  teko: 'https://www.teko.ph/accredited-aircon-cleaning-services',
  ezy: 'https://ezy-lifestyle.com/our-services/aircon-cleaning/',
  samsung: 'https://www.samsung.com/ph/support/home-appliances/what-should-i-do-when-water-drops-fall-from-my-air-conditioner/',
};
const photo = '/images/aircon/household-aircon.webp';

export const metadata: Metadata = {
  title, description, alternates: { canonical: '/aircon-cleaning-schedule' },
  openGraph: { title, description, url: '/aircon-cleaning-schedule', type: 'article', locale: 'en_PH', siteName: 'Keeply', images: [{ url: photo, alt: 'A wall-mounted aircon in a quiet household room.' }] },
  twitter: { card: 'summary_large_image', title, description, images: [photo] },
};

const before = [
  ['Share the useful details.', 'Send the model, unit type, running hours, last service date and access photos. Describe any existing noise, smell, dripping or cooling problem.'],
  ['Agree access and the total.', 'For a condo, check work permits and allowed hours. For a rental, agree who authorises and pays. Confirm the written scope, extra-work approval and cancellation terms.'],
  ['Make room for the visit.', 'Clear the area and arrange protection for furniture and electronics. Check the manufacturer’s warranty conditions if the unit is still covered.'],
];
const after = [
  ['See it running.', 'Ask the technician to demonstrate operation and drainage, and check for any new dripping or noise before they leave.'],
  ['Understand what was done.', 'Ask which components were cleaned, what remained inaccessible and whether anything needs further assessment. Agree the next interval for your actual use.'],
  ['Keep the proof and contact.', 'Get a receipt, the actual amount paid, a note of approved extra work and the provider’s follow-up terms. Keep these with the unit’s record.'],
];
const questions = [
  ['Every three months ba talaga?', <>The interval depends on your model, use and condition. The <a href="#schedule">manufacturer usage bands</a> are starting guidance. Ask your technician about occasional use, dusty rooms or longer operating hours.</>],
  ['Does an inverter aircon need less cleaning?', <>The inverter label alone does not determine a cleaning interval. Check your model’s maintenance instructions, filter types and actual condition. A self-clean feature still has limits.</>],
  ['Can a filter rinse move the professional cleaning date?', <>Keep it as a separate task. It does not show that the coils, blower or drainage were serviced. Keep your professional-service plan unless your technician changes it.</>],
  ['Is outdoor-unit cleaning included in a split-type quote?', <>Ask explicitly and send an access photo. The <a href="#cost">provider examples</a> list different scopes. Confirm both the indoor and outdoor work in writing.</>],
  ['Do I need pull-down cleaning every time?', <>Ask what condition or access problem requires extra disassembly, what will be removed and the full additional cost. A listed surcharge does not establish when your unit needs that work.</>],
  ['What if I don’t know the previous cleaning date?', <>Ask the landlord or previous provider for the service record. If it is unavailable, tell the technician the history is unknown and arrange an assessment. Start your record from work actually completed.</>],
  ['What does the planner save?', <>The planned next date and your chosen interval open in an editable Aircon Maintenance form. It does not create a past service entry or start an automatic repeating schedule. Choose alerts if you want them, then submit to save.</>],
  ['Can I keep the original purchase receipt and warranty?', <>Use a <Link href="/warranty-tracker">purchase and warranty record</Link> for the original receipt and coverage dates. Keep service receipts and findings with your aircon maintenance record. Coverage follows the manufacturer’s or seller’s terms.</>],
] as const;

export default async function Page() {
  const nonce = (await headers()).get('x-nonce') || undefined;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Article', '@id': pageUrl + '#guide', headline: title, description, url: pageUrl, image: 'https://www.keeplyph.com' + photo,
        mainEntityOfPage: pageUrl, inLanguage: 'en-PH', datePublished: '2026-10-04', dateModified: '2026-10-29',
        author: { '@type': 'Organization', name: 'Keeply', url: 'https://www.keeplyph.com' },
        publisher: { '@type': 'Organization', name: 'Keeply', url: 'https://www.keeplyph.com' }, citation: Object.values(sources) },
      { '@type': 'BreadcrumbList', '@id': pageUrl + '#breadcrumb', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.keeplyph.com' },
        { '@type': 'ListItem', position: 2, name: 'Aircon cleaning schedule', item: pageUrl },
      ] },
    ],
  };
  return <div className={styles.page}>
    <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <nav className={`public-nav ${styles.nav}`} aria-label="Main navigation"><Brand showAppType /><div><Link href="/warranty-tracker">Receipts &amp; warranties</Link><PublicAuthLink /></div></nav>
    <main id="main-content" className={styles.container}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Aircon cleaning schedule</span></nav>
      <div className={styles.opening}>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>LOOKING AFTER THE THINGS AT HOME</span>
          <h1>Kailan magpapalinis<br className={styles.desktopBreak} /> ng aircon?<br /><em>Plan the next clean.</em></h1>
          <p className={styles.intro}>Know when to arrange a visit, compare what’s included, and keep a useful record afterwards. A little less guessing, a little more care for home.</p>
          <div className={styles.actions}><a className={styles.primary} href="#cleaning-planner">Plan my next clean <ArrowRight size={17} aria-hidden="true" /></a><a className={styles.inlineLink} href="#cost">Compare cleaning quotes <ArrowRight size={16} aria-hidden="true" /></a></div>
          <p className={styles.review}>By <a href="#sources">Keeply</a> · Reviewed <time dateTime="2026-10-29">October 29, 2026</time><br />Manufacturer guidance and published service prices.</p>
        </header>
        <aside className={styles.quickAnswer} aria-label="Two tasks, two schedules">
          <div><Wind size={21} aria-hidden="true" /><p><strong>Filters: every 2–4 weeks</strong><span>Check your model’s care instructions. Some filters are not washable.</span></p></div>
          <div><CalendarDays size={21} aria-hidden="true" /><p><strong>Professional clean: about 3–6 months</strong><span><a href={sources.midea}>Midea’s starting guidance</a>. Your manual and technician guide your own interval.</span></p></div>
        </aside>
        <nav className={styles.jump} aria-label="In this guide"><a href="#cleaning-planner">Plan a clean</a><a href="#cost">Compare quotes</a><a href="#booking-checklist">Prepare for service</a><a href="#filter-care">Care between visits</a></nav>
        <CleaningPlanner today={todayIn()} />
        <figure className={styles.heroPhoto}><Image src={photo} width={1448} height={1086} sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1200px) 46vw, 520px" loading="eager" alt="A white wall-mounted aircon above a wooden cabinet, with soft daylight through a linen curtain." /><figcaption>Care for the unit. Keep the useful details.</figcaption></figure>
      </div>

      <section id="schedule" className={`${styles.section} ${styles.editorial}`} aria-labelledby="schedule-title">
        <div className={styles.sectionIntro}><span className={styles.eyebrow}>01 / CHOOSE YOUR INTERVAL</span><h2 id="schedule-title">A schedule that fits<br /><em>how you use it.</em></h2><p>A bedroom aircon and an always-on unit need different plans. Use these manufacturer examples to start a conversation with your technician.</p><a className={styles.inlineLink} href="#cleaning-planner">Back to the planner <ArrowRight size={16} aria-hidden="true" /></a></div>
        <div><div className={styles.tableWrap}><table><caption>Midea’s professional-cleaning usage bands</caption><thead><tr><th scope="col">Daily use</th><th scope="col">Starting interval</th></tr></thead><tbody><tr><th scope="row">4–6 hours</th><td>6 months</td></tr><tr><th scope="row">6–10 hours</th><td>4 months</td></tr><tr><th scope="row">Around the clock</th><td>3 months</td></tr></tbody></table></div><p className={styles.source}>Source: <a href={sources.midea}>Midea Philippines</a>. These bands overlap at six hours and do not cover every usage pattern. Ask your technician about the interval for your unit.</p><p>Dust, pets and smoke can change maintenance needs. <a href={sources.panasonic}>Panasonic Philippines</a> recommends servicing at least every six months. Check the care instructions for your exact model and review the plan if the unit’s condition changes.</p></div>
      </section>

      <section id="cost" className={styles.section} aria-labelledby="cost-title">
        <div className={styles.wideIntro}><span className={styles.eyebrow}>02 / KNOW WHAT YOU’RE PAYING FOR</span><h2 id="cost-title">Compare the whole visit.<br /><em>Then compare the price.</em></h2><p>These are two providers’ published examples, checked October 29, 2026. They are starting prices, not national averages or a quote for your home.</p></div>
        <div className={`${styles.tableWrap} ${styles.quoteTable}`}><table role="table"><caption>Published cleaning prices and scope</caption><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Provider &amp; area</th><th scope="col" role="columnheader">Published base rate</th><th scope="col" role="columnheader">Listed scope</th><th scope="col" role="columnheader">Ask before you book</th></tr></thead><tbody role="rowgroup">
          <tr role="row"><th scope="row" role="rowheader"><a href={sources.teko}>Teko</a><span className={styles.cellNote}>Metro Manila, Laguna and key areas in Cavite</span></th><td role="cell" data-label="Base rate"><strong>Window: ₱990</strong><br /><strong>Split: ₱1,775</strong><span className={styles.cellNote}>Multipoint: per indoor unit.</span></td><td role="cell" data-label="Listed scope">Inspection, pressure washing, filter and drain-line cleaning.</td><td role="cell" data-label="Check the total">Window additions: ₱250 for inverter and ₱250 above 1.5 HP. Split pull-down: +₱4,500. Confirm outdoor work, access charges, VAT and transport.</td></tr>
          <tr role="row"><th scope="row" role="rowheader"><a href={sources.ezy}>EZY Lifestyle</a><span className={styles.cellNote}>Makati-based. Confirm coverage for your address.</span></th><td role="cell" data-label="Base rate"><strong>Window: ₱1,320</strong><br /><strong>Split: ₱1,650</strong><span className={styles.cellNote}>VAT and transport are additional.</span></td><td role="cell" data-label="Listed scope">Inspection, coil, filter, fin and drain cleaning; outdoor components and leakage check.</td><td role="cell" data-label="Check the total">Repairs and refrigerant charges are excluded. Ask for the VAT, transport, access fees and final total.</td></tr>
        </tbody></table></div>
        <p className={styles.source}>Confirm current prices, service coverage and written inclusions directly. Teko’s page does not explicitly identify outdoor cleaning as included. These examples are not endorsements, and Keeply does not take bookings.</p>
        <div className={styles.quoteRequest}><div><ClipboardCheck size={22} aria-hidden="true" /><h3>A clearer message.<br />A more useful quote.</h3><p>Send this with photos of the installation. Ask how extra work will be approved, and request a receipt, service report and follow-up terms.</p></div><blockquote>“I have [number] [window / split] units, [brand / model / HP], in [area]. They run [hours] daily. Last professional clean: [date / unknown]. Current issue: [none / describe]. Outdoor access: [location]. Please quote the total including VAT, transport and access fees. Confirm indoor and outdoor scope, removal/reinstallation, exclusions and any proposed pull-down work before we agree.”</blockquote></div>
      </section>

      <section id="booking-checklist" className={styles.section} aria-labelledby="visit-title">
        <div className={styles.wideIntro}><span className={styles.eyebrow}>03 / MAKE THE VISIT COUNT</span><h2 id="visit-title">Before they arrive.<br /><em>Before they leave.</em></h2><p>A few useful questions help everyone understand the work, the cost and what happens next.</p></div>
        <div className={styles.visitColumns}>{[{ rows: before, heading: 'Before the visit' }, { rows: after, heading: 'Before they leave' }].map(({ rows, heading }) => <div key={heading}><h3>{heading}</h3><ol className={styles.checklist}>{rows.map(([label, text]) => <li key={label}><Check size={17} aria-hidden="true" /><div><strong>{label}</strong><p>{text}</p></div></li>)}</ol></div>)}</div>
        <div id="warning-signs" className={styles.recovery}><span className={styles.eyebrow}>SOMETHING CHANGED AFTER CLEANING?</span><h3>Keep the details. Ask for an assessment.</h3><p>Weak cooling, a musty smell, new noise or unexpected dripping are reasons to ask for an inspection, even before the planned date. A cleaning booking does not diagnose every cooling problem.</p><p>Note when the new dripping, noise or cooling issue started. Capture the symptom if safe, keep the receipt and report, and contact the provider using their follow-up terms. New symptoms do not establish the cause or who is responsible.</p><p><a href={sources.samsung}>Samsung’s leakage guidance</a> describes several possible causes, including installation and drainage. Severe leakage needs an engineer’s inspection. Ask for findings and proposed charges before approving more work.</p></div>
      </section>

      <section id="filter-care" className={`${styles.section} ${styles.editorial}`} aria-labelledby="filter-title">
        <div className={styles.sectionIntro}><span className={styles.eyebrow}>04 / BETWEEN THE VISITS</span><h2 id="filter-title">Small filter care.<br /><em>A separate habit.</em></h2><p>Follow the manual for your exact model. Daikin recommends cleaning filters every two weeks; Panasonic gives the same interval for daily use in dusty conditions.</p><p className={styles.source}><a href={sources.daikin}>Daikin care guidance</a> · <a href={sources.panasonic}>Panasonic filter guidance</a></p></div>
        <ol className={styles.numberedSteps}><li><strong>Check which filter you have.</strong><p>Washable mesh and specialised purifying or deodorising filters can need different care. Only rinse filters your manual identifies as washable.</p></li><li><strong>Switch off and isolate power.</strong><p>Follow your model’s instructions and wait for the unit to stop. Arrange help if the filter is not safely accessible.</p></li><li><strong>Remove and clean gently.</strong><p>Follow the panel-release instructions. Vacuum dust, then rinse only if permitted, using the cleaner the manufacturer allows.</p></li><li><strong>Dry fully, then refit.</strong><p>Follow the drying instructions. Daikin specifies shade for washable filters. Refit the filter and close the panel before restarting.</p></li></ol>
      </section>
      <section id="what-gets-cleaned" className={styles.serviceScope} aria-labelledby="scope-title"><span className={styles.eyebrow}>KNOW THE DIFFERENCE</span><h2 id="scope-title">The filter is one part of the job.</h2><div className={styles.scopeRows}><article><span>01</span><div><h3>Professional cleaning</h3><p>Confirm coil, blower, drain tray and drain-line work, plus outdoor cleaning on a split system. For a window unit, ask about removal and reinstallation. Leave internal disassembly, electrical and refrigerant work to a trained professional.</p></div></article><article><span>02</span><div><h3>Pull-down or extra disassembly</h3><p>Ask why it is needed, what will be removed and the extra cost. Service names vary by provider; the label alone does not explain the work.</p></div></article><article><span>03</span><div><h3>A built-in self-clean cycle</h3><p>Follow the model’s instructions. <a href={sources.midea}>Midea explains</a> that inaccessible parts still need professional care. A cycle is not evidence that a full service took place.</p></div></article></div><p className={styles.source}>For a model-specific example of power isolation and filter care, see the <a href="https://aircon.cis.panasonic.com/wp-content/uploads/cs-pc12gkd_cu-pc12gkd_f565574.pdf">Panasonic CS-PC12GKD manual</a>. Use your own manual first.</p></section>

      <section id="keep-a-record" className={styles.recordSection} aria-labelledby="record-title">
        <div><span className={styles.eyebrow}>KEEP THE PROOF WITH THE PLAN</span><h2 id="record-title">Keep the service record<br /><em>with the aircon.</em></h2><p>After the visit, record what was completed, the actual cost and any findings. Keep the receipt and provider’s contact together, then review the next date.</p><div className={styles.actions}><Link className={styles.primary} href="/add/aircon">Keep my aircon record <ArrowRight size={17} aria-hidden="true" /></Link><Link className={styles.inlineLink} href="/demo">Explore a sample account <ArrowRight size={16} aria-hidden="true" /></Link></div><p className={styles.source}>Google sign-in is required to save. Alerts are optional. Keeply organises your records; visits are arranged with your provider.</p></div>
        <div className={styles.record}><span className={styles.eyebrow}>ILLUSTRATIVE SERVICE RECORD</span><div className={styles.recordIdentity}><ReminderIcon template="aircon" /><h3>Bedroom aircon</h3></div><dl><div><dt>Service completed</dt><dd>October 29, 2026</dd></div><div><dt>Work recorded</dt><dd>Indoor and outdoor cleaning; drain checked.</dd></div><div><dt>Amount paid</dt><dd>₱1,775</dd></div><div><dt>Next planned clean</dt><dd>February 28, 2027<span>Four months after completion.</span></dd></div></dl><p className={styles.source}>Fictional example. Use your own completed visit, receipt and agreed interval.</p></div>
      </section>

      <section id="questions" className={`${styles.section} ${styles.faq}`} aria-labelledby="questions-title"><div className={styles.sectionIntro}><span className={styles.eyebrow}>A FEW THINGS YOU MIGHT WONDER</span><h2 id="questions-title">The useful<br /><em>little details.</em></h2></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
      <section id="sources" className={styles.sources} aria-labelledby="sources-title"><h2 id="sources-title">Sources and review notes</h2><p>Prepared by Keeply, first published October 4 and reviewed October 29, 2026. This is a household planning guide. Your model’s instructions and a qualified technician’s assessment guide the appropriate work.</p><ul><li><a href={sources.midea}>Midea Philippines</a>: filter care, usage bands and self-cleaning limits.</li><li><a href={sources.daikin}>Daikin</a> and <a href={sources.panasonic}>Panasonic Philippines</a>: filter care and servicing guidance.</li><li><a href={sources.teko}>Teko</a> and <a href={sources.ezy}>EZY Lifestyle</a>: published rates and scope checked October 29. Obtain a current written quote.</li><li><a href={sources.samsung}>Samsung Philippines</a>: leakage causes and inspection guidance.</li></ul><p>Household examples, quote prompts and visit checklists are Keeply’s editorial illustrations. The household photograph is AI-generated. No service outcome, customer endorsement or provider partnership is implied.</p></section>
    </main>
    <footer className={styles.footer}><p>Keeply. A home for your household admin.</p><div><Link href="/">Home</Link><Link href="/pricing">Pricing</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer>
  </div>;
}
