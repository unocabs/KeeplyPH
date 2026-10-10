import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, CheckCircle2, Circle, FolderOpen, History, Bell, Plus } from 'lucide-react';
import { Brand } from '@/components/brand';
import { PublicAuthLink } from '@/components/public-auth-link';
import { ItemIdentityIcon, TemplateIcon } from '@/components/reminder-icon';
import { sampleItems } from '@/lib/demo';
import { formatDate, formatMoney, todayIn } from '@/lib/domain';
import { samplePaymentRows } from '@/features/items/insights';
import { itemCategory, reminderCategories } from '@/features/templates/categories';
import styles from './page.module.css';

const title = 'Bill Tracker & Bill Reminder App';
const description = 'Track household bills, due dates and payments with Keeply. Choose reminders and keep maintenance, warranties and other household admin in the same account.';
const siteUrl = 'https://www.keeplyph.com';
const pageUrl = siteUrl + '/bill-tracker';
const startHref = '/add?category=bills';

export const metadata: Metadata = {
  title, description, alternates: { canonical: '/bill-tracker' },
  openGraph: {
    title: title + ' · Keeply', description, url: pageUrl,
    siteName: 'Keeply', locale: 'en_PH', type: 'website',
    images: [{ url: '/images/bills/bills-desk.webp', alt: 'A lilac folder and household paperwork in soft daylight.' }],
  },
  twitter: { card: 'summary_large_image', title: title + ' · Keeply', description, images: ['/images/bills/bills-desk.webp'] },
};

const questions = [
  {
    question: 'What is a bill tracker app?',
    answer: 'A bill tracker keeps payment dates, amounts and useful records together so you can see what needs attention. Keeply lets you save household bills, choose optional reminders and record payments you’ve already made. Bills sit alongside your other household admin in one account.',
  },
  {
    question: 'Can I use Keeply as a bill reminder app?',
    answer: 'Yes. Save the due date from your bill, then choose whether and when you want alerts. Email is the default, and your account preferences control delivery. For a regular schedule, choose a repeat frequency and an optional end date. Alerts are optional; your bill records are useful with or without them.',
  },
  {
    question: 'What if my bill amount or due date changes?',
    answer: 'Update the current date and amount from the latest bill. You can label an amount as an estimate while you wait for confirmation. Future dates use your saved repeating schedule, so check them against each new bill. Missing amounts stay visible rather than being treated as zero.',
  },
  {
    question: 'What makes the best bill tracker app for my household?',
    answer: 'The best fit depends on what you want to manage. Keeply is a strong choice if you want to enter your own dates and amounts, keep supporting details, record completed payments and organise maintenance, warranties and renewals in the same place. Explore the sample account to see whether that approach suits you.',
  },
  {
    question: 'Is bill tracking free in Keeply?',
    answer: 'Yes. A free account includes unlimited saved household items, important dates, optional alerts, payment and service history, 30-day planning and 100 MB of private file storage. Premium adds planning up to a year ahead. Premium planning does not increase file storage.',
  },
  {
    question: 'Does Keeply pay my bills or connect to my bank?',
    answer: 'No. You enter bill details and complete payments with your provider. Marking a bill paid in Keeply records a payment you’ve already made; it does not move money. Keeply does not connect to banks or automatically import utility bills.',
  },
  {
    question: 'Can I track things other than bills?',
    answer: 'Yes. Keeply is a household admin app. Organise home maintenance, purchase receipts, warranties, subscriptions, loan payments, vehicles, insurance, appointments, school deadlines and document expiry dates. Choose what matters to your household, or add a custom item and its important dates.',
  },
];

