'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { templates, getReminderPreset, addIntent, type TemplateKey } from '@/features/templates';
import { dateSchema } from '@/features/items/validation';
import { createItemDraft, saveItem, saveDate, deleteItem } from '@/features/items/actions';
import type { ItemWithDetails } from '@/features/items/domain';
import { ReminderIcon } from './reminder-icon';
import { DateFields, initialDate } from './date-fields';
import type { VehicleChoice } from '@/features/items/queries';
import { reminderCategories, vehicleIntentLabel } from '@/features/templates/categories';
import { safeRenewalDate } from '@/lib/lto-schedule';
import { offsetsForRecurrence } from '@/features/items/alert-schedule';
import { supportsMotorcycleBrand } from '@/features/items/motorcycle-brands';
import { supportsCarBrand } from '@/features/items/car-brands';
import { CarBrandPicker } from './car-brand-picker';
import { SubscriptionBrandPicker } from './subscription-brand-picker';
import { supportsSubscriptionBrand } from '@/features/items/subscription-brands';
import { getLender, loanPreset, type LoanPreset } from '@/features/items/lenders';
import { LenderPicker } from './lender-picker';
export function ItemForm({ template, item, focus, preset, renewalDate, demo = false, vehicles = [] }: { vehicles?: VehicleChoice[]; template: TemplateKey; item?: ItemWithDetails; focus?: string; preset?: string; renewalDate?: string; demo?: boolean }) {
  const suggestedDate = !item && template === 'car' && focus === 'registration' ? safeRenewalDate(renewalDate) : undefined;
  const [effectivePreset, setEffectivePreset] = useState(() => { const key = preset || item?.reminder_preset || undefined; return key === 'car-payment' ? 'car-loan' : key; });
  const selectedPreset = getReminderPreset(template, effectivePreset);
  const choice = selectedPreset || templates[template];
  const [name, setName] = useState(item?.product_name || (selectedPreset || ['licence', 'passport'].includes(template) ? choice.example : ''));
  const [lenderId, setLenderId] = useState(item?.lender_id || '');
  const [lenderName, setLenderName] = useState(item?.lender_name || '');
  const [subscriptionBrand, setSubscriptionBrand] = useState(item?.subscription_brand || '');
  const [brand, setBrand] = useState(item?.car_brand || '');
  const [motorcycleBrand, setMotorcycleBrand] = useState(item?.motorcycle_brand || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const identity = ['licence', 'passport'].includes(template) || selectedPreset?.identity;
  const router = useRouter(), id = useRef(item?.id || '');
  const [date, setDate] = useState(() => ({ ...initialDate(template, focus, effectivePreset), ...(suggestedDate ? { due_on: suggestedDate } : {}) }));
  const [existingVehicle, setExistingVehicle] = useState('');
  const selectedVehicle = vehicles.find(vehicle => vehicle.id === existingVehicle);
  const lenderEnabled = Boolean(loanPreset(template, effectivePreset));
  const subscriptionEnabled = supportsSubscriptionBrand(template, effectivePreset);
  const brandEnabled = supportsCarBrand(template, effectivePreset);
  const motorcycleBrandEnabled = supportsMotorcycleBrand(template, effectivePreset);
  const dateId = useRef('');
  const scheduleCustomized = useRef(false);
  const optional = ['car','motorcycle'].includes(template);
  const [withDate, setWithDate] = useState(item?.state !== 'saved');
  const dirty = useRef(false);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if(dirty.current)event.preventDefault(); }; window.addEventListener('beforeunload',warn); return () => window.removeEventListener('beforeunload',warn); }, []);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [preview, setPreview] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); if(withDate){ const parsed=dateSchema.safeParse(date);if(!parsed.success){setError(parsed.error.issues[0].message);return;} } if (demo) { setPreview(true); dirty.current=false; return; }
    const form = new FormData(e.currentTarget); setBusy(true);
    try {
      if (existingVehicle) {
        dateId.current ||= crypto.randomUUID();
        const result = await saveDate(dateId.current, existingVehicle, 0, date);
        if (result.error) throw new Error(result.error);
        dirty.current = false;
        router.push('/items/' + existingVehicle + '?saved=updated&savedDate=' + result.id + '#date-' + result.id);
        router.refresh();
        return;
      }
      id.current ||= crypto.randomUUID();
      if (!item) { const draft = await createItemDraft(id.current, template); if (draft.error) throw new Error(draft.error); }
      form.set('preset', effectivePreset || '');
      if (lenderEnabled) { form.set('lender_id', lenderId); form.set('lender_name', lenderId === 'other' ? lenderName.trim() : ''); }
      if (subscriptionEnabled) form.set('subscription_brand', subscriptionBrand);
      form.set('car_brand', brandEnabled ? brand : '');
      if (motorcycleBrandEnabled) form.set('motorcycle_brand', motorcycleBrand);
      form.set('id', id.current); form.set('revision', String(item?.revision || 1));
      if (withDate) form.set('date', JSON.stringify(date));
      const result = await saveItem(form); if (result.error) throw new Error(result.error);
      const saved = item?.state === 'saved' ? 'updated' : 'created';
      dirty.current=false; router.push('/items/' + result.id + '?saved=' + saved); router.refresh();
    } catch(e) { setError(e instanceof Error ? e.message : 'Unable to save. Please retry.'); } finally { setBusy(false); }
  }
  return <><Link className="back-link" href={(demo ? '/demo' : '') + '/items'}>← Reminders</Link><div className="page-heading"><div><div className="detail-type"><ReminderIcon template={template} preset={effectivePreset} lenderId={lenderEnabled ? lenderId : null} subscriptionBrand={subscriptionEnabled ? subscriptionBrand : null} brand={existingVehicle ? selectedVehicle?.car_brand : brandEnabled ? brand : null} motorcycleBrand={existingVehicle ? selectedVehicle?.motorcycle_brand : motorcycleBrandEnabled ? motorcycleBrand : null}/><span className="eyebrow">ONE LESS THING TO REMEMBER</span></div><h1>{item ? 'Edit ' : 'Add '}{item || !optional ? choice.label : vehicleIntentLabel(template, focus)}</h1><p>{choice.description}</p></div></div><form onSubmit={submit} onChange={() => { dirty.current=true; }} className="form-stack narrow-form"><fieldset disabled={busy}>{!item && optional && vehicles.length > 0 && <section className="panel form-section"><label>Which {templates[template].label.toLowerCase()} is this for?<select value={existingVehicle} onChange={e => { setExistingVehicle(e.target.value); dateId.current = ''; if (e.target.value) setWithDate(true); }}><option value="">Add a new {templates[template].label.toLowerCase()}</option>{vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.product_name || 'Unnamed vehicle'}</option>)}</select></label>{existingVehicle && <p className="hint spaced">This date will be added to your existing vehicle, with its own schedule and history. <Link className="text-button" href={(demo ? '/demo' : '') + '/items/' + existingVehicle}>View its existing dates →</Link></p>}</section>}{!existingVehicle && <section className="panel form-section"><div className="field-grid">{template === 'other' && <label className="full">Reminder type<select name="preset" value={effectivePreset || ''} onChange={e => { const nextPreset = e.target.value || undefined; if (nextPreset !== effectivePreset) { setSubscriptionBrand(''); if ((lenderId !== 'other' && !getLender(template, nextPreset, lenderId)) || !loanPreset(template, nextPreset)) { setLenderId(''); setLenderName(''); } } setEffectivePreset(nextPreset); if (!item) setDate(d => { const defaults = initialDate(template, focus, nextPreset); return { ...d, label: defaults.label, ...(!scheduleCustomized.current ? { recurrence_months: defaults.recurrence_months, recurrence_anchor: null, recurrence_ends_on: null, offsets: defaults.recurrence_months ? offsetsForRecurrence(d.offsets) : d.offsets } : {}) }; }); }}><option value="">Custom reminder</option>{reminderCategories.filter(group => group.choices.some(c => c.preset)).map(group => <optgroup key={group.key} label={group.label}>{group.choices.filter(c => c.preset).map(c => <option key={c.preset} value={c.preset}>{c.label}</option>)}</optgroup>)}</select></label>}{lenderEnabled && <LenderPicker preset={loanPreset(template, effectivePreset) as LoanPreset} value={lenderId} onChange={value => { setLenderId(value); if (value !== 'other') setLenderName(''); dirty.current = true; }} />}{lenderEnabled && lenderId === 'other' && <label className="full">Lender name <span className="hint">(optional)</span><input name="lender_name" maxLength={160} value={lenderName} onChange={event => setLenderName(event.target.value)} placeholder="Name on your loan agreement" /></label>}{(brandEnabled || motorcycleBrandEnabled) && <CarBrandPicker kind={motorcycleBrandEnabled ? 'motorcycle' : 'car'} value={motorcycleBrandEnabled ? motorcycleBrand : brand} onChange={value => { if (motorcycleBrandEnabled) setMotorcycleBrand(value); else setBrand(value); dirty.current = true; }} />}{subscriptionEnabled && <SubscriptionBrandPicker preset={effectivePreset as 'streaming' | 'gym'} value={subscriptionBrand} onChange={value => { setSubscriptionBrand(value); dirty.current = true; }} />}<label className="full">A helpful name<input name="label" required maxLength={160} value={name} onChange={e => setName(e.target.value)} placeholder={choice.example} /></label><label className="full">Notes (optional)<textarea name="notes" rows={3} maxLength={5000} value={notes} onChange={e => setNotes(e.target.value)} placeholder={identity ? 'No identity numbers or sensitive details, please.' : 'Anything useful to remember'} /></label></div></section>}
    {item?.state !== 'saved' && <section className="panel form-section">{optional && !existingVehicle && !focus && <label className="checkbox-row"><input type="checkbox" checked={withDate} onChange={e => setWithDate(e.target.checked)} /><span><strong>Add an important date</strong><p>You can add dates later, too.</p></span></label>}{selectedPreset?.identity && <p className="hint">Keep only a name and your chosen date. Do not add identity numbers or scans.</p>}{suggestedDate && withDate && <p className="alert info">We prefilled {suggestedDate}, the start of your calculated renewal window. Review it against your LTO record and choose a working day before saving. Alerts are optional; enable them below.</p>}{withDate && <DateFields preset={effectivePreset} template={template} value={date} onChange={next => { if (next.recurrence_months !== date.recurrence_months || next.recurrence_ends_on !== date.recurrence_ends_on) scheduleCustomized.current = true; setDate(next); }} />}</section>}
    {item?.state === 'saved' && <p className="hint">Change recurring payments, dates and alerts from each date’s Edit date & schedule button on the reminder page.</p>}
    {!existingVehicle && templates[template].files && <p className="hint">Save first, then attach receipts or vehicle documents privately.</p>}
    {error && <p className="alert error" role="alert">{error}</p>}{preview && <p className="alert success" role="status">Your sample is ready. This preview does not store changes. <Link href={'/login?next=' + encodeURIComponent(addIntent(template, focus, undefined, effectivePreset, suggestedDate))}>Sign in to keep your own →</Link></p>}
    {item?.state === 'draft' && <button type="button" className="text-button spaced" onClick={async () => { if(!confirm('Discard this unfinished reminder?'))return;setBusy(true);try{const result=await deleteItem(item.id);if(result.error)throw new Error(result.error);dirty.current=false;router.push('/items');router.refresh();}catch(e){setError(e instanceof Error?e.message:'Unable to discard.');}finally{setBusy(false);} }}>Discard unfinished reminder</button>}
    <div className="form-actions"><Link className="button secondary" href={(demo ? '/demo' : '') + '/items'}>Cancel</Link><button className="button primary">{busy ? 'Saving…' : demo ? 'Try saving reminder' : existingVehicle ? 'Save date to vehicle' : 'Save reminder'}</button></div></fieldset></form></>;
}
