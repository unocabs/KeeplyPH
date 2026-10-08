import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { Brand } from '@/components/brand';
import { PublicAuthLink } from '@/components/public-auth-link';
import styles from './page.module.css';

const title = 'Aircon Cleaning Schedule: When, What & Cost';
const description = 'When should you clean your aircon? Compare filter care and professional servicing, schedules by daily use, published service prices and a booking checklist.';
const pageUrl = 'https://www.keeplyph.com/aircon-cleaning-schedule';
const sources = {
  midea: 'https://www.midea.com/ph/news/aircon-cleaning-schedule-in-the-philippines--filters--self-cleaning--and-professional-deep-cleaning',
  daikin: 'https://www.daikin.com/products/ac/services/maintenance_tips',
  panasonic: 'https://www.panasonic.com/ph/air-solutions/learn-more/how-to-clean-your-ac-unit-servicing.html',
  teko: 'https://www.teko.ph/accredited-aircon-cleaning-services',
};
const reminder = '/add/aircon';

export const metadata: Metadata = {
  title, description, alternates: { canonical: '/aircon-cleaning-schedule' },
  openGraph: { title, description, url: '/aircon-cleaning-schedule', type: 'article', locale: 'en_PH', siteName: 'Keeply' },
  twitter: { card: 'summary_large_image', title, description },
};

