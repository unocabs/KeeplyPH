'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FILE_TYPES, MAX_FILE_BYTES, type Document } from '@/lib/domain';
import { prepareUpload, removeDocument } from '@/features/documents/actions';
import { uploadBytes } from './purchase-form';
export function ItemDocuments({ id, documents, kind = 'vehicle', demo = false }: { id: string; documents: Document[]; kind?: Document['kind']; demo?: boolean }) {
  const router = useRouter();
  const [pending,setPending] = useState<{ id: string; file: File } | null>(null);
  const [busy,setBusy] = useState(false), [status,setStatus] = useState(''), [error,setError] = useState('');
  async function upload(file?: File) {
    if (demo) { setStatus('Sign in to attach your own files. Sample uploads are not stored.'); return; }
    if (file) { if (!FILE_TYPES.includes(file.type) || !file.size || file.size > MAX_FILE_BYTES) { setError('Choose a JPG, PNG, WebP or PDF up to 10 MB.'); return; }  }
    const task = file ? { id: crypto.randomUUID(), file } : pending; if (!task) return; setPending(task);
    setBusy(true); setError('');
    try {
      setStatus('Preparing upload…');
      const result = await prepareUpload(task.id,id,kind,task.file.name);
      if (result.error || !result.document) throw new Error(result.error || 'Unable to prepare file.');
      if (result.document.state !== 'ready') {
        if (result.token) { try { await uploadBytes(result.document.staging_key,result.token,task.file,n => setStatus('Uploading · ' + n + '%')); } catch { /* Check immutable storage after a lost response. */ } }
        setStatus('Checking and optimizing…');
        const res = await fetch('/api/documents/' + task.id + '/finalize',{ method:'POST' });
        if (!res.ok) throw new Error('Unable to finish. Retry this upload or remove it.');
      }
      setPending(null); setStatus('Saved privately.'); router.refresh();
    } catch(e) { setError(e instanceof Error ? e.message : 'Unable to upload.'); } finally { setBusy(false); }
  }
  async function remove(docId: string) {
    if (!confirm('Remove this file?')) return;
    setBusy(true); try { const result = await removeDocument(docId); if(result.error && result.error !== 'That item is no longer available.') throw new Error(result.error); if(pending?.id === docId) setPending(null); setError(''); router.refresh(); } catch(e) { setError(e instanceof Error ? e.message : 'Unable to remove file.'); } finally { setBusy(false); }
  }
  return <section className="panel spaced"><h2>Documents</h2><p className="section-description">Optional receipts, service records or vehicle documents. Up to 6 files, 10 MB each.</p>{documents.map(d => <div className="file-row" key={d.id}><div><strong>{d.original_name}</strong><small>{d.state === 'ready' ? 'Saved privately' : 'Unfinished upload'}</small></div>{d.state === 'ready' && !demo && <a className="text-button" href={'/api/documents/' + d.id + '/download'}>Download</a>}{!demo && <button type="button" className="text-button" disabled={busy} onClick={() => void remove(d.id)}>Remove</button>}</div>)}<label className="spaced">Attach a document<input type="file" accept={FILE_TYPES.join(',')} disabled={busy || Boolean(pending) || documents.length >= 6} onChange={e => { const file=e.target.files?.[0]; if(file) void upload(file); e.target.value=''; }} /></label><p className="hint" role="status">{status}</p>{error && <div className="alert error" role="alert">{error}{pending && <><button disabled={busy} className="text-button" onClick={() => void upload()}>Retry upload</button><button disabled={busy} className="text-button" onClick={() => void remove(pending!.id)}>Remove unfinished upload</button></>}</div>}</section>;
}
