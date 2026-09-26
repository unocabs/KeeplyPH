'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Bell, Download, FileText, Pencil, Trash2 } from 'lucide-react';
import { CategoryIcon, StatusBadge } from './purchase-ui';
import { deletePurchase } from '@/features/purchases/actions';
import { formatDate, formatMoney, remainingLabel, type PurchaseWithDetails } from '@/lib/domain';
export function PurchaseDetail({ purchase: p, today, demo = false }: { purchase: PurchaseWithDetails; today: string; demo?: boolean }) {
  const router = useRouter(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const base = demo ? '/demo' : '';
  async function remove() {
    if (demo) { setError('Sample reminders cannot be deleted. Sign in to manage your own.'); return; }
    if (!confirm('Permanently delete this reminder, its warranty, and all attached files?')) return;
    setBusy(true);
    try { const result = await deletePurchase(p.id); if (result.error) setError(result.error); else { router.push('/purchases'); router.refresh(); } }
    catch { setError('Unable to delete. Please retry.'); } finally { setBusy(false); }
  }
  return <>
    <Link href={base + '/purchases'} className="back-link"><ArrowLeft size={14} /> Receipt Reminders</Link>
    <div className="page-heading"><div className="details-summary"><CategoryIcon category={p.category} large /><div><h1>{p.product_name || 'Unfinished reminder'}</h1><p>{p.merchant || 'A little piece of your everyday.'}</p></div></div><Link className="button secondary" aria-label="Edit reminder" href={base + '/purchases/' + p.id + '/edit'}><Pencil size={15} /> Edit reminder</Link></div>
    <div className="detail-grid">
      <section className="panel"><h2>Purchase details</h2><dl className="detail-fields"><div><dt>Purchased on</dt><dd>{formatDate(p.purchased_on)}</dd></div><div><dt>Price</dt><dd>{formatMoney(p.price_minor)}</dd></div><div><dt>Store or merchant</dt><dd>{p.merchant || 'Not added'}</dd></div><div><dt>Category</dt><dd className="capitalize">{p.category || 'Not added'}</dd></div>{p.notes && <div className="full"><dt>Notes</dt><dd className="notes-text">{p.notes}</dd></div>}</dl></section>
      <section className="panel warranty-summary"><div className="section-heading"><h2>Warranty</h2><StatusBadge purchase={p} today={today} /></div>
        {p.warranty ? <><p className="expiry-big">{formatDate(p.warranty.expires_on)}</p><p className="remaining">{remainingLabel(p.warranty.expires_on, today)}</p><dl className="detail-fields"><div><dt>Starts on</dt><dd>{formatDate(p.warranty.starts_on)}</dd></div><div><dt>Serial number</dt><dd>{p.warranty.serial_number || 'Not added'}</dd></div>{p.warranty.notes && <div className="full"><dt>Coverage notes</dt><dd className="notes-text">{p.warranty.notes}</dd></div>}</dl><div className="reminder-status"><Bell size={15} />{p.warranty.reminders_enabled ? 'Date alerts selected · check alert coverage and email preferences' : p.warranty.reminder_disabled_reason === 'plan_limit' ? 'Date alerts paused' : 'Email alerts are off'}</div></> : <p className="section-description">No warranty added. You can add coverage details any time.</p>}
      </section>
    </div>
    <section className="panel detail-documents"><h2>Your documents</h2><p className="section-description">Private files, together in one place. Download links expire after 60 seconds.</p><div className="file-list">
      {p.documents.filter(d => d.state === 'ready').map(d => <a className="file-row" href={'/api/documents/' + d.id + '/download'} key={d.id}><FileText size={21} /><div><strong>{d.original_name}</strong><small>{d.kind} · {Math.ceil((d.size_bytes || 0) / 1024)} KB</small></div><Download size={17} /></a>)}
      {!p.documents.some(d => d.state === 'ready') && <p className="hint">{demo ? 'This sample has no actual receipt files.' : 'No files yet. Edit this reminder to add a receipt or warranty.'}</p>}
    </div></section>
    <details className="danger-zone"><summary>Remove this reminder</summary><p>This permanently removes the reminder, warranty, and attached documents.</p><button className="button danger" disabled={busy} onClick={() => void remove()}><Trash2 size={15} />{busy ? 'Deleting…' : 'Delete reminder'}</button></details>
    {error && <p className="alert error" role="alert">{error}</p>}
  </>;
}
