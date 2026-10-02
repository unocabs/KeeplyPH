import { formatDate } from './domain';
import { escapeHtml, emailLayout, emailPanel, emailButton, discoveryText } from './email-layout';
export function renewalEmail(input: { from: string; to: string; expires: string; expired: boolean; url: string }) {
  const sentence = input.expired ? 'Your extra alert slots have expired. Your saved reminders and three free slots are still here.' : 'Your extra alert slots expire on ' + formatDate(input.expires) + '.';
  const next = 'Choose your slot count and renew for another 30 days if you’d like to keep them. No automatic charges.';
  const billing = input.url + '/settings/billing';
  return {
    from: input.from, to: input.to,
    subject: input.expired ? 'Your extra Keeply slots have expired' : 'Your Keeply alert slots renew soon',
    text: sentence + '\n\n' + next + '\nReview your alert slots: ' + billing + '\n\n' + discoveryText(input.url) + '\n\nEmail preferences: ' + input.url + '/settings/alerts',
    html: emailLayout({ url: input.url, preview: sentence, eyebrow: 'Your account', heading: input.expired ? 'Your reminders are still safely kept' : 'Keep your extra alerts going', body: emailPanel('Extra alert slots', input.expired ? 'Your extra slots have expired' : 'Available until ' + formatDate(input.expires), 'Your saved reminders and three free slots stay with you.') + '<p>' + escapeHtml(sentence) + '</p><p>' + escapeHtml(next) + '</p>' + emailButton(billing, 'Review your alert slots'), reason: 'You received this account notice because slot-renewal emails are enabled. Manage renewal notices in billing settings.' }),
  };
}
