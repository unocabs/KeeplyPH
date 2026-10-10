'use client';
import { PushOptions } from './push-options';
import { useState } from 'react';
import { Bell, Mail } from 'lucide-react';
import type { AlertPreferences } from '@/lib/alert-options';
import { saveEmailPreferences } from '@/features/alerts/actions';

export function AlertOptions({ initial, demo = false, pushPublicKey = null }: { initial: AlertPreferences; demo?: boolean; pushPublicKey?: string | null; rewardClaimed?: boolean }) {
  const [suggestions, setSuggestions] = useState(initial.suggestion_emails_enabled || false);
  const [email, setEmail] = useState(initial.email_reminders_enabled);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (demo) { setMessage('Sample options updated. Sign in to save your own preferences.'); return; }
      const result = await saveEmailPreferences(email, suggestions);
      if (result.error) setError(result.error);
      else setMessage(result.success || 'Alert options saved.');
    } catch { setError('Unable to save right now. Please try again.'); } finally { setBusy(false); }
  }
  return <div className="alert-options">
    <div className="detail-type"><Bell size={22} aria-hidden="true"/><span className="eyebrow">YOUR ALERTS, YOUR WAY</span></div>
    <h2>One helpful heads-up.</h2><p className="section-description">Email is the default. Choose the reminders that matter to you.</p>
    <form onSubmit={save}><fieldset disabled={busy} className="spaced">
      <label className="checkbox-row"><input type="checkbox" checked={email} onChange={e => setEmail(e.target.checked)}/><span><strong><Mail size={16} aria-hidden="true"/> Receive email</strong><p>Full details and a direct link to review, complete or update your reminder.</p></span></label>
      <label className="checkbox-row spaced"><input type="checkbox" checked={suggestions} onChange={e => setSuggestions(e.target.checked)}/><span><strong><Mail size={16} aria-hidden="true"/> Reminder ideas &amp; tips</strong><p>Optional ideas for loans, car renewals, bills, and other dates. Starts two days after you opt in, weekly in your first month, then every two weeks. Unsubscribe anytime without turning off deadline alerts.</p></span></label>
      {!email && <p className="alert info spaced">Deadline emails are off. Your reminders stay saved. Connected web push devices can still receive alerts.</p>}
      <p className="hint spaced">Reminders scheduled for the same day are grouped into one household email. Timings follow each date’s settings.</p>
      {error && <p className="alert error spaced" role="alert">{error}</p>}{message && <p className="alert success spaced" role="status">{message}</p>}
      <button className="button primary spaced">{busy ? 'Saving…' : 'Save alert options'}</button>
    </fieldset></form>
    <PushOptions publicKey={pushPublicKey} initialCount={initial.push_subscription_count} demo={demo} />
  </div>;
}
