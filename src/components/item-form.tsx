'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { templates, type TemplateKey } from '@/features/templates';
import { dateSchema } from '@/features/items/validation';
import { createItemDraft, saveItem, deleteItem } from '@/features/items/actions';
import type { ItemWithDetails } from '@/features/items/domain';
import { DateFields, initialDate } from './date-fields';
export function ItemForm({ template, item, focus, demo = false }: { template: TemplateKey; item?: ItemWithDetails; focus?: string; demo?: boolean }) {
  const router = useRouter(), id = useRef(item?.id || '');
  const [date, setDate] = useState(initialDate(template, focus));
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
      form.set('id', id.current); form.set('revision', String(item?.revision || 1));
      if (withDate) form.set('date', JSON.stringify(date));
      const result = await saveItem(form); if (result.error) throw new Error(result.error);
      dirty.current=false; router.push('/items/' + result.id + (result.uncovered ? '?saved=uncovered' : '')); router.refresh();
    } catch(e) { setError(e instanceof Error ? e.message : 'Unable to save. Please retry.'); } finally { setBusy(false); }
  }
  return <><Link className="back-link" href={(demo ? '/demo' : '') + '/items'}>← My items</Link><div className="page-heading"><div><div className="eyebrow">ONE LESS THING TO REMEMBER</div><h1>{item ? 'Edit ' : 'Add '}{templates[template].label}</h1><p>{templates[template].description}</p></div></div><form onSubmit={submit} onChange={() => { dirty.current=true; }} className="form-stack narrow-form"><fieldset disabled={busy}><section className="panel form-section"><div className="field-grid"><label className="full">A helpful name<input name="label" required maxLength={160} defaultValue={item?.product_name || (['licence','passport'].includes(template) ? templates[template].example : '')} placeholder={templates[template].example} /></label><label className="full">Notes (optional)<textarea name="notes" rows={3} maxLength={5000} defaultValue={item?.notes || ''} placeholder={['licence','passport'].includes(template) ? 'No identity numbers or sensitive details, please.' : 'Anything useful to remember'} /></label></div></section>
    {item?.state !== 'saved' && <section className="panel form-section">{optional && <label className="checkbox-row"><input type="checkbox" checked={withDate} onChange={e => setWithDate(e.target.checked)} /><span><strong>Add an important date</strong><p>You can add dates later, too.</p></span></label>}{withDate && <DateFields template={template} value={date} onChange={setDate} />}</section>}
    {item?.state === 'saved' && <p className="hint">Edit individual dates and reminders on the item’s detail page.</p>}
    {templates[template].files && <p className="hint">Save first, then attach receipts or vehicle documents privately.</p>}
    {error && <p className="alert error" role="alert">{error}</p>}{preview && <p className="alert success" role="status">Your sample is ready. This preview does not store changes. <Link href={'/login?next=' + encodeURIComponent('/add/' + template)}>Sign in to keep your own →</Link></p>}
    {item?.state === 'draft' && <button type="button" className="text-button spaced" onClick={async () => { if(!confirm('Discard this unfinished item?'))return;setBusy(true);try{const result=await deleteItem(item.id);if(result.error)throw new Error(result.error);dirty.current=false;router.push('/items');router.refresh();}catch(e){setError(e instanceof Error?e.message:'Unable to discard.');}finally{setBusy(false);} }}>Discard unfinished item</button>}
    <div className="form-actions"><Link className="button secondary" href={(demo ? '/demo' : '') + '/items'}>Cancel</Link><button className="button primary">{busy ? 'Saving…' : demo ? 'Try saving item' : 'Save item'}</button></div></fieldset></form></>;
}
