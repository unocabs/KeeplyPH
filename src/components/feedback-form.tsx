'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
import { submitFeedback } from '@/features/feedback/actions';
import type { FeedbackStatus, FeedbackResult } from '@/features/feedback/schema';
import { formatDate } from '@/lib/domain';

export function FeedbackForm({ initialStatus, submissionId }: { initialStatus: FeedbackStatus; submissionId: string }) {
  const [state, action, pending] = useActionState<FeedbackResult, FormData>(submitFeedback, {});
  const [id] = useState(submissionId);
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [kind, setKind] = useState('suggestion');
  const status = state.status || initialStatus;
  return <section className="panel feedback-panel">
    <h2>{state.success ? 'A little better, together.' : 'What could we improve?'}</h2>
    {status.eligible ? <div className="alert info spaced"><strong>A one-time thank-you: 5 extra reminder slots for 30 days.</strong><p>Tell us what worked, what confused you, or what you would improve. Honest feedback is welcome—positive or negative.</p><p>Eight total slots. If you already have a temporary pack, we add 30 days to its remaining time. No payment details, automatic charges, or extra file storage.</p></div>
      : <p className="section-description spaced">{status.permanent ? 'Your permanent slots are already included. We still welcome your feedback; notes are optional.' : status.claimed ? 'You have already claimed your one-time reward. Additional notes are optional.' : 'We welcome your feedback. The reward offer is currently unavailable; notes are optional.'}</p>}
    {status.claimed && status.expires_at && !status.permanent && <p className="hint spaced">Your feedback reward term ends {formatDate(status.expires_at, true)}. See <Link className="text-button" href="/settings/billing">plan & billing</Link> for your current access.</p>}
    {state.success ? <div className="spaced"><p className="alert success" role="status">{state.success}</p><p className="spaced">Reminders remain your choice. Existing paused selections may resume when capacity returns.</p><div className="hero-actions spaced"><Link className="button primary" href="/items?filter=reminders">Manage reminders</Link><button className="button secondary" onClick={() => window.location.reload()}>Add more feedback</button></div></div>
      : <form action={action} className="settings-form spaced" aria-describedby={state.error ? "feedback-error" : undefined}>
        <input type="hidden" name="id" value={id}/><input type="hidden" name="expect_reward" value={String(status.eligible)}/>
        <label>Feedback type<select name="kind" value={kind} onChange={e => setKind(e.target.value)}><option value="problem">Problem</option><option value="suggestion">Suggestion</option><option value="general">General feedback</option></select></label>
        <label>Short summary<input name="summary" required minLength={5} maxLength={120} value={summary} onChange={e => setSummary(e.target.value)} placeholder="What would make Keeply more useful?" aria-invalid={Boolean(state.error && (summary.trim().length < 5 || summary.trim().length > 120))}/></label>
        <div className="field-stack">
          <label htmlFor="feedback-notes">Tell us more</label>
          <p id="feedback-notes-requirement" className="field-help">{status.eligible ? 'Required to receive your one-time reward.' : 'Optional.'}</p>
          <p id="feedback-notes-guide" className="field-help">What were you trying to do, and what would have made it easier?</p>
          <textarea id="feedback-notes" name="notes" rows={4} required={status.eligible} minLength={status.eligible ? 30 : undefined} maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="For example, I wanted to find a receipt by store name…" aria-describedby="feedback-notes-requirement feedback-notes-guide feedback-notes-minimum feedback-privacy" aria-invalid={Boolean(state.error && status.eligible && notes.trim().length < 30)}/>
          <div className="field-meta"><span id="feedback-notes-minimum">{status.eligible ? 'At least 30 characters' : 'Notes are optional'}</span><span className="field-count">{notes.trim().length.toLocaleString('en-PH')} / 2,000</span></div>
        </div>
        <p id="feedback-privacy" className="field-privacy"><LockKeyhole size={15} aria-hidden="true"/><span>Please don’t include passwords, payment details, or ID numbers.</span></p>
        <p className="hint">Feedback is private to Keeply’s operators and retained for up to 12 months. <Link className="text-button" href="/privacy">Privacy details</Link></p>
        {state.error && <p id="feedback-error" className="alert error" role="alert">{state.error}</p>}
        <button className="button primary" disabled={pending}>{pending ? 'Saving feedback…' : 'Send feedback'}</button>
      </form>}
  </section>;
}