export default async function Page() {
  const nonce = (await headers()).get('x-nonce') || undefined;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Article', '@id': pageUrl + '#guide', headline: title, description, url: pageUrl,
        mainEntityOfPage: pageUrl, inLanguage: 'en-PH', datePublished: '2026-10-04', dateModified: '2026-10-04',
        author: { '@type': 'Organization', name: 'Keeply', url: 'https://www.keeplyph.com' },
        publisher: { '@type': 'Organization', name: 'Keeply', url: 'https://www.keeplyph.com' },
        citation: Object.values(sources) },
      { '@type': 'BreadcrumbList', '@id': pageUrl + '#breadcrumb', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.keeplyph.com' },
        { '@type': 'ListItem', position: 2, name: 'Aircon cleaning schedule', item: pageUrl },
      ] },
    ],
  };
  return <>
    <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <nav className="public-nav" aria-label="Main navigation"><Brand /><div><Link href="/warranty-tracker">Receipts &amp; warranties</Link><PublicAuthLink /></div></nav>
    <main id="main-content" className={styles.guide}>
      <header className={styles.hero}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true"> / </span><span>Aircon cleaning schedule</span></nav>
        <div className="eyebrow">A PRACTICAL GUIDE FOR PHILIPPINE HOUSEHOLDS</div>
        <h1>Kailan magpapalinis ng aircon?<br /><em>Start with how you use it.</em></h1>
        <p className={styles.intro}>A bedroom unit used at night and an aircon running all day need different plans. Here’s how to separate filter care from a technician’s visit, compare quotes, and remember the next clean.</p>
        <p className={styles.review}>By <a href="#sources">Keeply</a> · Reviewed <time dateTime="2026-10-04">October 4, 2026</time> · Based on manufacturer guidance and published service prices.</p>
        <div className="hero-actions"><a className="button primary" href="#schedule">Find my cleaning schedule ↓</a><a className="button secondary" href="#cost">Compare cleaning costs</a></div>
      </header>

      <aside className={styles.quickAnswer} aria-labelledby="quick-answer-title">
        <span className="eyebrow">THE SHORT ANSWER</span><h2 id="quick-answer-title">Two jobs. Two schedules.</h2>
        <div className={styles.answerGrid}>
          <div><strong>Filters: every 2–4 weeks</strong><p>Start with your model’s instructions. Check sooner if dust builds up quickly.</p></div>
          <div><strong>Professional cleaning: about 3–6 months</strong><p>Use daily operating hours as a starting point, then confirm with your technician and manual.</p></div>
        </div>
        <p className={styles.source}>These ranges come from <a href={sources.midea}>Midea Philippines</a>. They are planning guidance, not a rule for every brand or installation. Symptoms can mean you need service sooner.</p>
      </aside>

      <nav className={styles.jump} aria-label="In this guide">
        <a href="#schedule">Cleaning schedule</a><a href="#what-gets-cleaned">What gets cleaned</a><a href="#warning-signs">Warning signs</a><a href="#filter-care">Filter care</a><a href="#cost">Prices &amp; quotes</a><a href="#booking-checklist">Before &amp; after service</a><a href="#keep-a-record">Remember the next clean</a><a href="#questions">Questions</a>
      </nav>

      <section id="schedule" className={styles.section}>
        <span className={styles.number}>01 / CHOOSE A STARTING SCHEDULE</span><h2>How often should you clean your aircon?</h2>
        <p>Count the hours the unit actually runs, rather than choosing a schedule because it is “inverter” or “split type.” The table below uses Midea’s published usage bands for professional cleaning.</p>
        <div className={styles.tableWrap}><table>
          <caption>Professional cleaning: a starting point by daily use</caption>
          <thead><tr><th scope="col">Daily operating time</th><th scope="col">Starting interval</th><th scope="col">A household example</th></tr></thead>
          <tbody>
            <tr><th scope="row">4–6 hours</th><td>6 months</td><td>A bedroom unit switched on for part of the evening.</td></tr>
            <tr><th scope="row">6–10 hours</th><td>4 months</td><td>A bedroom aircon running through most of the night.</td></tr>
            <tr><th scope="row">Around the clock</th><td>3 months</td><td>A unit that stays on through the day and night.</td></tr>
          </tbody>
        </table></div>
        <p className={styles.source}>Source: <a href={sources.midea}>Midea Philippines cleaning guide</a>. The examples are Keeply’s illustrations. At the shared six-hour boundary, or for usage between the listed bands, ask your technician to choose the interval for your unit.</p>
        <div className={styles.note}><h3>Adjust for the room, not just the clock.</h3><p>Pets, smoke and a dusty environment can mean more frequent maintenance. Tell the technician what the room is like and whether the unit’s condition has changed since its last service.</p><p>Panasonic Philippines recommends servicing at least every six months. Different manufacturer guidance is a reason to check your own model, rather than treating this table as a universal deadline.</p><p className={styles.source}><a href={sources.midea}>Midea: usage and environment</a> · <a href={sources.panasonic}>Panasonic: servicing guidance</a></p></div>
        <div className={styles.example}><span className="eyebrow">WORKED EXAMPLE</span><h3>“Bedroom aircon, eight hours a night.”</h3><p>If your technician agrees on a four-month interval and the last full clean was October 4, the next planned visit is February 4. A filter rinse in November does not restart that four-month service schedule.</p><p>Keep the two tasks separate in your records: <strong>filter cleaned</strong> and <strong>professional service completed</strong>.</p></div>
        <p>Before a period when you expect heavier use, review the next service date. A reminder should leave time to arrange access and a booking, rather than arrive only after cooling becomes a problem.</p>
      </section>

      <section id="what-gets-cleaned" className={styles.section}>
        <span className={styles.number}>02 / UNDERSTAND THE SERVICE</span><h2>Filter cleaning, general cleaning and pull-down: what’s the difference?</h2>
        <div className={styles.serviceGrid}>
          <article className={styles.serviceCard}><span className={styles.tag}>ROUTINE FILTER CARE</span><h3>The removable dust filter</h3><p>The accessible mesh catches dust before it reaches the inside. Cleaning it does not clean the entire machine. Wash only filters your manual identifies as washable.</p></article>
          <article className={styles.serviceCard}><span className={styles.tag}>PROFESSIONAL SERVICE</span><h3>Inside the unit and its drainage</h3><p>Ask about the coil, blower, drain tray and drain line, plus the outdoor unit on a split system. Confirm which parts are included in the quote.</p></article>
          <article className={styles.serviceCard}><span className={styles.tag}>ASK WHY IT IS NEEDED</span><h3>Pull-down or extra disassembly</h3><p>Ask what will be removed, why ordinary access is insufficient, and the additional cost. The label alone does not explain the scope.</p></article>
        </div>
        <p className={styles.source}><a href={sources.midea}>Midea explains professional cleaning and inaccessible components</a>. <a href={sources.teko}>Teko lists standard cleaning and a separate pull-down surcharge</a>. Service names and inclusions vary by provider.</p>
        <div className={styles.columns}>
          <div><h3>Window type</h3><p>Tell the provider the horsepower, whether it is an inverter, and how the unit is mounted. Confirm whether removal and reinstallation are included and how they will protect the surrounding area.</p></div>
          <div><h3>Split type</h3><p>Send photos showing the indoor unit and the outdoor unit’s location. A quote for an indoor clean may leave the outdoor unit out. In a condo, ask building management about access and contractor rules first.</p></div>
        </div>
        <p><strong>Self-cleaning still has limits.</strong> A built-in cleaning cycle does not replace professional maintenance. Follow the model’s instructions for that feature and continue its other maintenance tasks. <a href={sources.midea}>See Midea’s explanation.</a></p>
      </section>

      <section id="warning-signs" className={styles.section}>
        <span className={styles.number}>03 / DON’T WAIT FOR THE REMINDER</span><h2>Mahina ang lamig or tumutulo? Ask for an inspection.</h2>
        <p>Weak cooling, unusual noise, musty smells and unexpected dripping are reasons to contact a service professional. They do not tell you which part is at fault. <a href={sources.midea}>Midea lists these warning signs.</a></p>
        <div className={styles.tableWrap}><table><caption>Make the service request more useful</caption><thead><tr><th scope="col">What you notice</th><th scope="col">What to tell the technician</th></tr></thead><tbody>
          <tr><th scope="row">Cooling is weaker</th><td>When it started, operating hours, settings, the last service date, and whether you already checked the filter according to the manual.</td></tr>
          <tr><th scope="row">Water is dripping indoors</th><td>Where the water appears and how soon after switching on. Include a photo and mention whether the unit was recently serviced.</td></tr>
          <tr><th scope="row">A smell or new noise</th><td>When it happens, whether it persists, and any recent work. Record the noise if it is intermittent.</td></tr>
          <tr><th scope="row">The electricity bill rose</th><td>Changes in running hours and other household use. A higher bill alone is not proof that the aircon needs cleaning.</td></tr>
        </tbody></table></div>
        <p>Ask for the finding and proposed work before approving a repair or an extra charge. A cleaning booking should not be treated as a diagnosis of every cooling problem.</p>
      </section>

      <section id="filter-care" className={styles.section}>
        <span className={styles.number}>04 / THE TASK BETWEEN TECHNICIAN VISITS</span><h2>How to care for a washable aircon filter</h2>
        <p>Use the care section of your exact model’s manual first. Daikin recommends a two-week filter-cleaning interval; Panasonic also recommends two weeks for daily use in dusty conditions. <a href={sources.daikin}>Daikin guidance</a> · <a href={sources.panasonic}>Panasonic guidance</a></p>
        <ol className={styles.steps}>
          <li><strong>Identify the filter.</strong> The washable mesh and any specialised purifying or deodorising filter may have different care instructions. Do not assume every insert can be rinsed.</li>
          <li><strong>Switch off and isolate power as the manual directs.</strong> Wait for the unit to stop. If you cannot reach the filter safely, arrange help instead of climbing on furniture.</li>
          <li><strong>Remove it gently.</strong> Follow the panel-release instructions. Vacuum dust, then rinse only if the filter is washable; use the cleaner the manufacturer permits.</li>
          <li><strong>Let it dry fully.</strong> Follow the filter’s drying instructions. Daikin specifies shade for its washable air filters. Refit the filter and close the panel before restarting.</li>
        </ol>
        <p className={styles.source}>Method: <a href={sources.daikin}>Daikin filter care</a> and <a href={sources.panasonic}>Panasonic’s distinction between filter types</a>. For power isolation, see the <a href="https://aircon.cis.panasonic.com/wp-content/uploads/cs-pc12gkd_cu-pc12gkd_f565574.pdf">Panasonic CS-PC12GKD care instructions</a>; your own model’s manual takes precedence.</p>
        <p>Leave internal disassembly and servicing to a trained professional. This checklist covers routine accessible filter care, not coil washing, electrical work or refrigerant handling.</p>
      </section>

      <section id="cost" className={styles.section}>
        <span className={styles.number}>05 / PLAN THE VISIT AND THE BUDGET</span><h2>How much does aircon cleaning cost in the Philippines?</h2>
        <p>Compare the same scope, not just the advertised starting price. These are one provider’s published examples checked October 4, 2026; they are not national averages, guaranteed quotes or a Keeply booking offer.</p>
        <div className={styles.tableWrap}><table><caption>Teko’s published cleaning prices</caption><thead><tr><th scope="col">Unit / service</th><th scope="col">Published price</th><th scope="col">Details to check</th></tr></thead><tbody>
          <tr><th scope="row">Window type</th><td>₱990</td><td>Listed additions: ₱250 for inverter; ₱250 for a unit above 1.5 HP. Confirm which apply.</td></tr>
          <tr><th scope="row">Split type</th><td>₱1,775</td><td>Indoor and outdoor cleaning, filter and drain line, and inspection are listed. Multipoint pricing is per indoor unit.</td></tr>
          <tr><th scope="row">Split-type complete pull-down</th><td>+₱4,500</td><td>A separately listed addition, not the standard cleaning price. Ask why it is needed.</td></tr>
        </tbody></table></div>
        <p className={styles.source}>Source: <a href={sources.teko}>Teko’s aircon cleaning service page</a>. Confirm the current total, service area, access conditions and inclusions directly. Keeply does not endorse or receive bookings for this provider.</p>
        <div className={styles.example}><h3>Budget example: two split-type units</h3><p>At the listed standard rate, <strong>2 × ₱1,775 = ₱3,550 per visit</strong>. If your confirmed schedule is two visits a year, that is ₱7,100 for those visits before any extras. Recalculate using your own written quote and agreed interval.</p></div>
        <h3>Send this when requesting a quote</h3>
        <blockquote className={styles.quote}>“I have [number] [window / split] aircon units, [brand / model / HP], in [area]. They run about [hours] daily. Last professional clean: [date / unknown]. Outdoor access: [location]. Current issue: [none / describe]. Please quote the total and confirm cleaning scope, access fees, removal/reinstallation, and any exclusions.”</blockquote>
        <p>Ask what “general cleaning” includes, how extra work will be authorised, whether a receipt and service report are provided, and what follow-up is available if an issue appears after the visit.</p>
      </section>

      <section id="booking-checklist" className={styles.section}>
        <span className={styles.number}>06 / MAKE THE APPOINTMENT COUNT</span><h2>Before the technician arrives, and before they leave</h2>
        <div className={styles.columns}>
          <div><h3>Before the visit</h3><ul>
            <li>Send model details and access photos so the quote matches the installation.</li>
            <li>For a rental, agree with the landlord who authorises and pays for service. For a condo, check work permits and allowed hours.</li>
            <li>Clear the work area and arrange protection for furniture and electronics.</li>
            <li>Check warranty conditions with the manufacturer if the unit is still covered.</li>
            <li>Confirm the total, inclusions, arrival window and cancellation terms.</li>
          </ul></div>
          <div><h3>Before they leave</h3><ul>
            <li>Ask them to explain what was cleaned, inspected or left inaccessible.</li>
            <li>Have the technician demonstrate operation and check for any new dripping or noise.</li>
            <li>Get an itemised record of approved extra work and the amount paid.</li>
            <li>Ask for the next service interval based on your actual use.</li>
            <li>Keep the receipt, findings and follow-up contact together.</li>
          </ul></div>
        </div>
        <p>These are Keeply’s appointment-planning prompts. The technician and manufacturer determine the appropriate work for your unit.</p>
      </section>

      <section id="keep-a-record" className={styles.section}>
        <span className={styles.number}>07 / REMEMBER WHAT WAS ACTUALLY DONE</span><h2>Keep a service record for each aircon</h2>
        <p>“Bedroom split-type” is more useful than “Aircon” when you have several units. Note the completed service date, provider, work done, amount paid and recommended next interval. Attach the receipt or report if you want it ready for a follow-up.</p>
        <div className={styles.record}><span className="eyebrow">EXAMPLE SERVICE NOTE</span><h3>Bedroom split-type · 1.5 HP</h3><dl>
          <div><dt>Completed</dt><dd>October 4, 2026</dd></div>
          <div><dt>Work recorded</dt><dd>Indoor and outdoor cleaning; drain line checked.</dd></div>
          <div><dt>Next agreed service</dt><dd>February 4, 2027 · Four months after completion.</dd></div>
          <div><dt>Follow-up</dt><dd>Keep the provider’s contact and any findings with the receipt.</dd></div>
        </dl><p className={styles.source}>Illustration only. Record the work and schedule confirmed for your own unit.</p></div>
        <h3>Set it up in Keeply</h3><ol>
          <li>Choose <strong>Aircon Maintenance</strong> and give the unit a name.</li>
          <li>Enter your confirmed next service date. Or open <strong>Calculate from the last service</strong>, enter the completion date and your agreed interval in months.</li>
          <li>Choose whether you want alerts, then review and save. If you prefer to decide after each visit, leave the service as one-time.</li>
        </ol>
        <p>After a visit, confirm completion and review the next date. A fixed repeating date is a plan, not evidence that a technician visited. Keeply does not book appointments or assess the condition of your aircon.</p>
        <div className="hero-actions"><Link className="button primary" href={reminder}>Set my aircon reminder →</Link><Link className="button secondary" href="/demo/add/aircon">Try the sample form</Link></div>
        <p className={styles.disclosure}>Google sign-in is required to save your own reminder. The sample form does not save changes or send alerts. Start with 3 free alert slots; <Link href="/pricing">see pricing</Link>.</p>
      </section>

      <section id="questions" className={`${styles.section} ${styles.faq}`}>
        <h2>Aircon cleaning questions</h2>
        <details><summary>Every three months ba talaga, kahit hindi araw-araw ginagamit?</summary><p>Choose a schedule for your usage and model. The <a href="#schedule">usage table</a> is a starting point, not an expiry date. Tell your technician if the unit is only used occasionally; ask what inspection and cleaning plan makes sense before regular use resumes.</p></details>
        <details><summary>Does an inverter aircon need less cleaning?</summary><p>Do not choose the cleaning interval from the inverter label alone. Use the model’s maintenance instructions, actual operating hours and condition. Ask about any special filter or self-cleaning feature separately.</p></details>
        <details><summary>I washed the filter. Can I move the next professional service date?</summary><p>Record that as filter care. It does not show that the other components were serviced. Keep the agreed professional service date unless your technician changes the plan.</p></details>
        <details><summary>Is outdoor-unit cleaning included in a split-type quote?</summary><p>Ask explicitly. Send an access photo and request a written scope for both units. Compare it with the <a href="#cost">published price example</a>, rather than assuming all “split cleaning” offers include the same work.</p></details>
        <details><summary>Do I need pull-down cleaning every time?</summary><p>Ask the technician to explain the condition or access problem that requires it, what work is proposed and the total price. Get approval terms before the work starts. A provider’s surcharge listing is not a maintenance schedule.</p></details>
        <details><summary>I don’t know when the previous tenant last had it cleaned. What now?</summary><p>Ask the landlord for the service record. If no record is available, tell the provider the history is unknown and arrange an assessment. Start your own record from the work actually completed, rather than inventing a last-service date.</p></details>
        <details><summary>Can I save the warranty with my maintenance record?</summary><p>Keep the service receipt with your aircon reminder. For the original purchase receipt and warranty expiry, use a <Link href="/warranty-tracker">receipt and warranty reminder</Link>. Coverage follows the seller’s or manufacturer’s terms.</p></details>
      </section>

      <section id="sources" className={`${styles.section} ${styles.sources}`}>
        <h2>Sources and review notes</h2><p>Prepared by Keeply on October 4, 2026. This is a household planning guide, not a repair diagnosis. Manufacturer instructions for your model and a qualified technician’s assessment take precedence.</p>
        <ul>
          <li><a href={sources.midea}>Midea Philippines: aircon cleaning schedule</a>: usage bands, filter care, professional servicing and self-cleaning limits. Full page reviewed.</li>
          <li><a href={sources.daikin}>Daikin: maintenance tips</a>: washable-filter care and professional support. Full page reviewed.</li>
          <li><a href={sources.panasonic}>Panasonic Philippines: cleaning and servicing</a>: filter types and servicing guidance. Relevant indexed text reviewed; direct access returned an access restriction.</li>
          <li><a href="https://aircon.cis.panasonic.com/wp-content/uploads/cs-pc12gkd_cu-pc12gkd_f565574.pdf">Panasonic CS-PC12GKD care instructions</a>: power isolation and filter care; model-specific, not a manual for every aircon. Indexed care section reviewed.</li>
          <li><a href={sources.teko}>Teko: aircon cleaning services</a>: published prices and inclusions. Full page reviewed. Prices can change; obtain a current quote.</li>
        </ul>
        <p>Household examples, quote prompts and appointment checklists are Keeply’s editorial illustrations.</p>
      </section>
      <footer className={styles.footer}><Link href="/">Keeply home</Link><Link href="/warranty-tracker">Receipts &amp; warranties</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></footer>
    </main>
  </>;
}
