import { PublicAuthLink } from '@/components/public-auth-link';
import { headers } from 'next/headers';
import { PublicMetrics } from '@/components/public-metrics';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CalendarDays, Camera, ShieldCheck, Bell } from 'lucide-react';
import { Brand } from '@/components/brand';
import { DateIcon, ReminderIcon } from '@/components/reminder-icon';
import { AlertIndicator } from '@/components/alert-indicator';
import { HeroReminders } from '@/components/hero-reminders';
const title = 'All-in-One Loan, Bill, Warranty & ID Reminders';
const description = 'Track loan payments, bills, warranties, IDs and any important date in one place. Set recurring payment reminders through your end date with Keeply PH.';
const homeCategories = [
  { label: 'Vehicles', description: 'Registration, insurance and maintenance.', href: '/add/car', logos: [
    { name: 'Toyota', source: '/car-brands/toyota.webp' },
    { name: 'Honda', source: '/car-brands/honda.webp' },
    { name: 'Mitsubishi', source: '/car-brands/mitsubishi.webp' },
  ] },
  { label: 'Bills & installments', description: 'Utilities, rent and recurring payments.', href: '/add/other?preset=electric-bill', logos: [
    { name: 'Meralco', source: '/utilities/meralco.webp' },
    { name: 'Globe', source: '/utilities/globe.webp' },
    { name: 'Home Credit', source: '/lenders/home-credit.webp' },
  ] },
  { label: 'Insurance', description: 'Premium payments, policy renewals and reviews.', href: '/add/other?preset=life-insurance', logos: [
    { name: 'Sun Life', source: '/insurers/sun-life.webp' },
    { name: 'Pru Life UK', source: '/insurers/pru-life-uk.webp' },
    { name: 'AXA', source: '/insurers/axa.webp' },
  ] },
  { label: 'Subscriptions', description: 'Streaming, music and membership payments.', href: '/add/other?preset=streaming', logos: [
    { name: 'Netflix', source: '/subscription-brands/netflix.webp' },
    { name: 'Spotify', source: '/subscription-brands/spotify.webp' },
    { name: 'Disney+', source: '/subscription-brands/disney-plus.webp' },
  ] },
] as const;
export const metadata = {
  title, description, alternates: { canonical: '/' },
  openGraph: { title: title + ' · Keeply PH', description, url: '/', siteName: 'Keeply PH', locale: 'en_PH', type: 'website' },
  twitter: { card: 'summary_large_image', title: title + ' · Keeply PH', description },
};
export default async function HomePage(){const nonce=(await headers()).get('x-nonce') || undefined;return <><script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'WebSite','name':'Keeply PH','url':'https://www.keeplyph.com','inLanguage':'en-PH'},{'@type':'WebApplication','name':'Keeply','url':'https://www.keeplyph.com','applicationCategory':'LifestyleApplication','operatingSystem':'Web browser','description':description,'featureList':['Warranty and appliance reminders','Recurring loan payment reminders','Car payment and renewal reminders','ID and passport date reminders','NBI and Police Clearance reminders','Water and electric bill reminders','Optional alerts'],'inLanguage':'en-PH'}]}).replace(/</g,'\u003c')}}/><PublicMetrics page="home"/><nav className="public-nav"><Brand/><div><Link href="#how-it-works">How it works</Link><Link href="/pricing">Pricing</Link><PublicAuthLink/></div></nav><main className="landing landing-home" id="main-content">
<section className="landing-hero"><HeroReminders/><div className="eyebrow">WARRANTIES, BILLS & IMPORTANT DATES</div><h1>All your reminders.<br/><em>One easy place.</em></h1><p>Keep your bills, renewals and warranties with the details you need when the date arrives.</p><div className="hero-actions"><Link className="button primary" href="/add">Start for free <ArrowRight size={17} aria-hidden="true"/></Link><Link className="button secondary" href="/demo">See an example</Link></div><p className="hero-footnote">Save unlimited items. Get alerts for 3 items free.<br/>Multiple dates on the same item count as one.<br/>No credit card required.</p></section>
<section className="landing-preview" aria-labelledby="example-title">
  <div className="section-heading"><h2 id="example-title">One item. Different dates.</h2><span className="badge none">Example</span></div>
  <p className="section-description">Keep registration, insurance and maintenance dates together under one car.</p>
  <div className="home-example-tracker">
    <div className="home-example-item">
      <ReminderIcon template="car" brand="toyota" size={24}/>
      <div className="home-example-item-copy"><h3 className="reminder-name">Toyota Vios <AlertIndicator status="enabled"/></h3><p className="home-example-summary"><strong>3 dates</strong><span>1 alert slot</span></p></div>
    </div>
    <ul className="home-example-dates" aria-label="Dates tracked for Toyota Vios">
      {([['registration','Registration','27 days remaining'],['insurance','Insurance renewal','2 months remaining'],['service','Maintenance / PMS','3 months remaining']] as const).map(([kind,label,time])=><li className={`home-example-date home-example-date-${kind}`} key={kind}><span className="home-example-date-icon"><DateIcon kind={kind} size={20}/></span><h4>{label}</h4><p className="home-example-countdown"><CalendarDays size={16} aria-hidden="true"/>{time}</p></li>)}
    </ul>
    <div className="home-example-note"><Bell size={16} aria-hidden="true"/><p>Set each date’s timing and alerts separately.</p></div>
  </div>
  <p className="hint spaced">Email is the default; optional browser notifications are available in Alert Options. SMS is coming soon.</p>
  <Link className="text-button spaced" href="/demo/items/99999999-9999-4999-8999-999999999999">Explore a sample car →</Link>
