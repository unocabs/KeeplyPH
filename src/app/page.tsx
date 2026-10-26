import { PublicAuthLink } from '@/components/public-auth-link';
import { headers } from 'next/headers';
import { PublicMetrics } from '@/components/public-metrics';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Brand } from '@/components/brand';
import { HouseholdShowcase } from '@/components/household-showcase';
import { ReminderIcon } from '@/components/reminder-icon';
import { HomeOverview } from '@/components/home-overview';
import homeStyles from '@/components/home-introduction.module.css';
import { HomeSupportingSections } from '@/components/home-supporting-sections';
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
export default async function HomePage(){const nonce=(await headers()).get('x-nonce') || undefined;return <><script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData).replace(/</g,'\\u003c')}}/><PublicMetrics page="home"/><nav className="public-nav"><Brand showAppType/><div><Link href="#how-it-works">How it works</Link><Link href="/pricing">Pricing</Link><PublicAuthLink/></div></nav><main className="landing landing-home" id="main-content">
<section className={homeStyles.hero} aria-labelledby="home-title"><div className={homeStyles.copy}><div className="eyebrow">HOUSEHOLD ADMIN, ORGANISED</div><h1 id="home-title">Your household,<br/><em>a little more organised.</em></h1><p>Keep bills, home maintenance and purchase records together. See what needs attention, record what’s done, and find the proof when you need it.</p><div className="hero-actions"><Link className="button primary" href="/add">Start organizing for free <ArrowRight size={17} aria-hidden="true"/></Link><Link className="button secondary" href="/demo">Explore a sample account</Link></div><p className={homeStyles.footnote}>Start with a name. Add dates and details at your pace.</p></div><HomeOverview/></section>
<HouseholdShowcase/>
<section className="category-section"><h2>What would you like to organise first?</h2><p className="section-description">Start with one bill, a home service, or a purchase you want to keep track of.</p><div className="home-template-directory home-category-priorities">{reminderCategories.slice(0,3).map(category=><Link href={'/add?category=' + category.key} key={category.key}><ReminderIcon template={category.choices[0].template} group={category.key}/><span className="home-category-copy"><strong>{category.label}</strong><small>{category.description}</small></span><ArrowRight size={17} aria-hidden="true"/></Link>)}</div><details className={homeStyles.moreCategories}><summary>More things you can organise</summary><div className="home-template-directory">{reminderCategories.slice(3).map(category=><Link href={'/add?category=' + category.key} key={category.key}><ReminderIcon template={category.choices[0].template} group={category.key}/><span className="home-category-copy"><strong>{category.label}</strong><small>{category.description}</small></span><ArrowRight size={17} aria-hidden="true"/></Link>)}</div></details></section>
<HomeSupportingSections/>
<section className="public-faq"><h2>Your household admin questions, answered</h2><details><summary>What is Keeply?</summary><p>Keeply is a household admin app for organising bills, home maintenance, receipts, warranties and renewals. Keep useful records with their dates, record completed payments and services, and choose optional alerts. You enter the details and schedules you want to track.</p></details><details><summary>What can I organise with Keeply?</summary><p>Start with water and electric bills, rent and household dues, aircon cleaning and home services, or purchase receipts and appliance warranties. You can also track subscriptions, loan installments, vehicle registration, insurance renewals, passport and ID expiry, appointments and school deadlines.</p></details><details><summary>Is Keeply free?</summary><p>A free account includes unlimited saved household items, important dates, optional alerts, payment and service history, 30-day planning and 100 MB of private file storage. Premium adds planning up to a year ahead. <Link href="/pricing">Compare Free and Premium</Link>.</p></details><details><summary>Can I set reminders for water, electric and car bills?</summary><p>Yes. Choose a bill category, enter the due date shown on your bill and opt into alerts. For a regular schedule, choose a repeat frequency and an optional end date. For bills with changing due dates, update the next date from each bill. Keeply does not pay bills or import billing schedules.</p></details><details><summary>What date should I use for an ID or clearance?</summary><p>Use the expiration date printed on your document when applicable, or choose a renewal appointment, update or follow-up date. Keeply does not assume a validity period.</p></details><details><summary>Will loan reminders repeat until the loan ends?</summary><p>Yes. Choose monthly, quarterly, every six months or yearly, set your next payment and an optional end date, and choose alerts. Dates continue automatically until your chosen end date or until you stop the schedule. Unconfirmed past dates stay in history. Keeply does not make payments or calculate balances, interest or lender schedules.</p></details><details><summary>How do I plan for upcoming payments?</summary><p>Save the amount you expect to pay and see one total for the next 30 days. You can label an amount as an estimate, add missing amounts and record payments you’ve already made directly from the payment list.</p></details><details><summary>How does household readiness work?</summary><p>Readiness shows which records have their relevant key details saved or marked not applicable. You can leave a detail as not known yet or hide a suggestion. It measures record completeness, not household safety, and never requires file uploads.</p></details><details><summary>Do I need to upload an ID?</summary><p>No. ID, passport and clearance reminders only need a helpful name and your chosen date. Do not include scans or identity numbers.</p></details><details><summary>Are alerts automatic?</summary><p>You choose alerts for each date. Email is the default. Manage it in Alert Options, where proposed timings are editable. Alert delivery also follows your account preferences.</p></details><details><summary>Can Keeply renew my documents?</summary><p>Keeply helps you remember and organise. Confirm official deadlines and complete renewals with the responsible provider or agency.</p></details><details><summary>Can I delete what I’ve saved?</summary><p>Yes. You can remove a reminder or request account deletion in Settings. See the privacy policy for file cleanup and backup limits.</p></details></section>
<nav aria-label="More household admin tools" className="related-tools space-bottom"><Link href="/vehicle-registration-reminder">Vehicle registration and service dates</Link><Link href="/document-expiry-tracker">Passport and ID expiry tracker</Link></nav><section className="home-final-cta"><h2>Start with one thing.</h2><p>Give your next bill, purchase or home service a place. Build your household account at your own pace.</p><Link className="button primary" href="/add">Start organizing for free <ArrowRight size={17} aria-hidden="true"/></Link></section></main><footer className="app-footer"><span>Little things, safely kept.</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/pricing">Pricing</Link><Link href="/privacy#contact">Contact</Link><Link href="/feedback">Feedback</Link></div></footer></>;}
