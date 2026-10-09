'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { actionError } from '@/lib/action-error';
import { addMonths, formatDate, parseMoney } from '@/lib/domain';
import { nextRecurringDate } from '@/features/items/recurrence';
import { activityLabels, activityTitle, completionType, type ItemActivity } from '@/features/items/activity';
import { recordOccurrence, saveActivity } from '@/features/items/activity-actions';
import type { ItemWithDetails, DateWithDetails, Occurrence } from '@/features/items/domain';
import { sampleDocumentUrl } from '@/lib/demo-documents';
import styles from './activity-history.module.css';

export function ActivityEditor({ item, today, activity, date, occurrence, demo = false, onClose }: {
  item: ItemWithDetails; today: string; activity?: ItemActivity; date?: DateWithDetails; occurrence?: Occurrence; demo?: boolean; onClose: () => void;
}) {
  const router = useRouter();
  const request = useRef('');
  const submitting = useRef(false);
  const [type, setType] = useState(activity?.activity_type || (date ? completionType(item, date) : 'service'));
  const [title, setTitle] = useState(activity?.title || (date ? activityTitle(item, date) : ''));
  const [completed, setCompleted] = useState(activity?.completed_on || today);
  const [amount, setAmount] = useState(activity?.amount_minor == null ? '' : String(activity.amount_minor / 100));
  const [notes, setNotes] = useState(activity?.notes || '');
  const [documents, setDocuments] = useState(activity?.document_ids || []);
  const [reason, setReason] = useState('');
  const [next, setNext] = useState('');
  const [policy, setPolicy] = useState(date?.recurrence_months ? date.recurrence_policy || 'fixed' : 'manual');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const schedule = Boolean(date && occurrence?.status === 'open');
  const service = date?.kind === 'service';
  const warranty = date?.kind === 'warranty';
  const repeating = Boolean(date?.recurrence_months);
  const proposed = schedule && date && occurrence ? policy === 'stop' ? null : repeating ? nextRecurringDate(
    policy === 'from_completion' ? completed : date.recurrence_anchor!,
    policy === 'from_completion' ? completed : occurrence.due_on,
    date.recurrence_months!, date.recurrence_ends_on || null,
  ) : policy === 'from_completion' && date.interval_months ? addMonths(completed, date.interval_months) : next || null : null;
  const eligibleDocuments = item.documents.filter(doc => doc.state === 'ready');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError(''); setSuccess('');
    if (demo) { setSuccess('Sample activity reviewed. No changes are saved.'); return; }
    submitting.current = true; setBusy(true);
    try {
      request.current ||= crypto.randomUUID();
      const input = { activity_type: type, title, completed_on: completed, amount_minor: parseMoney(amount), notes, document_ids: documents };
      const result = date && occurrence
        ? await recordOccurrence(request.current, occurrence.id, date.revision, input, schedule && !repeating && !warranty ? next : '', !schedule || warranty ? 'fixed' : policy)
        : await saveActivity(activity?.id || request.current, item.id, activity?.revision || 0, input, reason, request.current);
      if (result.error) throw new Error(result.error);
      onClose(); router.refresh();
    } catch (error) { setError(actionError(error)); }
    finally { submitting.current = false; setBusy(false); }
  }

  return <form className={styles.editor} onSubmit={submit}>
    <fieldset disabled={busy}>
      <h3>{activity ? 'Correct activity' : occurrence ? 'Record completion' : 'Add an activity'}</h3>
      {occurrence && <p className="hint spaced">For {date?.label}, scheduled {formatDate(occurrence.due_on)}. Record something you have already done.</p>}
      {demo && <p className="alert info spaced">This sample does not save changes or make payments.</p>}
      <div className="field-grid spaced">
        {!occurrence && <label className="full">Activity type<select aria-label="Activity type" value={type} onChange={event => setType(event.target.value as typeof type)}>{Object.entries(activityLabels).filter(([key]) => key !== 'warranty_closed' || type === 'warranty_closed').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
        <label className="full">What happened?<input required maxLength={160} value={title} onChange={event => setTitle(event.target.value)} placeholder="For example, filter cleaning completed" /></label>
        <label>Completed on<input type="date" required min="1900-01-01" max={today} value={completed} onChange={event => setCompleted(event.target.value)} /></label>
        <label>{type === 'payment' ? 'Amount paid' : 'Cost'} (optional, PHP)<input type="text" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" /><span className="hint">The actual amount, not an estimate.</span></label>
        <label className="full">Notes (optional)<textarea rows={3} maxLength={5000} value={notes} onChange={event => setNotes(event.target.value)} /></label>
        {eligibleDocuments.length > 0 && <div className="full"><p className="hint">Supporting documents (optional)</p>{eligibleDocuments.map(doc => <label className="checkbox-row" key={doc.id}><input type="checkbox" checked={documents.includes(doc.id)} onChange={event => setDocuments(current => event.target.checked ? [...current, doc.id] : current.filter(id => id !== doc.id))} /><span>{doc.original_name}{demo && sampleDocumentUrl(doc.id) && <a className="text-button spaced" href={sampleDocumentUrl(doc.id)!} target="_blank" rel="noopener noreferrer">View sample</a>}</span></label>)}</div>}
        {schedule && !warranty && <>
          {(repeating || (service && date?.interval_months)) && <label className="full">Next date<select aria-label="Next date" value={policy} onChange={event => { setPolicy(event.target.value); setNext(''); }}>
            {repeating ? <option value="fixed">Keep the original schedule</option> : <option value="manual">Enter a confirmed date, or finish</option>}
            {service && <option value="from_completion">Schedule from the completion date</option>}
            <option value="stop">Finish this schedule</option>
          </select></label>}
          {!repeating && policy === 'manual' && <label className="full">Next confirmed date (optional)<input type="date" min={completed} max="2200-12-31" value={next} onChange={event => setNext(event.target.value)} /><span className="hint">Leave empty to finish.</span></label>}
          <p className="hint full">Next scheduled date: {proposed ? formatDate(proposed) : 'None'}.{policy === 'from_completion' && repeating ? ' Future services wait for completion before advancing.' : ''}</p>
        </>}
        {occurrence && !schedule && <p className="hint full">This records an earlier reminder. Your current schedule stays the same.</p>}
        {warranty && <p className="hint full">This ends tracking. It does not renew warranty coverage.</p>}
        {activity && <><label className="full">Reason for correction<textarea required rows={2} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label><p className="hint full">The previous entry is retained in correction history. Future dates stay the same.</p></>}
      </div>
      {error && <p className="alert error spaced" role="alert">{error}</p>}
      {success && <p className="alert success spaced" role="status">{success}</p>}
      <div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary">{busy ? 'Saving…' : demo ? 'Review sample activity' : activity ? 'Save correction' : type === 'payment' ? 'Confirm payment recorded' : 'Save activity'}</button></div>
    </fieldset>
  </form>;
}
