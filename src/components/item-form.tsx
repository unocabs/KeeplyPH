'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { templates, getReminderPreset, isLoanPreset, addIntent, type TemplateKey } from '@/features/templates';
import { dateSchema } from '@/features/items/validation';
import { createItemDraft, saveItem, deleteItem } from '@/features/items/actions';
import type { ItemWithDetails } from '@/features/items/domain';
import { ReminderIcon } from './reminder-icon';
import { DateFields, initialDate } from './date-fields';
import { reminderCategories } from '@/features/templates/categories';
import { safeRenewalDate } from '@/lib/lto-schedule';
export function ItemForm({ template, item, focus, preset, renewalDate, demo = false }: { template: TemplateKey; item?: ItemWithDetails; focus?: string; preset?: string; renewalDate?: string; demo?: boolean }) {
  const suggestedDate = !item && template === 'car' && focus === 'registration' ? safeRenewalDate(renewalDate) : undefined;
  const [effectivePreset, setEffectivePreset] = useState(() => { const key = preset || item?.reminder_preset || undefined; return key === 'car-payment' ? 'car-loan' : key; });
  const selectedPreset = getReminderPreset(template, effectivePreset);
  const choice = selectedPreset || templates[template];
  const loan = isLoanPreset(effectivePreset);
  const identity = ['licence', 'passport'].includes(template) || selectedPreset?.identity;
  const router = useRouter(), id = useRef(item?.id || '');
  const [date, setDate] = useState(() => ({ ...initialDate(template, focus), ...(suggestedDate ? { due_on: suggestedDate } : {}), ...(selectedPreset ? { label: selectedPreset.dateLabel } : {}), ...(loan ? { recurrence_months: 1, recurrence_ends_on: null, offsets: [{ unit: 'days' as const, value: 7 }] } : {}) }));
  const optional = ['car','motorcycle'].includes(template);
  const [withDate, setWithDate] = useState(item?.state !== 'saved' && (!optional || Boolean(focus)));
  const dirty = useRef(false);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if(dirty.current)event.preventDefault(); }; window.addEventListener('beforeunload',warn); return () => window.removeEventListener('beforeunload',warn); }, []);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [preview, setPreview] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); if(withDate){ const parsed=dateSchema.safeParse(date);if(!parsed.success){setError(parsed.error.issues[0].message);return;} } if (demo) { setPreview(true); dirty.current=false; return; }
    const form = new FormData(e.currentTarget); setBusy(true);
    try {
      id.current ||= crypto.randomUUID();
      if (!item) { const draft = await createItemDraft(id.current, template); if (draft.error) throw new Error(draft.error); }
      if (effectivePreset) form.set('preset', effectivePreset);
      form.set('id', id.current); form.set('revision', String(item?.revision || 1));
      if (withDate) form.set('date', JSON.stringify(date));
      const result = await saveItem(form); if (result.error) throw new Error(result.error);
      dirty.current=false; router.push('/items/' + result.id + (result.uncovered ? '?saved=uncovered' : '')); router.refresh();
    } catch(e) { setError(e instanceof Error ? e.message : 'Unable to save. Please retry.'); } finally { setBusy(false); }
  }
  return <><Link className="back-link" href={(demo ? '/demo' : '') + '/items'}>← Reminders</Link><div className="page-heading"><div><div className="detail-type"><ReminderIcon template={template} preset={effectivePreset}/><span className="eyebrow">ONE LESS THING TO REMEMBER</span></div><h1>{item ? 'Edit ' : 'Add '}{choice.label}</h1><p>{choice.description}</p></div></div><form onSubmit={submit} onChange={() => { dirty.current=true; }} className="form-stack narrow-form"><fieldset disabled={busy}><section className="panel form-section"><div className="field-grid">{template === 'other' && <label className="full">Reminder type<select name="preset" value={effectivePreset || ''} onChange={e => { setEffectivePreset(e.target.value || undefined); const nextPreset = getReminderPreset(template, e.target.value); if (nextPreset && !item) setDate(d => ({ ...d, label: nextPreset.dateLabel })); }}><option value="">Custom reminder</option>{reminderCategories.filter(group => group.choices.some(c => c.preset)).map(group => <optgroup key={group.key} label={group.label}>{group.choices.filter(c => c.preset).map(c => <option key={c.preset} value={c.preset}>{c.label}</option>)}</optgroup>)}</select></label>}<label className="full">A helpful name<input name="label" required maxLength={160} defaultValue={item?.product_name || (selectedPreset || identity ? choice.example : '')} placeholder={choice.example} /></label><label className="full">Notes (optional)<textarea name="notes" rows={3} maxLength={5000} defaultValue={item?.notes || ''} placeholder={identity ? 'No identity numbers or sensitive details, please.' : 'Anything useful to remember'} /></label></div></section>
    {item?.state !== 'saved' && <section className="panel form-section">{optional && <label className="checkbox-row"><input type="checkbox" checked={withDate} onChange={e => setWithDate(e.target.checked)} /><span><strong>Add an important date</strong><p>You can add dates later, too.</p></span></label>}{selectedPreset?.identity && <p className="hint">Keep only a name and your chosen date. Do not add identity numbers or scans.</p>}{suggestedDate && withDate && <p className="alert info">We prefilled {suggestedDate}, the start of your calculated renewal window. Review it against your LTO record and choose a working day before saving. Email alerts are optional; enable them below.</p>}{withDate && <DateFields preset={effectivePreset} template={template} value={date} onChange={setDate} />}</section>}
    {item?.state === 'saved' && <p className="hint">Change dates, repeat frequency and alerts from each date’s Edit date & schedule button on the reminder page.</p>}
    {templates[template].files && <p className="hint">Save first, then attach receipts or vehicle documents privately.</p>}
    {error && <p className="alert error" role="alert">{error}</p>}{preview && <p className="alert success" role="status">Your sample is ready. This preview does not store changes. <Link href={'/login?next=' + encodeURIComponent(addIntent(template, focus, undefined, effectivePreset, suggestedDate))}>Sign in to keep your own →</Link></p>}
    {item?.state === 'draft' && <button type="button" className="text-button spaced" onClick={async () => { if(!confirm('Discard this unfinished reminder?'))return;setBusy(true);try{const result=await deleteItem(item.id);if(result.error)throw new Error(result.error);dirty.current=false;router.push('/items');router.refresh();}catch(e){setError(e instanceof Error?e.message:'Unable to discard.');}finally{setBusy(false);} }}>Discard unfinished reminder</button>}
    <div className="form-actions"><Link className="button secondary" href={(demo ? '/demo' : '') + '/items'}>Cancel</Link><button className="button primary">{busy ? 'Saving…' : demo ? 'Try saving reminder' : 'Save reminder'}</button></div></fieldset></form></>;
}