export default async function BillTrackerPage() {
  const nonce = (await headers()).get('x-nonce') || undefined;
  const today = todayIn();
  const bills = samplePaymentRows(sampleItems(today), today)
    .filter(row => row.identity && itemCategory(row.identity) === 'bills').slice(0, 2);
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': pageUrl + '#webpage', url: pageUrl,
        name: title + ' · Keeply', description, inLanguage: 'en-PH',
        isPartOf: { '@id': siteUrl + '/#website' },
        about: { '@id': siteUrl + '/#app' },
        publisher: { '@id': siteUrl + '/#organization' },
        breadcrumb: { '@id': pageUrl + '#breadcrumb' },
      },
      {
        '@type': 'BreadcrumbList', '@id': pageUrl + '#breadcrumb', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Bill tracker', item: pageUrl },
        ],
      },
    ],
  };

  return <>
    <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <nav className={'public-nav ' + styles.nav} aria-label="Main navigation">
      <Brand />
      <div><a href="#why-keeply">Why Keeply</a><a href="#beyond-bills">Beyond bills</a><Link href="/pricing">Pricing</Link><PublicAuthLink /></div>
    </nav>

    <main className={styles.page} id="main-content">
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Bill tracker</span></nav>

        <section className={styles.hero} aria-labelledby="bills-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span aria-hidden="true" /> BILL TRACKER &amp; REMINDER APP</p>
            <h1 id="bills-title">Your bills, organised.<br /><em>Your household, too.</em></h1>
            <p className={styles.heroIntro}>See what’s due, keep the useful details, and record what you’ve paid. A little less searching, a little more room for everything else at home.</p>
            <div className={styles.actions}>
              <Link className={styles.primary} href={startHref}>Track my bills for free <ArrowRight size={17} aria-hidden="true" /></Link>
              <Link className={styles.sampleLink} href="/demo">Explore a sample account <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <p className={styles.reassurance}><Check size={14} aria-hidden="true" /> Free to start <span aria-hidden="true">·</span> No card required</p>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroPhoto}><Image src="/images/bills/bills-desk.webp" alt="A lilac paper folder, household paperwork and a pencil on a light table." fill sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1280px) 48vw, 560px" loading="eager" fetchPriority="high" /></div>
            <div className={styles.billPreview} aria-label="Fictional sample bills">
              <div className={styles.previewHeading}><span className={styles.previewLabel}>A LITTLE LOOK AHEAD</span><span className={styles.sampleBadge}>Sample</span></div>
              <h2>Your next bills.</h2>
              <ul>{bills.map(bill => <li key={bill.date_id}>
                <ItemIdentityIcon item={bill.identity} size={18} />
                <div className={styles.billIdentity}><strong>{bill.product_name}</strong><span>Due <time dateTime={bill.due_on}>{formatDate(bill.due_on, true)}</time></span></div>
                <div className={styles.billAmount}><strong>{bill.amount_minor == null ? 'Not yet known' : formatMoney(bill.amount_minor)}</strong><span>{bill.amount_minor == null ? 'Amount to add' : bill.certainty === 'estimated' ? 'Estimate' : 'Expected amount'}</span></div>
              </li>)}</ul>
              <p className={styles.previewNote}>Fictional records from the sample account. You enter your own bills.</p>
            </div>
          </div>
        </section>

        <section className={styles.introduction} aria-label="Household admin with Keeply">
          <p><strong>A home for the admin of home.</strong> Keeply is a household admin app for bills, maintenance, receipts, warranties and renewals. Track the things your household needs, with their dates and useful details together.</p>
          <div className={styles.introFacts}><span><FolderOpen size={18} aria-hidden="true" /> Unlimited saved items</span><span><Bell size={18} aria-hidden="true" /> Alerts you choose</span><span><History size={18} aria-hidden="true" /> A history to come back to</span></div>
        </section>

        <section className={styles.reasons} id="why-keeply" aria-labelledby="reasons-title">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>WHY KEEP YOUR BILLS WITH KEEPLY?</p>
            <h2 id="reasons-title">Because a bill is<br /><em>more than a due date.</em></h2>
            <p>When it’s time to pay, you want the details. When it’s paid, you want a record. Keeply makes room for both.</p>
            <Link className={styles.inlineLink} href="/demo/items/payments">See the sample payment list <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className={styles.reasonList}>
            <article><span className={styles.reasonNumber}>01</span><div><h3>The context stays with the bill.</h3><p>Keep a useful name, provider details, notes and optional supporting files together. Find what you need without piecing it back together from scattered messages.</p></div></article>
            <article><span className={styles.reasonNumber}>02</span><div><h3>A clearer view of what’s coming.</h3><p>See upcoming payment dates and a total for the next 30 days, based on the amounts you’ve saved. Estimates are labelled. Bills that still need an amount stay visible.</p></div></article>
            <article><span className={styles.reasonNumber}>03</span><div><h3>A record of what you’ve paid.</h3><p>Record a completed payment with its date, optional actual amount and notes. Keep its history with the bill, while a repeating schedule carries on.</p></div></article>
          </div>
        </section>

        <section className={styles.setup} aria-labelledby="setup-title">
          <div className={styles.setupHeading}><p className={styles.eyebrow}>START WITH THE NEXT ONE</p><h2 id="setup-title">One bill. A useful little habit.</h2><p>No perfect spreadsheet required. Add the details you know, then fill in the rest when you have them.</p></div>
          <ol className={styles.steps}>
            <li><span className={styles.stepIcon}><Plus size={23} aria-hidden="true" /></span><h3>Give it a place.</h3><p>Choose electricity, water, internet, rent or another household bill. A helpful name is enough to start.</p><Link href={startHref}>Choose a bill <ArrowRight size={15} aria-hidden="true" /></Link></li>
            <li><span className={styles.stepIcon}><Bell size={23} aria-hidden="true" /></span><h3>Set the date. Choose a nudge.</h3><p>Add the due date from your bill and an amount if you know it. Choose optional alerts and a repeat schedule when it fits.</p></li>
            <li><span className={styles.stepIcon}><CheckCircle2 size={23} aria-hidden="true" /></span><h3>Paid? Keep the record.</h3><p>Pay with your provider, then record it in Keeply. Check changing amounts and due dates against each new bill.</p></li>
          </ol>
        </section>

        <section className={styles.household} id="beyond-bills" aria-labelledby="household-title">
          <div className={styles.householdPhoto}><Image src="/images/bills/household-records.webp" alt="A simple folder, warranty envelope, household manual and house key in soft daylight." fill sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1280px) 42vw, 480px" /></div>
          <div className={styles.householdCopy}>
            <p className={styles.eyebrow}>THE REST OF HOME BELONGS HERE, TOO</p>
            <h2 id="household-title">One household.<br /><em>More than bills.</em></h2>
            <p>The aircon service. The washing machine warranty. The insurance renewal you want to remember. Keeply gives them a place beside your bills.</p>
            <p>Choose what matters to your household. Add useful records and dates at your own pace, including a custom item for something that’s yours alone.</p>
            <Link className={styles.inlineLink} href="/demo">Explore a sample account <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </section>

        <nav className={styles.categoryDirectory} aria-label="Things you can organise with Keeply">
          {reminderCategories.map(category => <Link key={category.key} href={'/add?category=' + category.key}><TemplateIcon template={category.choices[0].template} group={category.key} size={20} /><span>{category.label}</span><ArrowRight size={15} aria-hidden="true" /></Link>)}
        </nav>

        <section className={styles.freePlan} aria-labelledby="free-title">
          <div><p className={styles.eyebrow}>USEFUL FROM THE FIRST BILL</p><h2 id="free-title">Start free.<br /><em>Make room as you go.</em></h2></div>
          <div><p>Unlimited saved household items. Important dates and optional alerts. Payment and service history. Planning for the next 30 days, with 100 MB for private files.</p><p>When you want to look further ahead, Premium extends planning up to a year.</p><Link className={styles.inlineLink} href="/pricing">Compare Free and Premium <ArrowRight size={16} aria-hidden="true" /></Link></div>
        </section>

        <section className={styles.faq} aria-labelledby="questions-title">
          <div className={styles.sectionIntro}><p className={styles.eyebrow}>A FEW THINGS YOU MIGHT WONDER</p><h2 id="questions-title">Bill tracking,<br /><em>with the details.</em></h2><p>Find the right fit for the way you look after your household.</p></div>
          <div className={styles.questions}>{questions.map(({ question, answer }) => <details key={question}><summary>{question}<Plus size={18} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div>
        </section>

        <section className={styles.finalCta} aria-labelledby="start-title"><Circle className={styles.ctaOrbit} size={180} strokeWidth={0.5} aria-hidden="true" /><p className={styles.eyebrow}>A LITTLE LESS TO KEEP IN YOUR HEAD</p><h2 id="start-title">Start with your next bill.</h2><p>Give it a place. Keep the details. Let your household account grow from there.</p><div className={styles.actions}><Link className={styles.primary} href={startHref}>Track my bills for free <ArrowRight size={17} aria-hidden="true" /></Link><Link className={styles.sampleLink} href="/demo">Explore a sample account <ArrowRight size={16} aria-hidden="true" /></Link></div></section>
      </div>
    </main>
    <footer className={'app-footer ' + styles.footer}><span>Keeply. A home for your household admin.</span><div><Link href="/">Keeply home</Link><Link href="/pricing">Pricing</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/privacy#contact">Contact</Link></div></footer>
  </>;
}