</section>
<section className="category-section"><h2>Start with a date you don’t want to miss.</h2><p className="section-description">A few everyday places to start. Choose a type, add your details, and decide whether you want alerts.</p><div className="home-template-directory">{homeCategories.map(category=><Link href={category.href} key={category.href}><span className="home-category-logos">{category.logos.map(logo=><span className="home-category-logo" key={logo.source}><Image src={logo.source} alt={logo.name} width={40} height={40}/></span>)}</span><span className="home-category-copy"><strong>{category.label}</strong><small>{category.description}</small></span><ArrowRight size={17} aria-hidden="true"/></Link>)}</div><Link className="text-button spaced" href="/add">Explore all reminder types →</Link></section>
<section id="how-it-works" className="landing-features"><div><Camera size={25}/><h3>Choose what you want to keep.</h3><p>Choose a warranty, bill, ID or renewal. Start with the date you forget most often.</p></div><div><Bell size={25}/><h3>Add the details that matter.</h3><p>Save a document where supported, add a date, and choose whether you want alerts.</p></div><div><ShieldCheck size={25}/><h3>Find it when you need it.</h3><p>Your reminders and files are private to your account. Google sign-in keeps getting back to them simple.</p></div></section>
<section id="loan-payments" className="panel space-bottom"><h2>Loan payments repeat. Your reminders should too.</h2><p className="section-description">Personal loans, home and car loans, salary or government loans, credit card installments, business loans and more. Add your next payment and frequency, an optional payment amount, and an optional end date. Keeply keeps the dates coming so you do not have to recreate a reminder every month.</p><p className="spaced">For example: next payment October 15, 2026 · Monthly · ₱8,450 (optional) · Ends March 15, 2029 · Reminder 7 days before.</p><div className="hero-actions spaced"><Link className="button secondary" href="/add/other?preset=personal-loan">Add a loan reminder</Link><Link className="text-button" href="/loan-payment-reminder">Explore loan payment reminders →</Link></div><p className="hint spaced">The same recurring date controls work for rent, association dues, subscriptions, tuition, utility bills and insurance installments. Choose the dates from your provider’s schedule.</p></section>
<section className="panel space-bottom"><h2>When is your car registration due?</h2><p className="section-description">Use our free LTO renewal date calculator to check your plate’s renewal month and date window. Then prepare your requirements and save a reminder.</p><Link className="text-button spaced" href="/lto-registration-renewal#renewal-calculator">Check my car renewal schedule →</Link></section>
<section id="home-appliances" className="panel space-bottom"><h2>Appliance warranties and household bills, together.</h2><p className="section-description">Save the warranty for a new fridge, plan an aircon clean, and add the due dates from your water and electric bills. Keeply gives those household deadlines a home.</p><div className="hero-actions spaced"><Link className="button secondary" href="/add/receipt?category=appliances">Keep an appliance receipt</Link><Link className="button secondary" href="/add/aircon">Remember an aircon clean</Link></div><Link className="text-button spaced" href="/aircon-cleaning-schedule">When should I clean my aircon? Schedules, prices &amp; booking tips →</Link></section>
<section className="panel"><h2>A little room, for free.</h2><p className="spaced">Save unlimited items. Get alerts for 3 items free.</p><p className="section-description">Multiple dates on the same item count as one alert slot. Includes 100 MB of private document storage. No credit card required.</p><Link className="text-button spaced" href="/pricing">See alert packs →</Link></section>
<section className="public-faq"><h2>Your reminder questions, answered</h2><details><summary>What can I keep in this all-in-one reminder app?</summary><p>Track recurring loan payments, purchase and appliance warranties, car payments, vehicle registration and insurance, Driver’s License and passport expiration, PRC License, Postal ID, PWD / Solo Parent ID and other ID dates, NBI and Police Clearance dates, and water and electric bill deadlines. You can also create a custom reminder for any other important date.</p></details><details><summary>Can I set reminders for water, electric and car bills?</summary><p>Yes. Choose a bill category, enter the due date shown on your bill and opt into alerts. For a regular schedule, choose a repeat frequency and an optional end date. For bills with changing due dates, update the next date from each bill. Keeply does not pay bills or import billing schedules.</p></details><details><summary>What date should I use for an ID or clearance?</summary><p>Use the expiration date printed on your document when applicable, or choose a renewal appointment, update or follow-up date. Keeply does not assume a validity period.</p></details><details><summary>Will loan reminders repeat until the loan ends?</summary><p>Yes. Choose monthly, quarterly, every six months or yearly, set your next payment and an optional end date, and choose alerts. Dates continue automatically until your chosen end date or until you stop the schedule. Unconfirmed past dates stay in history. Keeply does not make payments or calculate balances, interest or lender schedules.</p></details><details><summary>Do I need to upload an ID?</summary><p>No. ID, passport and clearance reminders only need a helpful name and your chosen date. Do not include scans or identity numbers.</p></details><details><summary>Are alerts automatic?</summary><p>You choose alerts for each date. Email is the default. Manage it in Alert Options, where SMS is coming soon. Proposed timings are editable. Alert delivery also follows your account preferences.</p></details><details><summary>Can Keeply renew my documents?</summary><p>Keeply helps you remember and organise. Confirm official deadlines and complete renewals with the responsible provider or agency.</p></details><details><summary>Can I delete what I’ve saved?</summary><p>Yes. You can remove a reminder or request account deletion in Settings. See the privacy policy for file cleanup and backup limits.</p></details></section>
<section className="home-final-cta"><h2>Start with one thing.</h2><p>Your next bill, warranty or renewal can be one less thing on your mind.</p><Link className="button primary" href="/add">Start for free <ArrowRight size={17} aria-hidden="true"/></Link></section></main><footer className="app-footer"><span>Little things, safely kept.</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/pricing">Pricing</Link><Link href="/privacy#contact">Contact</Link><Link href="/feedback">Feedback</Link></div></footer></>;}
