import { PublicAuthLink } from '@/components/public-auth-link';
import { headers } from 'next/headers';
import { PublicMetrics } from '@/components/public-metrics';
import Link from 'next/link';
import { ArrowRight, FolderPlus, ClipboardCheck, History } from 'lucide-react';
import { Brand } from '@/components/brand';
import { HouseholdShowcase } from '@/components/household-showcase';
import { ReminderIcon } from '@/components/reminder-icon';
import { HeroReminders } from '@/components/hero-reminders';
import { reminderCategories } from '@/features/templates/categories';
const title = 'Household Admin App: Bills, Maintenance & Warranties';
const description = 'Keeply is a household admin app for bills, home maintenance, receipts, warranties and renewals. Keep dates, records and optional alerts together.';
const siteUrl = 'https://www.keeplyph.com';
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite', '@id': siteUrl + '/#website', name: 'Keeply', url: siteUrl,
      inLanguage: 'en-PH', publisher: { '@id': siteUrl + '/#organization' },
      about: { '@id': siteUrl + '/#app' },
    },
    {
      '@type': 'WebApplication', '@id': siteUrl + '/#app', name: 'Keeply', url: siteUrl,
      applicationCategory: 'LifestyleApplication', operatingSystem: 'Web browser',
      description, inLanguage: 'en-PH', publisher: { '@id': siteUrl + '/#organization' },
      mainEntityOfPage: { '@id': siteUrl + '/#webpage' },
      featureList: [
        'Household bills and recurring payment dates',
        'Home maintenance and service history',
        'Purchase receipts and warranty dates',
        'Upcoming payment totals from saved amounts, with estimates identified',
        'Household planning up to a year ahead with Premium',
        'Monthly household costs from saved amounts',
        'Category-aware record completeness',
        'Weekly household brief from saved data',
        'Search notes, history, dates and authorised file names',
        'Vehicle registration and insurance dates',
        'ID and passport expiry dates',
        'Optional alerts',
      ],
    },
    { '@type': 'Organization', '@id': siteUrl + '/#organization', name: 'Keeply', url: siteUrl, logo: siteUrl + '/brand/keeply-logo.png' },
    {
      '@type': 'WebPage', '@id': siteUrl + '/#webpage', url: siteUrl, name: title + ' · Keeply',
      description, inLanguage: 'en-PH', isPartOf: { '@id': siteUrl + '/#website' },
      mainEntity: { '@id': siteUrl + '/#app' },
    },
  ],
};
export const metadata = {
  title: { absolute: title + ' · Keeply' }, description, alternates: { canonical: '/' },
  openGraph: { title: title + ' · Keeply', description, url: '/', siteName: 'Keeply', locale: 'en_PH', type: 'website' },
  twitter: { card: 'summary_large_image', title: title + ' · Keeply', description },
};
export default async function HomePage(){const nonce=(await headers()).get('x-nonce') || undefined;return <><script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData).replace(/</g,'\\u003c')}}/><PublicMetrics page="home"/><nav className="public-nav"><Brand/><div><Link href="#how-it-works">How it works</Link><Link href="/pricing">Pricing</Link><PublicAuthLink/></div></nav><main className="landing landing-home" id="main-content">
<section className="landing-hero"><HeroReminders/><div className="eyebrow">HOUSEHOLD ADMIN, ORGANISED</div><h1>Your household,<br/><em>a little more organised.</em></h1><p>Keeply brings your household admin together: bills, home maintenance, receipts, warranties and renewals. Keep the dates, details and history you need when something needs attention.</p><div className="hero-actions"><Link className="button primary" href="/add">Start organizing for free <ArrowRight size={17} aria-hidden="true"/></Link><Link className="button secondary" href="/demo">Explore a sample account</Link></div><p className="hero-footnote">Keep bills, maintenance and renewals together.<br/>Install for 30 days of Premium. No card required.</p></section>
<HouseholdShowcase/>
<section className="category-section"><h2>What would you like to organise first?</h2><p className="section-description">Start with the things you manage at home. Choose a category, then keep its useful details and important dates together.</p><div className="home-template-directory">{reminderCategories.map(category=><Link href={'/add?category=' + category.key} key={category.key}><ReminderIcon template={category.choices[0].template} group={category.key}/><span className="home-category-copy"><strong>{category.label}</strong><small>{category.description}</small></span><ArrowRight size={17} aria-hidden="true"/></Link>)}</div></section>
<section id="how-it-works" className="landing-features"><div><FolderPlus size={25} aria-hidden="true"/><h3>Keep a record.</h3><p>Start with a name. Add useful dates, notes and supporting documents when you have them.</p></div><div><ClipboardCheck size={25} aria-hidden="true"/><h3>Know what needs attention.</h3><p>Review upcoming dates, missed cycles and details to add. Choose alerts when they help.</p></div><div><History size={25} aria-hidden="true"/><h3>Remember what you’ve done.</h3><p>Record payments, renewals and maintenance. Search your notes and history when you need them.</p></div></section>
<section id="home-appliances" className="panel space-bottom"><h2>Appliance warranties and household bills, together.</h2><p className="section-description">Save the warranty for a new fridge, plan an aircon clean, and add the due dates from your water and electric bills. Keeply gives those household deadlines a home.</p><div className="hero-actions spaced"><Link className="button secondary" href="/add/receipt?category=appliances">Keep an appliance receipt</Link><Link className="button secondary" href="/add/aircon">Remember an aircon clean</Link></div><nav className="related-tools spaced" aria-label="Bills, receipts and home maintenance"><Link href="/bill-tracker">Bill tracker and bill reminder app →</Link><Link href="/warranty-tracker">Receipt and warranty tracker →</Link><Link href="/aircon-cleaning-schedule">Aircon cleaning schedule, prices &amp; booking tips →</Link></nav></section>
<section id="loan-payments" className="panel space-bottom"><h2>Keep recurring payments organised.</h2><p className="section-description">Personal loans, home and car loans, salary or government loans, credit card installments, business loans and more. Add your next payment and frequency, an optional payment amount, and an optional end date. Keeply keeps the dates coming so you do not have to recreate a reminder every month.</p><p className="spaced">For example: next payment October 15, 2026 · Monthly · ₱8,450 (optional) · Ends March 15, 2029 · Reminder 7 days before.</p><div className="hero-actions spaced"><Link className="button secondary" href="/add/other?preset=personal-loan">Add a loan reminder</Link><Link className="text-button" href="/loan-payment-reminder">Explore loan payment reminders →</Link></div><p className="hint spaced">The same recurring date controls work for rent, association dues, subscriptions, tuition, utility bills and insurance installments. Choose the dates from your provider’s schedule.</p></section>
<section className="panel space-bottom"><h2>When is your car registration due?</h2><p className="section-description">Use our free LTO renewal date calculator to check your plate’s renewal month and date window. Then prepare your requirements and save a reminder.</p><Link className="text-button spaced" href="/lto-registration-renewal#renewal-calculator">Check my car renewal schedule →</Link></section>

