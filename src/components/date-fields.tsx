'use client';
import { recurrenceFrequencies, previewRecurringDates, type RecurrenceFields } from '@/features/items/recurrence';
import { useState } from 'react';
import { addMonths, formatDate } from '@/lib/domain';
import { templates, dateLabels, defaultOffsets, getReminderPreset, type DateKind, type TemplateKey, type Offset } from '@/features/templates';
import { paymentPreset, presetCategory } from '@/features/templates/categories';
import { alertMode, offsetsForRecurrence, presetOffsets, timingLabel } from '@/features/items/alert-schedule';
export interface DateInput extends RecurrenceFields { kind: DateKind; label: string; due_on: string; reminders_enabled: boolean; offsets: Offset[]; interval_months: number | null; last_completed_on?: string }
export function initialDate(template: TemplateKey, focus?: string): DateInput {
  const kind = templates[template].kinds.includes(focus as DateKind) ? focus as DateKind : templates[template].kinds[0];
  return { kind, label: dateLabels[kind], due_on: '', reminders_enabled: false, offsets: defaultOffsets(template, kind), interval_months: null, recurrence_months: null, recurrence_ends_on: null, payment_amount_minor: null };
}
export function DateFields({ template, value, onChange, preset }: { template: TemplateKey; value: DateInput; onChange: (v: DateInput) => void; preset?: string | null }) {
  const [last, setLast] = useState(value.last_completed_on || '');
  const [ends, setEnds] = useState(Boolean(value.recurrence_ends_on));
  const [amountOpen, setAmountOpen] = useState(value.payment_amount_minor != null);
  const [customTimings, setCustomTimings] = useState(false);
  const mode = customTimings ? 'custom' : alertMode(value.offsets, Boolean(value.recurrence_months));
  const choice = getReminderPreset(template, preset || undefined);
  const insurance = presetCategory(preset) === 'insurance';
  const premium = insurance && value.label === choice?.dateLabel;
  const payment = value.kind === 'other' && (premium || (!insurance && paymentPreset(preset)));
  const insurancePurpose = !insurance ? '' : premium ? 'premium' : value.label === 'Policy renewal / review' ? 'renewal' : 'custom';
  const patch = (p: Partial<DateInput>) => onChange({ ...value, ...p });
  function interval(months: number | null) { patch({ interval_months: months, ...(last && months ? { due_on: addMonths(last, months) } : {}) }); }
  const preview = value.recurrence_months && value.due_on ? previewRecurringDates(value.recurrence_anchor || value.due_on, value.due_on, value.recurrence_months, value.recurrence_ends_on || null) : [];
  return <div className="date-fields">
    {templates[template].kinds.length > 1 && <label>What would you like to remember?<select value={value.kind} onChange={e => { const kind = e.target.value as DateKind; onChange({ ...value, kind, label: dateLabels[kind], offsets: defaultOffsets(template, kind), interval_months: null, recurrence_months: null, recurrence_anchor: null, recurrence_ends_on: null, payment_amount_minor: null }); setEnds(false); }}>{templates[template].kinds.map(k => <option key={k} value={k}>{dateLabels[k]}</option>)}</select></label>}
    {insurance && <label>What would you like to remember?<select value={insurancePurpose} onChange={e => patch({ label: e.target.value === 'premium' ? choice!.dateLabel : e.target.value === 'renewal' ? 'Policy renewal / review' : 'Important date', payment_amount_minor: null })}><option value="premium">Premium payment</option><option value="renewal">Policy renewal / review</option><option value="custom">Another insurance date</option></select></label>}
    {value.kind === 'other' && (!insurance || insurancePurpose === 'custom') && <label>Date name<input required maxLength={160} value={value.label} onChange={e => patch({ label: e.target.value })} placeholder="e.g. Membership renewal" /></label>}
    {value.kind === 'service' && <details><summary>Calculate from the last service</summary><div className="field-grid spaced"><label>Last completed<input type="date" value={last} onChange={e => { setLast(e.target.value); patch({ last_completed_on: e.target.value, ...(e.target.value && value.interval_months ? { due_on: addMonths(e.target.value, value.interval_months) } : {}) }); }} /></label><label>Service interval (months)<input type="number" min={1} max={120} value={value.interval_months || ''} onChange={e => interval(e.target.value ? Number(e.target.value) : null)} /></label></div><div className="presets">{[3,6,12].map(m => <button key={m} type="button" onClick={() => interval(m)}>{m} months</button>)}</div><p className="hint">This calculates your next service date. Choose a repeat frequency below only if you want a fixed schedule to continue automatically.</p></details>}
    <label>{premium ? 'Next premium payment' : payment ? 'Next payment' : value.kind === 'expiration' ? 'Printed expiration date' : value.kind === 'service' ? 'Next service date' : 'Next important date'}<input required type="date" min="1900-01-01" max="2200-12-31" value={value.due_on} onChange={e => patch({ due_on: e.target.value, recurrence_anchor: null })} /></label>
    {template === 'car' && value.kind === 'registration' && <p className="hint"><strong>New car?</strong> Brand-new private cars generally come with three-year initial LTO registration. Three years can fly by. Set your first renewal reminder now, and your future self will thank you. Check your OR/CR or confirm with LTO for the correct renewal deadline. <a className="text-button" href="https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/10/41852" target="_blank" rel="noreferrer">LTO registration guidance ↗</a></p>}
    {value.kind !== 'warranty' && <label>Repeat frequency<select value={value.recurrence_months || ''} onChange={e => patch({ recurrence_months: e.target.value ? Number(e.target.value) : null, recurrence_anchor: null, recurrence_ends_on: e.target.value ? value.recurrence_ends_on : null, ...(e.target.value ? { offsets: offsetsForRecurrence(value.offsets) } : {}) })}><option value="">Does not repeat</option>{recurrenceFrequencies.map(f => <option key={f.months} value={f.months}>{f.label}</option>)}</select></label>}
    {Boolean(value.recurrence_months) && <>
      <label>Schedule ends<select value={ends ? 'date' : 'never'} onChange={e => { setEnds(e.target.value === 'date'); patch({ recurrence_ends_on: null }); }}><option value="never">No end date</option><option value="date">End on a date</option></select></label>
      {ends && <label>End date<input required type="date" min={value.due_on || '1900-01-01'} max="2200-12-31" value={value.recurrence_ends_on || ''} onChange={e => patch({ recurrence_ends_on: e.target.value || null })}/></label>}
      {preview.length > 0 && <div className="schedule-preview" aria-live="polite"><strong>Upcoming dates</strong><p>{preview.map(date => formatDate(date, true)).join(' → ')}</p><p className="hint">{recurrenceFrequencies.find(f => f.months === value.recurrence_months)?.label} · {ends && value.recurrence_ends_on ? 'Ends ' + formatDate(value.recurrence_ends_on) : ends ? 'Choose an end date' : 'Continues until you stop it'}</p></div>}
      <p className="hint">Dates continue automatically {ends ? 'through your end date' : 'until you stop the schedule'}. Past dates stay in history as unconfirmed. Choose your own schedule; Keeply does not confirm payments, renewals or appointments. Alerts can be set 0–27 days before each date.</p>
    </>}
    {(payment || amountOpen || value.payment_amount_minor != null) ? <label>{premium ? 'Premium amount' : 'Payment amount'} (₱, optional)<input type="number" min="0" max="999999999.99" step="0.01" placeholder="8450.00" value={value.payment_amount_minor == null ? '' : value.payment_amount_minor / 100} onChange={e => patch({ payment_amount_minor: e.target.value === '' ? null : Math.round(Number(e.target.value) * 100) })}/></label> : value.kind === 'other' && <button className="text-button" type="button" onClick={() => setAmountOpen(true)}>Add a payment amount (optional)</button>}
    {value.kind === 'registration' && <p className="hint">Enter the deadline confirmed on your current documents or by LTO. Keeply does not calculate deadlines from plate numbers.</p>}
    {['licence','passport'].includes(template) && <p className="hint">Only a name and date are needed. Do not add your ID number or a scan. Use the printed expiration date; any repeat schedule is your own follow-up plan.</p>}
    <label className="checkbox-row"><input type="checkbox" checked={value.reminders_enabled} onChange={e => patch({ reminders_enabled: e.target.checked })} /><span><strong>Send me alerts for this date</strong><p>All enabled dates on this reminder share one alert slot. Your first 3 alert slots are free. Reminders always save, even when slots are full.</p></span></label>
    <label>Alert schedule<select value={mode} onChange={e => {
      const selected = e.target.value;
      setCustomTimings(selected === 'custom');
      if (selected === 'gentle' || selected === 'standard') patch({ offsets: presetOffsets(selected, Boolean(value.recurrence_months)) });
    }}><option value="gentle">Gentle · 7 days before</option><option value="standard">Standard · {value.recurrence_months ? '14' : '30'}, 7 and 1 day before</option><option value="custom">Custom · choose your timings</option></select></label>
    <div className="schedule-preview" aria-live="polite"><strong>{value.reminders_enabled ? 'Selected alert timings' : 'Alert timings · alerts are off'}</strong><ul className="alert-timings">{value.offsets.map((offset, n) => <li key={n}>{timingLabel(offset)}</li>)}</ul><p className="hint">Around 9 AM in your account timezone. Past alert times are skipped. The due date stays the same.</p></div>
    {mode === 'custom' ? <div>{value.offsets.map((offset, n) => <div className="offset-row" key={n}><label>Timing {n+1}<input type="number" min={offset.unit === 'months' ? 1 : 0} max={value.recurrence_months ? 27 : offset.unit === 'months' ? 24 : 365} value={offset.value} onChange={e => patch({ offsets: value.offsets.map((o,i) => i === n ? { ...o, value: Number(e.target.value) } : o) })} /></label><label>Unit<select value={offset.unit} onChange={e => patch({ offsets: value.offsets.map((o,i) => i === n ? { unit: e.target.value as Offset['unit'], value: 1 } : o) })}><option value="days">Days before</option>{!value.recurrence_months && <option value="months">Calendar months before</option>}</select></label><button className="text-button" type="button" disabled={value.offsets.length === 1} onClick={() => patch({ offsets: value.offsets.filter((_,i) => i !== n) })}>Remove</button></div>)}{value.offsets.length < 3 && <button type="button" className="text-button" onClick={() => {
      const next = [1, 0, 7, 3, 14].find(day => !value.offsets.some(offset => offset.unit === 'days' && offset.value === day))!;
      patch({ offsets: [...value.offsets, { unit: 'days', value: next }] });
    }}>Add a timing</button>}<p className="hint">Choose up to 3 timings. Use 0 days for an alert on the due date.</p></div> : <button type="button" className="text-button" onClick={() => setCustomTimings(true)}>Customize timings</button>}
  </div>;
}
