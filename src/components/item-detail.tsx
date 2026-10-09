'use client';
import Link from 'next/link';
import { CalendarDays, Plus, Pencil } from 'lucide-react';
import { useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { actionError } from '@/lib/action-error';
import { recurrenceFrequencies } from '@/features/items/recurrence';
import { formatDate, formatMoney, type Usage } from '@/lib/domain';
import { templates, getReminderPreset } from '@/features/templates';
import { alertStatus, currentOccurrence, dateStatus, type ItemWithDetails, type DateWithDetails } from '@/features/items/domain';
import { snoozeDate, dateHistory, saveDate, archiveItem, deleteItem } from '@/features/items/actions';
import { DateFields, initialDate, type DateInput } from './date-fields';
import { CoverageControl } from './reminder-management';
import { reminderProviderLabel } from '@/features/items/provider-label';
import { ReminderIcon, DateIcon } from './reminder-icon';
import { ItemDocuments } from './item-documents';
import { nextAlertSummary, timingLabel } from '@/features/items/alert-schedule';
import { completionLabel } from '@/features/items/date-action';
import { paymentDate, presetCategory } from '@/features/templates/categories';
import { ActivityEditor } from './activity-editor';
import { ActivityHistory } from './activity-history';
import { OccurrenceReview } from './occurrence-review';
import type { Occurrence } from '@/features/items/domain';
import { ReadinessPanel } from './readiness-panel';
import { OccurrenceAmount } from './occurrence-amount';
function DateEditor({ item, date, demo, onClose }: { item: ItemWithDetails; date?: DateWithDetails; demo: boolean; onClose: () => void }) {
  const router=useRouter(), id=useRef(date?.id || '');
  const [value,setValue]=useState<DateInput>(date ? { kind:date.kind,label:date.label,due_on:currentOccurrence(date)?.due_on || '',reminders_enabled:date.reminders_enabled,offsets:date.offsets,interval_months:date.interval_months, recurrence_months:date.recurrence_months, recurrence_ends_on:date.recurrence_ends_on, recurrence_anchor:date.recurrence_anchor, payment_amount_minor:date.payment_amount_minor, payment_amount_certainty:date.payment_amount_certainty } : initialDate(item.template_key, undefined, item.reminder_preset));
  const [error,setError]=useState(''), [busy,setBusy]=useState(false);
  async function submit(e: React.FormEvent) { e.preventDefault(); if(demo){ setError('This preview does not store changes. Sign in to save your dates.'); return; } setBusy(true);setError(''); try { id.current ||= crypto.randomUUID(); const r=await saveDate(id.current,item.id,date?.revision || 0,value);if(r.error) throw new Error(r.error);onClose();router.refresh(); }catch(e){setError(actionError(e));}finally{setBusy(false);} }
  return <form onSubmit={submit} className="panel spaced"><fieldset disabled={busy}><h3>{date ? 'Edit date & schedule' : 'Add an important date'}</h3><DateFields preset={item.reminder_preset} template={item.template_key} value={value} onChange={setValue}/>{error && <p className="alert error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary">{busy ? 'Saving…' : 'Save date'}</button></div></fieldset></form>;
}
function DateCard({ item, date, today, demo }: { item:ItemWithDetails;date:DateWithDetails;today:string;demo:boolean }) {
  const intent = useSearchParams();
  const selected = intent.get('date') === date.id;
  const router = useRouter(), current = currentOccurrence(date);
  const initialTarget = selected && intent.get('action') === 'complete'
    ? [...date.occurrences, ...(date.selected_occurrence ? [date.selected_occurrence] : [])].find(o => ['open','unconfirmed'].includes(o.status) && (intent.get('occurrence') ? o.id === intent.get('occurrence') : o.due_on === intent.get('due'))) || null : null;
  const [edit,setEdit] = useState(selected && intent.get('action') === 'edit');
  const [target,setTarget] = useState<Occurrence | null>(initialTarget);
  const [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const [history,setHistory] = useState(date.occurrences), [hasOlder,setHasOlder] = useState(date.occurrences.length === 20);
  const reviewHistory = date.selected_occurrence && !history.some(o => o.id === date.selected_occurrence?.id) ? [...history,date.selected_occurrence] : history;
  const loadingHistory = useRef(false);
  async function older() {
    if (loadingHistory.current) return;
    loadingHistory.current = true; setBusy(true); setError('');
    try { const rows = await dateHistory(date.id,Math.min(...history.map(o=>o.cycle))); setHistory(h=>[...h,...rows]); setHasOlder(rows.length === 20); }
    catch { setError('Unable to load older history. Please retry.'); }
    finally { loadingHistory.current = false; setBusy(false); }
  }
  const [snoozeOpen,setSnoozeOpen]=useState(false), [snoozeChoice,setSnoozeChoice]=useState('tomorrow'), [snoozeOn,setSnoozeOn]=useState('');
  async function snooze(choice=snoozeChoice) {
    if(demo){setError('This preview does not store changes or send notifications.');return;}
    if(!current)return;
    setBusy(true);setError('');
    try {const result=await snoozeDate(date.id,current.id,date.revision,choice,snoozeOn);if(result.error)throw new Error(result.error);setSnoozeOpen(false);router.refresh();}
    catch(e){setError(e instanceof Error?e.message:'Unable to snooze.');}finally{setBusy(false);}
  }
  const alert = nextAlertSummary(item, date, today);
  const payment = paymentDate(item.reminder_preset, date.kind, date.label);
  const service = date.kind === 'service' || presetCategory(item.reminder_preset) === 'maintenance';
  const frequency = recurrenceFrequencies.find(f => f.months === date.recurrence_months)?.label;
  const scheduleLabel = payment ? 'Recurring payment' : service ? 'Recurring service' : 'Repeats';
  const completionForm = target && <ActivityEditor key={target.id} item={item} date={date} occurrence={target} today={today} demo={demo} onClose={() => setTarget(null)} />;
  return <section className="panel spaced" id={'date-'+date.id}><div className="section-heading"><h2 className="date-title"><DateIcon kind={date.kind} label={date.label} preset={item.reminder_preset} size={18}/>{date.label}</h2><button className="text-button" onClick={()=>setEdit(!edit)}>{edit?'Close editor':'Edit date & schedule'}</button></div>
    {payment && current && !item.archived_at && !target && <button type="button" className="button primary date-primary-action" disabled={busy} onClick={()=>{setTarget(current);}}>{completionLabel(item, date)}</button>}
    {payment && completionForm}
    {payment && error&&<p className="alert error" role="alert">{error}</p>}
    <div className="reminder-date-summary">
      <div><span className="hint">Due date</span><p className="expiry-big">{current ? formatDate(current.due_on) : date.recurrence_months ? 'Schedule ended' : 'No upcoming date'}</p>{current && <p className={'date-countdown' + (current.due_on <= today ? ' date-countdown-urgent' : '')}>{dateStatus({ item, date, occurrence: current }, today)}</p>}</div>
      <div><span className="hint">{demo && alert.label === 'Next alert' ? 'Sample next alert' : alert.label}</span><p className="next-alert-value">{alert.value}</p>{current && date.next_scheduled_on && current.due_on >= today && alert.label !== 'Alerts paused' && alert.label !== 'Alerts off' && <p className="hint">{demo ? 'Illustrative timing only. This preview does not send alerts.' : 'Delivery follows your account timezone and queue availability.'}</p>}{alert.label === 'Alerts paused' && item.alert_delivery_paused && <Link className="text-button" href={(demo ? '/demo' : '') + '/settings/alerts'}>Alert Options →</Link>}</div>
    </div>
    {date.kind !== 'warranty' && <p className="spaced"><strong>{date.recurrence_months ? scheduleLabel + ' · ' + frequency : payment ? 'One-time payment' : service ? 'One-time service' : 'Does not repeat'}</strong> · <button className="text-button" type="button" onClick={()=>setEdit(true)}>{payment ? 'Change payment schedule' : 'Change schedule'}</button></p>}
    {current?.snoozed_on && <p className="alert info spaced">Snoozed until {formatDate(current.snoozed_on)} · 9 AM in your account timezone. <button type="button" className="text-button" disabled={busy} onClick={()=>void snooze('cancel')}>Cancel snooze</button></p>}
    {current && <div className="spaced">
      <div className="date-card-actions"><button type="button" className="button secondary" disabled={busy || alertStatus(item,date)!=='enabled'} aria-expanded={snoozeOpen} aria-controls={'snooze-'+date.id} onClick={()=>setSnoozeOpen(!snoozeOpen)}>Remind me later</button></div>
      {alertStatus(item,date)!=='enabled' && <p className="hint spaced">Enable alert coverage and a delivery channel to snooze this date.</p>}
      {snoozeOpen && <form id={'snooze-'+date.id} className="spaced" onSubmit={e=>{e.preventDefault();void snooze();}}><fieldset disabled={busy}><label htmlFor={'snooze-choice-'+date.id}>Remind me later</label><select id={'snooze-choice-'+date.id} value={snoozeChoice} onChange={e=>setSnoozeChoice(e.target.value)}><option value="tomorrow">Tomorrow</option><option value="three_days">In 3 days</option><option value="custom">Pick a date</option></select>
      {snoozeChoice==='custom' && <label>Reminder date<input type="date" required min={today} max="2200-12-31" value={snoozeOn} onChange={e=>setSnoozeOn(e.target.value)}/></label>}
      <p className="hint spaced">At 9 AM in your account timezone. Your due date and selected alert timings stay the same.</p><div className="form-actions"><button type="button" className="button secondary" onClick={()=>setSnoozeOpen(false)}>Cancel</button><button className="button primary">{busy?'Saving…':'Snooze reminder'}</button></div></fieldset></form>}
    </div>}
    {current && current.due_on<today && <p className="alert error spaced">Check whether a renewal, payment or service still needs attention.</p>}
    <p className="hint spaced">Selected timings: {date.offsets.map(timingLabel).join(' · ')}. Delivery follows your alert coverage and account preferences.</p>
    {date.recurrence_months && <div className="spaced"><p><strong>Frequency:</strong> {recurrenceFrequencies.find(f => f.months === date.recurrence_months)?.label}</p><p><strong>End date:</strong> {date.recurrence_ends_on ? formatDate(date.recurrence_ends_on) : 'No end date'}</p><p className="hint">{date.recurrence_policy === 'from_completion' ? 'This service schedule advances when you record completion.' : 'The schedule continues automatically. Dates not marked done remain unconfirmed in history; they are never marked paid automatically.'} Edit the date to change or stop recurrence.</p></div>}
    {date.payment_amount_minor != null && <p className="spaced"><strong>{date.recurrence_months ? 'Schedule amount per cycle:' : 'Schedule amount:'}</strong> {formatMoney(date.payment_amount_minor)} {date.payment_amount_certainty === 'estimated' && <span className="hint">· Approx.</span>}</p>}
    {current && (payment || date.payment_amount_minor != null || current.expected_amount_minor != null) && <OccurrenceAmount key={current.id+'-'+date.revision} date={date} occurrence={current} demo={demo} archived={Boolean(item.archived_at)}/>}
    {selected && intent.get('action') === 'complete' && !initialTarget && <p className="alert info spaced">This alert was for an earlier date. Review the current date and history before marking anything done.</p>}
    {edit && <DateEditor item={item} date={date} demo={demo} onClose={()=>setEdit(false)}/>}
    {!payment&&current&&!item.archived_at&&!target&&<button className="button secondary spaced" onClick={()=>{setTarget(current);}}>{completionLabel(item, date)}</button>}

    {!payment && completionForm}
    {!payment && error&&<p className="alert error" role="alert">{error}</p>}
    {reviewHistory.some(o => o.status === 'unconfirmed') && <div className="spaced"><h3>Past reminders to check</h3><p className="hint">These were not marked completed. The next cycle does not confirm them.</p>{reviewHistory.filter(o => o.status === 'unconfirmed').map(o => <OccurrenceReview key={o.id} occurrence={o} date={date} demo={demo} archived={Boolean(item.archived_at)} onComplete={() => setTarget(o)} />)}</div>}
    <details className="spaced"><summary>History ({history.length} {history.length===1?'cycle':'cycles'})</summary><ul>{[...history].sort((a,b)=>b.cycle-a.cycle).map(o=><li key={o.id}>{formatDate(o.due_on)} · {o.status === 'unconfirmed' ? 'Not marked done' : o.status}{o.completed_on?' on '+formatDate(o.completed_on):''}{o.status === 'skipped' && <OccurrenceReview occurrence={o} date={date} demo={demo} archived={Boolean(item.archived_at)} onComplete={() => setTarget(o)} />}</li>)}</ul>{hasOlder&&!demo&&<button className="text-button" disabled={busy} onClick={()=>void older()}>Load older history</button>}</details></section>;
}
export function ItemDetail({item,usage,today,demo=false}:{item:ItemWithDetails;usage:Usage;today:string;demo?:boolean}){
  const intent=useSearchParams();
  const router=useRouter(), [add,setAdd]=useState(intent.get('addDate')==='1'&&item.dates.length<10),[error,setError]=useState(''),[busy,setBusy]=useState(false), base=demo?'/demo':'';
  async function change(remove=false){if(demo){setError('Sample reminders cannot be changed.');return;}if(remove&&!confirm('Permanently remove this reminder, its dates and attached files?'))return;setBusy(true);try{const r=remove?await deleteItem(item.id):await archiveItem(item.id,item.revision,!item.archived_at);if(r.error)throw new Error(r.error);if(remove)router.push('/items');router.refresh();}catch(e){setError(e instanceof Error?e.message:'Unable to update.');}finally{setBusy(false);}}
  return <><Link className="back-link" href={base+'/items'}>← Household items</Link><div className="page-heading"><div><div className="detail-type"><ReminderIcon productType={item.product_type} productName={item.product_name} template={item.template_key} category={item.category} preset={item.reminder_preset} brand={item.car_brand} motorcycleBrand={item.motorcycle_brand} subscriptionBrand={item.subscription_brand} utilityId={item.utility_id} insurerId={item.insurer_id} lenderId={item.lender_id}/><span className="eyebrow">{(getReminderPreset(item.template_key, item.reminder_preset || undefined) || templates[item.template_key]).label}</span></div><h1>{item.product_name}</h1><p>{[reminderProviderLabel(item), item.archived_at?'Archived · alerts paused':'Little things, safely kept.'].filter(Boolean).join(' · ')}</p></div><Link className="button secondary" href={base+(item.template_key==='receipt'?'/purchases/':'/items/')+item.id+'/edit'}><Pencil size={16} aria-hidden="true"/>Edit details</Link></div><div className="reminder-quick-actions"><CoverageControl item={item} usage={usage} demo={demo} /><section className="panel reminder-quick-card important-dates-quick"><span className="quick-action-icon"><CalendarDays size={22} aria-hidden="true"/></span><div className="quick-action-body"><h2>Important dates</h2><p className="hint">Add custom dates (optional)</p></div>{item.dates.length<10?<button type="button" className="quick-action-link" aria-expanded={add} aria-controls="add-important-date" onClick={()=>setAdd(!add)}><Plus size={15} aria-hidden="true"/>{add?'Cancel':'Add date'}</button>:<span className="hint">10 date limit</span>}</section></div><div className="detail-grid reminder-details"><section>{add&&<div id="add-important-date"><DateEditor item={item} demo={demo} onClose={()=>setAdd(false)}/></div>}{item.dates.map(d=><DateCard key={d.id+'-'+d.revision} item={item} date={d} today={today} demo={demo}/>)}<ActivityHistory item={item} today={today} demo={demo}/></section><aside><ReadinessPanel key={item.id+'-'+item.revision} item={item} demo={demo} onAddDate={()=>{if(item.dates.length<10)setAdd(true);requestAnimationFrame(()=>document.getElementById(item.dates.length<10?'add-important-date':'date-'+item.dates[0].id)?.scrollIntoView({behavior:'smooth',block:'start'}));}}/><section className="panel spaced"><h2>Your notes</h2><p className="notes-text spaced">{item.notes||'Nothing added yet.'}</p>{item.template_key==='receipt'&&<Link className="text-button spaced" href={base+'/purchases/'+item.id}>Receipt & purchase details →</Link>}</section>{templates[item.template_key].files&&<ItemDocuments id={item.id} kind={item.template_key === 'receipt' ? 'receipt' : item.template_key === 'aircon' ? 'service' : 'vehicle'} documents={item.documents} demo={demo}/>}<div className="danger-zone"><h3>{item.archived_at?'Restore this reminder':'Archive or remove'}</h3><p>Archiving pauses alerts and keeps your history. Save as many items as you need; attached files still use storage.</p><button className="button secondary" disabled={busy} onClick={()=>void change()}>{item.archived_at?'Restore reminder':'Archive reminder'}</button><button className="text-button spaced" disabled={busy} onClick={()=>void change(true)}>Delete reminder and files</button>{error&&<p className="alert error" role="alert">{error}</p>}</div></aside></div></>;
}