<section className="panel"><h2>A clearer view of the months ahead.</h2><p className="spaced">See upcoming household dates and costs together with Premium planning.</p><p className="section-description">Explore a year of sample bills, maintenance and renewals. Change a sample amount and see the monthly plan respond. Install Keeply and open it while signed in to enjoy 30 days of full Premium, with no card or payment details.</p><Link className="text-button spaced" href="/demo/planner?days=365">Explore a sample account →</Link></section>
<section className="public-faq"><h2>Your household admin questions, answered</h2><details><summary>What is Keeply?</summary><p>Keeply is a household admin app for organising bills, home maintenance, receipts, warranties and renewals. Keep useful records with their dates, record completed payments and services, and choose optional alerts. You enter the details and schedules you want to track.</p></details><details><summary>What can I organise with Keeply?</summary><p>Start with water and electric bills, rent and household dues, aircon cleaning and home services, or purchase receipts and appliance warranties. You can also track subscriptions, loan installments, vehicle registration, insurance renewals, passport and ID expiry, appointments and school deadlines.</p></details><details><summary>Is Keeply free?</summary><p>A free account includes unlimited saved household items, important dates, optional alerts, payment and service history, 30-day planning and 100 MB of private file storage. Premium adds planning up to a year ahead. <Link href="/pricing">Compare Free and Premium</Link>.</p></details><details><summary>Can I set reminders for water, electric and car bills?</summary><p>Yes. Choose a bill category, enter the due date shown on your bill and opt into alerts. For a regular schedule, choose a repeat frequency and an optional end date. For bills with changing due dates, update the next date from each bill. Keeply does not pay bills or import billing schedules.</p></details><details><summary>What date should I use for an ID or clearance?</summary><p>Use the expiration date printed on your document when applicable, or choose a renewal appointment, update or follow-up date. Keeply does not assume a validity period.</p></details><details><summary>Will loan reminders repeat until the loan ends?</summary><p>Yes. Choose monthly, quarterly, every six months or yearly, set your next payment and an optional end date, and choose alerts. Dates continue automatically until your chosen end date or until you stop the schedule. Unconfirmed past dates stay in history. Keeply does not make payments or calculate balances, interest or lender schedules.</p></details><details><summary>How do I plan for upcoming payments?</summary><p>Save the amount you expect to pay and see one total for the next 30 days. You can label an amount as an estimate, add missing amounts and record payments you’ve already made directly from the payment list.</p></details><details><summary>How does household readiness work?</summary><p>Readiness shows which records have their relevant key details saved or marked not applicable. You can leave a detail as not known yet or hide a suggestion. It measures record completeness, not household safety, and never requires file uploads.</p></details><details><summary>Do I need to upload an ID?</summary><p>No. ID, passport and clearance reminders only need a helpful name and your chosen date. Do not include scans or identity numbers.</p></details><details><summary>Are alerts automatic?</summary><p>You choose alerts for each date. Email is the default. Manage it in Alert Options, where proposed timings are editable. Alert delivery also follows your account preferences.</p></details><details><summary>Can Keeply renew my documents?</summary><p>Keeply helps you remember and organise. Confirm official deadlines and complete renewals with the responsible provider or agency.</p></details><details><summary>Can I delete what I’ve saved?</summary><p>Yes. You can remove a reminder or request account deletion in Settings. See the privacy policy for file cleanup and backup limits.</p></details></section>
<nav aria-label="More household admin tools" className="related-tools space-bottom"><Link href="/vehicle-registration-reminder">Vehicle registration and service dates</Link><Link href="/document-expiry-tracker">Passport and ID expiry tracker</Link></nav><section className="home-final-cta"><h2>Start with one thing.</h2><p>Give your next bill, purchase or home service a place. Build your household account at your own pace.</p><Link className="button primary" href="/add">Start organizing for free <ArrowRight size={17} aria-hidden="true"/></Link></section></main><footer className="app-footer"><span>Little things, safely kept.</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/pricing">Pricing</Link><Link href="/privacy#contact">Contact</Link><Link href="/feedback">Feedback</Link></div></footer></>;}
