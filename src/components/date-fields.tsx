'use client';
import { useState } from 'react';
import { addMonths } from '@/lib/domain';
import { templates, dateLabels, defaultOffsets, type DateKind, type TemplateKey, type Offset } from '@/features/templates';
export interface DateInput { kind: DateKind; label: string; due_on: string; reminders_enabled: boolean; offsets: Offset[]; interval_months: number | null; last_completed_on?: string }
export function initialDate(template: TemplateKey, focus?: string): DateInput {
  const kind = templates[template].kinds.includes(focus as DateKind) ? focus as DateKind : templates[template].kinds[0];
  return { kind, label: dateLabels[kind], due_on: '', reminders_enabled: false, offsets: defaultOffsets(template, kind), interval_months: null };
}
export function DateFields({ template, value, onChange }: { template: TemplateKey; value: DateInput; onChange: (v: DateInput) => void }) {
  const [last, setLast] = useState(value.last_completed_on || '');
  const patch = (p: Partial<DateInput>) => onChange({ ...value, ...p });
  function interval(months: number | null) { patch({ interval_months: months, ...(last && months ? { due_on: addMonths(last, months) } : {}) }); }
  return <div className="date-fields">
    {templates[template].kinds.length > 1 && <label>What would you like to remember?<select value={value.kind} onChange={e => { const kind = e.target.value as DateKind; onChange({ ...value, kind, label: dateLabels[kind], offsets: defaultOffsets(template, kind), interval_months: null }); }}>{templates[template].kinds.map(k => <option key={k} value={k}>{dateLabels[k]}</option>)}</select></label>}
    {value.kind === 'other' && <label>Date name<input required maxLength={160} value={value.label} onChange={e => patch({ label: e.target.value })} placeholder="e.g. Membership renewal" /></label>}
    {value.kind === 'service' && <details><summary>Calculate from the last service</summary><div className="field-grid spaced"><label>Last completed<input type="date" value={last} onChange={e => { setLast(e.target.value); patch({ last_completed_on: e.target.value, ...(e.target.value && value.interval_months ? { due_on: addMonths(e.target.value, value.interval_months) } : {}) }); }} /></label><label>Repeat every (months)<input type="number" min={1} max={120} value={value.interval_months || ''} onChange={e => interval(e.target.value ? Number(e.target.value) : null)} /></label></div><div className="presets">{[3,6,12].map(m => <button key={m} type="button" onClick={() => interval(m)}>{m} months</button>)}</div><p className="hint">Choose the interval recommended by your technician or manufacturer. No frequency is assumed.</p></details>}
    <label>{value.kind === 'expiration' ? 'Printed expiration date' : value.kind === 'service' ? 'Next service date' : 'Important date'}<input required type="date" min="1900-01-01" max="2200-12-31" value={value.due_on} onChange={e => patch({ due_on: e.target.value })} /></label>
    {value.kind === 'registration' && <p className="hint">Enter the deadline confirmed on your current documents or by LTO. Keeply does not calculate deadlines from plate numbers.</p>}
    {['licence','passport'].includes(template) && <p className="hint">Only a name and date are needed. Do not add your ID number or a scan. A reminder does not confirm travel or renewal eligibility.</p>}
    <label className="checkbox-row"><input type="checkbox" checked={value.reminders_enabled} onChange={e => patch({ reminders_enabled: e.target.checked })} /><span><strong>Email me before this date</strong><p>All enabled dates on this item share one reminder slot. Your first 3 item slots are free. Items always save, even when slots are full.</p></span></label>
    <p className="hint">Timings: {value.offsets.map(o => o.value + ' ' + o.unit).join(', ')} before, around 9 AM in your account timezone. Past nudges are not sent.</p>
    <details><summary>Change reminder timings</summary>{value.offsets.map((offset, n) => <div className="offset-row" key={n}><label>Timing {n+1}<input type="number" min={offset.unit === 'months' ? 1 : 0} max={offset.unit === 'months' ? 24 : 365} value={offset.value} onChange={e => patch({ offsets: value.offsets.map((o,i) => i === n ? { ...o, value: Number(e.target.value) } : o) })} /></label><label>Unit<select value={offset.unit} onChange={e => patch({ offsets: value.offsets.map((o,i) => i === n ? { unit: e.target.value as Offset['unit'], value: 1 } : o) })}><option value="days">Days before</option><option value="months">Calendar months before</option></select></label><button className="text-button" type="button" disabled={value.offsets.length === 1} onClick={() => patch({ offsets: value.offsets.filter((_,i) => i !== n) })}>Remove</button></div>)}{value.offsets.length < 3 && <button type="button" className="text-button" onClick={() => patch({ offsets: [...value.offsets, { unit: 'days', value: 1 }] })}>Add a timing</button>}</details>
  </div>;
}
