import { choiceHref, reminderCategories } from '@/features/templates/categories';
import { discoveryText, emailButton, emailLayout, emailLink, emailPanel, escapeHtml } from './email-layout';

export const ideaThemes = ['start', 'loans', 'vehicles', 'bills', 'custom', 'insurance', 'subscriptions', 'documents', 'purchases', 'maintenance', 'health', 'education'] as const;
export type IdeaTheme = typeof ideaThemes[number];
const copy: Record<IdeaTheme, { subject: string; heading: string; description: string; action: string }> = {
  start: { subject: 'One important date, safely remembered', heading: 'Start with one thing on your mind', description: 'A bill, a renewal, an appointment, or a personal plan. Give its next date a place in Keeply, and choose the alerts that work for you.', action: 'Add your first reminder' },
  loans: { subject: 'One less payment date to keep in your head', heading: 'Make room for your next payment date', description: 'Have a loan or installment to keep track of? Save its next payment date. You can add an amount and a repeat schedule that matches your agreement.', action: 'Add a loan reminder' },
  vehicles: { subject: 'Keep your next car renewal in view', heading: 'A little more time to plan your renewal', description: 'Have a car or motorcycle? Keep its confirmed registration date, insurance renewal, and service dates together. Use the dates from your documents.', action: 'Add a vehicle reminder' },
  bills: { subject: 'Give your monthly bills a place', heading: 'Your household dates, neatly kept', description: 'Electricity, water, internet, or rent: save the next due date from your bill. If it repeats, choose a schedule that matches your provider.', action: 'Add a bill reminder' },
  custom: { subject: 'Your reminders can go beyond bills', heading: 'If it matters to you, keep its date', description: 'An appointment, a school deadline, or a personal plan deserves a place too. Choose a category or give your own reminder a name and a date.', action: 'Create your own reminder' },
  insurance: { subject: 'Keep your next insurance date close', heading: 'A place for your policy dates', description: 'If you have insurance, save premium payments, policy renewals, or a date to review your coverage. Use the confirmed dates from your provider.', action: 'Add an insurance reminder' },
  subscriptions: { subject: 'A clearer view of your subscriptions', heading: 'Remember the dates that keep things going', description: 'Have a subscription or membership? Keep payment dates and renewal decisions in view, with a repeat schedule you choose.', action: 'Add a subscription reminder' },
  documents: { subject: 'A little more time for your next renewal', heading: 'Keep your important document dates ready', description: 'A passport, license, or clearance may have a date to plan around. Save its printed expiry or a confirmed appointment; not every ID expires.', action: 'Add a document reminder' },
  purchases: { subject: 'Keep your warranty dates within reach', heading: 'Your receipt, ready when it matters', description: 'Have a purchase with warranty coverage? Keep its receipt and actual expiry date together, so you can check the terms when you need them.', action: 'Add a warranty reminder' },
  maintenance: { subject: 'Make a little room for home upkeep', heading: 'Keep your next service in view', description: 'Aircon cleaning, appliance service, or home maintenance: save the next date you choose and useful notes for when it comes around.', action: 'Add a service reminder' },
  health: { subject: 'Keep your next appointment in view', heading: 'One less appointment to keep in your head', description: 'Have a checkup or an appointment booked? Save the confirmed date and choose an alert that gives you time to get ready.', action: 'Add an appointment reminder' },
  education: { subject: 'Give your school dates a place', heading: 'A clearer view of the next school deadline', description: 'Tuition, enrollment, or a school deadline: save the date confirmed by your school and any notes that will help when it comes around.', action: 'Add a school reminder' },
};
export function ideaContent(theme: IdeaTheme, variant = 0) {
  const group = reminderCategories.find(c => c.key === theme);
  const choices = group?.choices || [];
  const choice = choices.length ? choices[(variant % 2 + 2) % 2 % choices.length] : undefined;
  return { ...copy[theme], example: choice?.label || 'A name, a date, and a little peace of mind', href: theme === 'start' ? '/add' : choice ? choiceHref(choice) : '/add/other' };
}
export function reminderIdeaEmail(input: { from: string; to: string; url: string; unsubscribe: string; theme: IdeaTheme; variant: number }) {
  const content = ideaContent(input.theme, input.variant);
  const action = input.url + content.href;
  const coverage = 'You can keep as many dates as you need. Email alerts follow your preferences and available alert slots; review coverage in the app.';
  return {
    from: input.from, to: input.to, subject: content.subject,
    headers: { 'List-Unsubscribe': '<' + input.unsubscribe + '>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    text: content.heading + '\n\n' + content.description + '\nTry: ' + content.example + '\n' + content.action + ': ' + action + '\n\n' + coverage + '\n\n' + discoveryText(input.url) + '\n\nYou opted in to Reminder ideas & tips.\nUnsubscribe from ideas & tips: ' + input.unsubscribe + '\nManage email preferences: ' + input.url + '/settings/alerts',
    html: emailLayout({ url: input.url, preview: content.description, eyebrow: 'A little inspiration', heading: content.heading, body: '<p style="margin:0 0 24px">' + escapeHtml(content.description) + '</p>' + emailPanel('Something you could keep', content.example, 'Save the date you know. Choose the alerts you need.') + emailButton(action, content.action) + '<p style="font-size:13px;color:#655e73">' + escapeHtml(coverage) + ' ' + emailLink(input.url + '/settings/billing', 'Review your alert slots') + '</p>', reason: 'You received this email because you opted in to Reminder ideas & tips. Your deadline alerts have their own preference.', unsubscribe: input.unsubscribe }),
  };
}
