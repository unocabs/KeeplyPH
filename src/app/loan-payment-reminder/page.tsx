import { PublicAuthLink } from '@/components/public-auth-link';
import Link from 'next/link';
import { Brand } from '@/components/brand';
import { ReminderIcon } from '@/components/reminder-icon';
import { IdCategory } from '@/components/id-category';
import { loanPresetKeys, reminderPresets } from '@/features/templates';

export const metadata = {
  title: 'Loan Payment Reminders',
  description: 'Remember personal, home, car, government and online loan payments with Keeply. Set monthly reminders, an optional peso amount and your loan end date.',
  alternates: { canonical: '/loan-payment-reminder' },
};
export default function LoanPaymentReminderPage() {
  return <><nav className="public-nav"><Brand/><div><Link href="/pricing">Pricing</Link><PublicAuthLink/></div></nav><main id="main-content" className="landing tracker-page">
    <section className="landing-hero"><div className="eyebrow">LOAN & INSTALLMENT REMINDERS</div><h1>Remember each payment.<br/>Through your final due date.</h1><p>Keep personal loans, home loans, car loans and other installments together. Set up a recurring reminder once and Keeply follows the dates you choose.</p><Link className="button primary" href="/add/other?preset=personal-loan">Start a loan reminder</Link></section>
    <section className="panel"><h2>Your payment schedule, easy to check.</h2><dl className="spaced"><dt>Next payment</dt><dd>October 15, 2026</dd><dt>Repeat frequency</dt><dd>Monthly</dd><dt>Payment amount (optional)</dt><dd>₱8,450</dd><dt>End date (optional)</dt><dd>March 15, 2029</dd><dt>Reminder</dt><dd>7 days before each payment</dd></dl><p className="hint spaced">Example only. Enter the dates and amounts from your own repayment schedule.</p></section>
    <section className="category-section"><h2>Which loan do you want to remember?</h2><div className="template-grid"><IdCategory group="loans"/>{loanPresetKeys.map(key => <Link className="template-choice" key={key} href={'/add/other?preset=' + key}><ReminderIcon template="other" preset={key}/><strong>{reminderPresets[key].label}</strong></Link>)}</div></section>
    <section className="tracker-section"><h2>Recurring dates that keep going.</h2><p>Choose monthly, quarterly, every six months or yearly. Keeply creates the next date automatically, even if you have not marked the previous one done. Choose an end date or let the schedule continue until you stop it, and past dates that were not marked done remain unconfirmed in history.</p><p>For a date such as January 31, a shorter month uses its last day and the next month returns to the original day. Check your lender’s actual schedule and edit your dates if they differ.</p><p>Choose reminders from 0 to 27 days before each date. Choose an advance reminder, a due-day alert, or both. Email reminders for the same day are grouped into one household email. Your account preferences control delivery.</p></section>
    <section className="tracker-section"><h2>Useful for more than loans.</h2><p>The same recurring reminder controls can track rent, association dues, insurance installments, subscriptions, tuition and utility bills. Choose an insurance, bill or custom reminder category, give your date a name, and set its repeat frequency and optional end date.</p><Link className="button secondary" href="/add/other">Add any recurring reminder</Link></section>
    <section className="panel"><h2>A reminder, with you in control.</h2><p className="spaced">The payment amount is optional. Keeply does not make payments, calculate interest or balances, or connect to your lender. You can edit a schedule, stop it from repeating, or archive a reminder to pause alerts.</p><p className="spaced">Start with unlimited saved items and optional alerts. Explore the months ahead with Premium planning. <Link href="/pricing">See pricing →</Link></p></section>
  </main></>;
}
