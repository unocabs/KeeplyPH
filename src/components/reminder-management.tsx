'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changeCoverage, coverageChoices } from '@/features/reminders/actions';
import type { ItemWithDetails } from '@/features/items/domain';
export function CoverageControl({ item, demo=false }: { item: ItemWithDetails; demo?: boolean }) {
  const router=useRouter(), [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[choices,setChoices]=useState<{id:string;name:string;revision:number}[]>([]),[selected,setSelected]=useState('');
  const covered=item.coverage==='covered', requested=covered||item.coverage==='paused_capacity';
  async function change(enabled:boolean,replace=false) {
    if(demo){setMessage('Sign in to choose coverage for your own items.');return;}
    setBusy(true);setMessage('');
    try { const result=await changeCoverage(item.id,item.revision,enabled,replace?choices.find(c=>c.id===selected):undefined);setMessage(result.error||result.success||'');if(!result.error){setChoices([]);router.refresh();} }
    catch {setMessage('Unable to update coverage. Please retry.');} finally {setBusy(false);}
  }
  async function choose(){if(demo){setMessage('Sign in to manage your reminders.');return;}setBusy(true);try{setChoices(await coverageChoices());}catch{setMessage('Unable to load selections.');}finally{setBusy(false);}}
  return <section className="panel space-bottom"><div className="section-heading"><h2>{covered?'Reminders included':item.coverage==='paused_capacity'?'Reminders paused — no available slot':'Reminder not active'}</h2><Link href={(demo?'/demo':'')+'/settings/billing'}>Add 5 reminder slots →</Link></div><p className="section-description">{covered?'All enabled dates on this item share one slot. Account preferences also control email delivery.':'This item is safely kept. Choose an available reminder slot, or move coverage from another item.'}</p>{covered&&!item.dates.some(d=>d.occurrences.some(o=>o.status==='open'&&o.due_on>=new Date().toISOString().slice(0,10)))&&<p className="hint">No upcoming reminders. You can free this slot whenever you like.</p>}
    {!item.archived_at&&<div className="form-actions">{requested&&<button className="button secondary" disabled={busy} onClick={()=>void change(false)}>Turn coverage off</button>}{!covered&&<><button className="button secondary" disabled={busy||!item.dates.some(d=>d.reminders_enabled)} onClick={()=>void change(true)}>Enable coverage</button><button className="text-button" disabled={busy||!item.dates.some(d=>d.reminders_enabled)} onClick={()=>void choose()}>Move a slot here</button></>}</div>}
    {choices.length>0&&<div className="spaced"><label>Replace coverage on<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose an item</option>{choices.filter(c=>c.id!==item.id).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button className="button secondary spaced" disabled={busy||!selected} onClick={()=>void change(true,true)}>Move this reminder slot</button></div>}
    {!item.dates.some(d=>d.reminders_enabled)&&<p className="hint">Enable a date’s email preference first, then select coverage.</p>}{message&&<p className="alert info spaced" role="status">{message}</p>}
  </section>;
}
