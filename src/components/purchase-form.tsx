'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, FileText, Lightbulb, Trash2, UploadCloud } from 'lucide-react';
import { addMonths, categories, FILE_TYPES, MAX_FILE_BYTES, todayIn, type Document, type PurchaseWithDetails } from '@/lib/domain';
import { createDraft, savePurchase, deletePurchase } from '@/features/purchases/actions';
import { prepareUpload, removeDocument } from '@/features/documents/actions';
type Upload = { id: string; name: string; kind: Document['kind']; progress: number; phase: 'uploading' | 'processing' | 'ready' | 'error'; error?: string; file?: File; document?: Document };

export function uploadBytes(path: string, token: string, file: File, progress: (n: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/upload/sign/upload-staging/' + path);
    url.searchParams.set('token', token);
    xhr.open('PUT', url); xhr.timeout = 120000;
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('apikey', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    xhr.upload.onprogress = e => { if (e.lengthComputable) progress(Math.round(e.loaded / e.total * 100)); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload interrupted. Retry to check or resume.'));
    xhr.onerror = () => reject(new Error('Connection lost. Please retry.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out. Please retry.'));
    const body = new FormData(); body.append('cacheControl', '0'); body.append('', file);
    xhr.send(body);
  });
}
export function PurchaseForm({ purchase, demo = false, warrantyFocus = false, initialCategory }: { purchase?: PurchaseWithDetails; demo?: boolean; warrantyFocus?: boolean; initialCategory?: string }) {
  const router = useRouter();
  const base = demo ? '/demo' : '';
  const idRef = useRef(purchase?.id || '');
  const draft = useRef<Promise<string> | null>(null);
  const dirty = useRef(false);
  const [error, setError] = useState('');
  const [savedPreview, setSavedPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alerts, setAlerts] = useState(purchase?.warranty?.reminders_enabled ?? true);
  const [hasWarranty, setHasWarranty] = useState(Boolean(purchase?.warranty) || warrantyFocus);
  const [starts, setStarts] = useState(purchase?.warranty?.starts_on || purchase?.purchased_on || todayIn());
  const [expires, setExpires] = useState(purchase?.warranty?.expires_on || '');
  const [uploads, setUploads] = useState<Upload[]>((purchase?.documents || []).map(d => ({ id: d.id, name: d.original_name, kind: d.kind, progress: 100, phase: d.state === 'ready' ? 'ready' : 'error', error: d.state === 'ready' ? undefined : 'An unfinished upload. Retry processing or remove it.', document: d })));
  const busy = saving || uploads.some(u => ['uploading', 'processing'].includes(u.phase));
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current) e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  async function ensureDraft() {
    if (purchase || demo) return idRef.current || (idRef.current = crypto.randomUUID());
    if (!draft.current) {
      idRef.current ||= crypto.randomUUID();
      draft.current = createDraft(idRef.current).then(result => {
        if (result.error) { draft.current = null; throw new Error(result.error); }
        return idRef.current;
      });
    }
    return draft.current;
  }
  const update = (id: string, patch: Partial<Upload>) => setUploads(current => current.map(u => u.id === id ? { ...u, ...patch } : u));
  async function processUpload(item: Upload) {
    update(item.id, { phase: 'uploading', error: undefined, progress: 0 });
    try {
      const purchaseId = await ensureDraft();
      const prepared = await prepareUpload(item.id, purchaseId, item.kind, item.name);
      if (prepared.error || !prepared.document) throw new Error(prepared.error || 'Unable to prepare file.');
      if (prepared.document.state === 'ready') { update(item.id, { phase: 'ready', document: prepared.document, file: undefined }); return; }
      let transferError: unknown;
      if (item.file && prepared.token) {
        try { await uploadBytes(prepared.document.staging_key, prepared.token, item.file, n => update(item.id, { progress: n })); }
        catch (e) { transferError = e; }
      }
      update(item.id, { phase: 'processing', progress: 100 });
      // Also check finalization after a lost upload response; storage writes are immutable.
      const response = await fetch('/api/documents/' + item.id + '/finalize', { method: 'POST' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || (transferError instanceof Error ? transferError.message : 'Unable to process file.'));
      update(item.id, { phase: 'ready', document: body.document, file: undefined });
    } catch (e) { update(item.id, { phase: 'error', error: e instanceof Error ? e.message : 'Unable to upload. Please retry.' }); }
  }
  async function addFiles(files: FileList | File[], kind: 'receipt' | 'warranty') {
    if (demo) { setError('File uploads are available after sign-in. You can try the rest of this sample form.'); return; }
    const selected = Array.from(files);
    if (selected.length + uploads.length > 6) { setError('You can attach up to 6 files per purchase.'); return; }
    if (selected.some(f => !FILE_TYPES.includes(f.type) || f.size > MAX_FILE_BYTES || !f.size)) { setError('Choose JPG, PNG, WebP or PDF files, up to 10 MB each.'); return; }
    dirty.current = true; setError('');
    const items: Upload[] = selected.map(file => ({ id: crypto.randomUUID(), name: file.name, kind, file, phase: 'uploading', progress: 0 }));
    setUploads(current => [...current, ...items]);
    for (const item of items) await processUpload(item);
  }
  async function remove(item: Upload) {
    if (!window.confirm('Remove ' + item.name + '?')) return;
    try {
      const result = await removeDocument(item.id);
      // If a reservation never succeeded there is no server file to remove.
      if (result.error && result.error !== 'That reminder is no longer available.') { setError(result.error); return; }
      setUploads(current => current.filter(u => u.id !== item.id));
    } catch { setError('Unable to remove this file. Please retry.'); }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    if (uploads.some(u => ['uploading','processing'].includes(u.phase))) { setError('Please wait for the upload to finish.'); return; }
    if(uploads.some(u=>u.phase==='error')) { setError('Remove unfinished attachments below, then save your reminder without them. Your entered details are kept.'); return; }
    if (demo) { setSavedPreview(true); dirty.current = false; return; }
    const data = new FormData(e.currentTarget);
    setSaving(true);
    try {
      data.set('id', await ensureDraft()); data.set('revision', String(purchase?.revision || 1));
      const result = await savePurchase(data);
      if (result.error) throw new Error(result.error);
      const saved = purchase?.state === 'saved' ? 'updated' : 'created';
      dirty.current = false; router.push('/items/' + result.id + '?saved=' + saved); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Please retry.'); }
    finally { setSaving(false); }
  }
  async function discardDraft() {
    if (!purchase || !confirm('Discard this unfinished purchase and its uploaded files?')) return;
    setSaving(true);
    try {
      const result = await deletePurchase(purchase.id);
      if (result.error) throw new Error(result.error);
      dirty.current = false; router.push('/purchases'); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to discard. Please retry.'); }
    finally { setSaving(false); }
  }
  function uploadSection(kind: 'receipt' | 'warranty') {
    return <div>
      <label className="upload-dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy) void addFiles(e.dataTransfer.files, kind); }}>
        <UploadCloud size={28} /><strong>Drop your {kind} here, or browse files</strong><small>JPG, PNG, WebP or PDF · Up to 10 MB each</small>
        <input type="file" accept={FILE_TYPES.join(',')} multiple disabled={busy} onChange={e => { if (e.target.files) void addFiles(e.target.files, kind); e.target.value = ''; }} className="visually-hidden" />
      </label>
      <label className="text-button camera-button"><Camera size={15} /> Take a photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} className="visually-hidden" onChange={e => { if (e.target.files) void addFiles(e.target.files, kind); e.target.value = ''; }} /></label>
      <div className="file-list">{uploads.filter(u => u.kind === kind).map(item => <div className="file-row" key={item.id}>
        <FileText size={20} /><div><strong>{item.name}</strong><small role="status">{item.phase === 'ready' ? 'Saved privately' : item.phase === 'processing' ? 'Checking and optimizing…' : item.phase === 'error' ? item.error : 'Uploading · ' + item.progress + '%'}</small>{item.phase === 'uploading' && <progress value={item.progress} max={100} aria-label={'Uploading ' + item.name} />}</div>
        {item.phase === 'error' && <button type="button" className="text-button" disabled={busy} onClick={() => void processUpload(item)}>Retry</button>}
        {['ready', 'error'].includes(item.phase) && <button className="icon-button" type="button" aria-label={'Remove ' + item.name} disabled={busy} onClick={() => void remove(item)}><Trash2 size={16} /></button>}
      </div>)}</div>
    </div>;
  }
  return <>
    <Link className="back-link" href={base + '/purchases'}><ArrowLeft size={14} /> Receipt Reminders</Link>
    <div className="page-heading"><div><div className="eyebrow">A LITTLE ORGANIZATION. A LOT OF PEACE OF MIND.</div><h1>{purchase?.state === 'saved' ? 'Edit reminder' : 'Add a receipt reminder'}</h1><p>Save the details now. Find them when you need them.</p></div></div>
    <form onSubmit={submit} onChange={() => { dirty.current = true; }} className="form-layout">
      <div className="form-stack">
        <section className="panel form-section"><h2>The essentials</h2><p>A name is all you need to get started.</p>
          <div className="field-grid">
            <label className="full">Product name<input name="product_name" required maxLength={160} defaultValue={purchase?.product_name || ''} placeholder="e.g. Sony WH-1000XM5 headphones" /></label>
            <label>Purchase date<input name="purchased_on" type="date" defaultValue={purchase?.purchased_on || ''} /></label>
            <label>Store or merchant<input name="merchant" maxLength={160} defaultValue={purchase?.merchant || ''} placeholder="e.g. SM Appliance Center" /></label>
            <label>Price (₱)<input name="price" inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?" defaultValue={purchase?.price_minor != null ? (purchase.price_minor / 100).toFixed(2) : ''} placeholder="0.00" /></label>
            <label>Category<select name="category" defaultValue={purchase?.category || initialCategory || ''}><option value="">Choose a category</option>{categories.map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}</select></label>
            <label className="full">Notes <textarea name="notes" rows={3} maxLength={5000} defaultValue={purchase?.notes || ''} placeholder="Anything you’d like to remember…" /></label>
          </div>
        </section>
        <section className="panel form-section"><h2>Receipt</h2><p>No more faded paper or lost screenshots.</p>{uploadSection('receipt')}</section>
        <section className="panel form-section">
          <label className="checkbox-row"><input name="has_warranty" type="checkbox" checked={hasWarranty} onChange={e => setHasWarranty(e.target.checked)} /><span><strong>This purchase has a warranty</strong><p>Keep your coverage dates and documents together.</p></span></label>
          {hasWarranty && <div className="warranty-fields"><div className="field-grid">
            <label>Warranty starts<input name="starts_on" type="date" value={starts} onChange={e => setStarts(e.target.value)} /></label>
            <label>Expiration date<input name="expires_on" type="date" required min={starts || undefined} value={expires} onChange={e => setExpires(e.target.value)} /></label>
            <div className="full"><span className="hint">Quick duration, from the start date</span><div className="presets">{[3, 6, 12, 24].map(m => <button type="button" key={m} disabled={!starts} onClick={() => setExpires(addMonths(starts, m))}>{m} months</button>)}</div></div>
            <label className="full">Serial number<input name="serial_number" maxLength={160} defaultValue={purchase?.warranty?.serial_number || ''} /></label>
            <label className="full">Warranty notes<textarea name="warranty_notes" maxLength={5000} rows={2} defaultValue={purchase?.warranty?.notes || ''} placeholder="Coverage, service center, or claim details" /></label>
          </div>
          <label className="checkbox-row"><input type="checkbox" name="reminders_enabled" checked={alerts} onChange={e => setAlerts(e.target.checked)} /><span><strong>Remind me before it expires</strong><p>Alerts at 30, 7 and 1 day before expiration, around 9 AM in your timezone. Your first 3 alert slots are free. Saving still works when slots are full.</p></span></label>
          {uploadSection('warranty')}</div>}
        </section>
        {error && <div className="alert error" role="alert">{error}</div>}
        {savedPreview && <div className="alert success" role="status">Your sample form is ready. Sign in to save your own purchases; this preview does not store changes. <Link href="/login">Get started →</Link></div>}
        {purchase?.state === 'draft' && <button type="button" className="text-button" disabled={busy} onClick={() => void discardDraft()}>Discard this unfinished purchase</button>}
        <div className="form-actions"><span>Only you can access your files.</span><div><Link className="button secondary" href={base + '/purchases'} onClick={e => { if (dirty.current && !confirm('Leave this form? Unsaved details will be lost.')) e.preventDefault(); }}>Cancel</Link><button disabled={busy} className="button primary">{saving ? 'Saving…' : demo ? 'Try saving purchase' : 'Save reminder'}</button></div></div>
      </div>
      <aside className="form-help"><Lightbulb size={25} /><h3>A small habit, a calmer home.</h3><p>Add a receipt when you buy something. The next time you need it, it’ll be right here.</p><ul><li>Photos are optimized for storage.</li><li>Up to 6 files per purchase.</li><li>You can add more details later.</li><li>Uploads for unfinished purchases are kept for 24 hours.</li></ul></aside>
    </form>
  </>;
}
