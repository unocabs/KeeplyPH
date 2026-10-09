'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, formatMoney } from '@/lib/domain';
import { actionError } from '@/lib/action-error';
import { activityCorrections, activityHistory, voidActivity } from '@/features/items/activity-actions';
import { activityLabels, type ActivityCorrection, type ItemActivity } from '@/features/items/activity';
import type { ItemWithDetails } from '@/features/items/domain';
import { sampleDocumentUrl } from '@/lib/demo-documents';
import { ActivityEditor } from './activity-editor';
import styles from './activity-history.module.css';

function Corrections({ activity }: { activity: ItemActivity }) {
  const [rows, setRows] = useState<ActivityCorrection[] | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef(false);
  async function load() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { setRows(await activityCorrections(activity.id)); }
    catch(error) { setError(actionError(error)); }
    finally { pending.current = false; setBusy(false); }
  }
  return <details className="spaced" onToggle={event => { if(event.currentTarget.open && rows === null) void load(); }}><summary>Correction history</summary>
    {busy && <p className="hint spaced" role="status">Loading corrections…</p>}
    {error && <p className="alert error spaced" role="alert">{error} <button type="button" className="text-button" onClick={() => void load()}>Retry</button></p>}
    {rows && <><p className="hint spaced">Latest 20 corrections. All earlier versions remain retained.</p><ol className={styles.list}>{rows.map((row, index) => <li className={styles.entry} key={index}><p className={styles.meta}>{formatDate(row.created_at)}</p><strong>{row.reason}</strong><p>Previous entry: {row.before.title}, {formatDate(row.before.completed_on)}{row.before.amount_minor != null ? ', ' + formatMoney(row.before.amount_minor) : ''}{row.before.voided_at ? ' (removed)' : ''}.</p>{row.before.notes && <p className={styles.notes}>{row.before.notes}</p>}<p>Updated entry: {row.after.title}, {formatDate(row.after.completed_on)}{row.after.amount_minor != null ? ', ' + formatMoney(row.after.amount_minor) : ''}{row.after.voided_at ? ' (removed)' : ''}.</p>{row.after.notes && <p className={styles.notes}>{row.after.notes}</p>}</li>)}</ol></>}
  </details>;
}

export function ActivityHistory({ item, today, demo = false, addRequest = 0 }: { item: ItemWithDetails; today: string; demo?: boolean; addRequest?: number }) {
  const router = useRouter();
  const page = item.activity_history || { activities: [], has_more: false };
  const [initial, setInitial] = useState(item.activity_history);
  const [rows, setRows] = useState(page.activities);
  const [more, setMore] = useState(page.has_more);
  const [edit, setEdit] = useState<ItemActivity | 'new' | null>(null);
  const [handledAdd, setHandledAdd] = useState(addRequest);
  const [remove, setRemove] = useState<ItemActivity | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  if (handledAdd !== addRequest) {
    setHandledAdd(addRequest);
    if (!edit && !remove && !busy) { setEdit('new'); setError(''); setMessage(''); }
  }
  if (initial !== item.activity_history) { setInitial(item.activity_history); setRows(page.activities); setMore(page.has_more); }

  async function older() {
    if (inFlight.current || !rows.length) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const last = rows.at(-1)!;
      const result = await activityHistory(item.id, last.created_at, last.id);
      setRows(current => [...current, ...result.activities]); setMore(result.has_more);
    } catch (error) { setError(actionError(error)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function confirmRemove(event: React.FormEvent) {
    event.preventDefault(); if (!remove || inFlight.current) return;
    if (demo) { setMessage('Sample removal reviewed. No changes are saved.'); return; }
    inFlight.current = true; setBusy(true); setError('');
    try {
      const result = await voidActivity(remove.id, remove.revision, reason);
      if (result.error) throw new Error(result.error);
      setRemove(null); setReason(''); setMessage('Activity removed. Its correction history is retained.'); router.refresh();
    } catch (error) { setError(actionError(error)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <section className="panel spaced" aria-labelledby="activity-history-heading">
    <div className="section-heading"><div><h2 id="activity-history-heading">Activity history</h2><p className="section-description">Payments, services and useful things you have recorded.</p></div>{!item.archived_at && <button type="button" className="text-button" disabled={busy || Boolean(edit) || Boolean(remove)} onClick={() => { setEdit('new'); setError(''); setMessage(''); }}>Add activity</button>}</div>
    {demo && <p className="hint spaced">Illustrative history from this sample account.</p>}
    {edit && <ActivityEditor key={edit === 'new' ? 'new' : edit.id} item={item} today={today} demo={demo} activity={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} />}
    {remove && <form className={styles.editor} onSubmit={confirmRemove}><fieldset disabled={busy}><h3>Remove this recorded activity?</h3><p className="spaced">{remove.title}. {remove.occurrence_id ? 'This reminder will need a check again. Future dates stay the same.' : 'It will remain visible as a removed entry.'}</p><label className="spaced">Reason<textarea required maxLength={1000} rows={2} value={reason} onChange={event => setReason(event.target.value)} /></label><div className="form-actions"><button type="button" className="button secondary" onClick={() => { setRemove(null); setReason(''); setError(''); }}>Cancel</button><button className="button primary">{busy ? 'Removing…' : demo ? 'Review sample removal' : 'Remove recorded activity'}</button></div></fieldset></form>}
    {error && <p className="alert error spaced" role="alert">{error}</p>}
    {message && <p className="alert success spaced" role="status">{message}</p>}
    {!rows.length && <p className="hint spaced">No activities recorded yet. Record a completed payment or service, or add an activity here.</p>}
    <ol className={styles.list}>{rows.map(activity => <li key={activity.id} className={styles.entry + (activity.voided_at ? ' ' + styles.voided : '')}>
      <p className={styles.meta}>{formatDate(activity.completed_on)} · {activityLabels[activity.activity_type]}{activity.voided_at ? ' · Removed' : ''}</p>
      <h3>{activity.title}</h3>
      {activity.scheduled_on && <p className={styles.meta}>Scheduled for {formatDate(activity.scheduled_on)}</p>}
      {activity.amount_minor != null && <p>{formatMoney(activity.amount_minor)}</p>}
      {activity.notes && <p className={styles.notes}>{activity.notes}</p>}
      {activity.source === 'legacy_completion' && <p className="hint">From an earlier recorded completion. Any details not recorded remain unknown.</p>}
      {activity.revision > 1 && <p className="hint">Corrected entry. Previous versions are retained.</p>}
      {activity.revision > 1 && !demo && <Corrections key={activity.id + '-' + activity.revision} activity={activity} />}
      <div className={styles.actions}>{activity.document_ids.map(id => { const doc = item.documents.find(doc => doc.id === id && doc.state === 'ready'); const href = demo ? sampleDocumentUrl(id) : '/api/documents/' + id + '/download'; return doc && href ? <a key={id} className="text-button" href={href}>View {doc.original_name}</a> : null; })}
      {!activity.voided_at && !item.archived_at && <><button type="button" className="text-button" disabled={busy || Boolean(edit) || Boolean(remove)} onClick={() => { setEdit(activity); setError(''); setMessage(''); }}>Edit Details</button><button type="button" className="text-button" disabled={busy || Boolean(edit) || Boolean(remove)} onClick={() => { setRemove(activity); setError(''); setMessage(''); }}>Remove recorded activity</button></>}</div>
    </li>)}</ol>
    {more && !demo && <button type="button" className="text-button spaced" disabled={busy} onClick={() => void older()}>{busy ? 'Loading…' : 'Load older activities'}</button>}
  </section>;
}
