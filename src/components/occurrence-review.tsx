'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/domain';
import { actionError } from '@/lib/action-error';
import { skipOccurrence } from '@/features/items/activity-actions';
import type { Occurrence, DateWithDetails } from '@/features/items/domain';
import styles from './activity-history.module.css';

export function OccurrenceReview({ occurrence, date, demo, archived, onComplete }: {
  occurrence: Occurrence; date: DateWithDetails; demo: boolean; archived: boolean; onComplete: () => void;
}) {
  const router = useRouter();
  const request = useRef('');
  const submitting = useRef(false);
  const [open, setOpen] = useState(false), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function skip(event: React.FormEvent) {
    event.preventDefault(); if (submitting.current) return;
    if (demo) { setError('This sample does not save changes.'); return; }
    submitting.current = true; setBusy(true); setError('');
    try {
      request.current ||= crypto.randomUUID();
      const result = await skipOccurrence(request.current, occurrence.id, date.revision, reason, occurrence.status === 'skipped');
      if (result.error) throw new Error(result.error);
      setOpen(false); router.refresh();
    } catch (error) { setError(actionError(error)); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <div className={styles.review}>
    <strong>Scheduled {formatDate(occurrence.due_on)}</strong>
    {!archived && <div className={styles.actions}>{occurrence.status !== 'skipped' && <button type="button" className="text-button" disabled={busy} onClick={onComplete}>Record completion</button>}<button type="button" className="text-button" disabled={busy} onClick={() => { setOpen(!open); setError(''); }}>{occurrence.status === 'skipped' ? 'Reopen for review' : 'Mark as skipped'}</button></div>}
    {open && <form onSubmit={skip}><fieldset disabled={busy}><label className="spaced">{occurrence.status === 'skipped' ? 'Reason for reopening' : 'Reason for skipping'}<textarea required maxLength={1000} rows={2} value={reason} onChange={event => setReason(event.target.value)} /></label><p className="hint spaced">This does not record a payment or completion. Your current schedule stays the same.</p><div className="form-actions"><button type="button" className="button secondary" onClick={() => { setOpen(false); setError(''); }}>Cancel</button><button className="button primary">{busy ? 'Saving…' : occurrence.status === 'skipped' ? 'Confirm reopened' : 'Confirm skipped'}</button></div></fieldset></form>}
    {error && <p className="alert error spaced" role="alert">{error}</p>}
  </div>;
}
