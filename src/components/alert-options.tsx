'use client';
import { useState } from 'react';
import { Bell, Mail, Smartphone } from 'lucide-react';
import type { AlertPreferences } from '@/lib/alert-options';
import { saveEmailAlertPreference } from '@/features/alerts/actions';

export function AlertOptions({ initial, demo = false }: { initial: AlertPreferences; demo?: boolean }) {
  const [email, setEmail] = useState(initial.email_reminders_enabled);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (demo) { setMessage('Sample options updated. Sign in to save your own preferences.'); return; }
      const result = await saveEmailAlertPreference(email);
      if (result.error) setError(result.error);
      else setMessage(result.success || 'Alert options saved.');
    } catch { setError('Unable to save right now. Please try again.'); } finally { setBusy(false); }
  }
  return <div className="alert-options">
    <div className="detail-type"><Bell size={22} aria-hidden="true"/><span className="eyebrow">YOUR ALERTS, YOUR WAY</span></div>
    <h2>One helpful heads-up.</h2><p className="section-description">Email is the default. Choose the reminders that matter to you.</p>
    <form onSubmit={save}><fieldset disabled={busy} className="spaced">
      <label className="checkbox-row"><input type="checkbox" checked={email} onChange={e => setEmail(e.target.checked)}/><span><strong><Mail size={16} aria-hidden="true"/> Receive email</strong><p>Full details and a direct link to review, complete or update your reminder.</p></span></label>
      <label className="checkbox-row sms-coming-soon"><input type="checkbox" checked={false} disabled readOnly aria-describedby="sms-coming-soon-description"/><span><strong><Smartphone size={16} aria-hidden="true"/> Receive SMS <span className="badge none">Coming soon</span></strong><p id="sms-coming-soon-description">SMS alerts are coming soon. There’s nothing to set up right now.</p></span></label>
      {!email && <p className="alert info spaced">Email is off. Your reminders stay saved, but alerts are paused.</p>}
      <p className="hint spaced">Email alerts follow your selected timings and available alert coverage.</p>
      {error && <p className="alert error spaced" role="alert">{error}</p>}{message && <p className="alert success spaced" role="status">{message}</p>}
      <button className="button primary spaced">{busy ? 'Saving…' : 'Save alert options'}</button>
    </fieldset></form>
  </div>;
}
