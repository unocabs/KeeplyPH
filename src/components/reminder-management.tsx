'use client';
import Link from 'next/link';
import { Bell, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changeCoverage, coverageChoices } from '@/features/reminders/actions';
import { alertStatus, type ItemWithDetails } from '@/features/items/domain';
import type { Usage } from '@/lib/domain';

export function CoverageControl({ item, usage, demo=false }: { item: ItemWithDetails; usage: Usage; demo?: boolean }) {
  const router=useRouter(), [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[choices,setChoices]=useState<{id:string;name:string;revision:number}[]>([]),[selected,setSelected]=useState('');
  const covered=item.coverage==='covered', requested=covered||item.coverage==='paused_capacity';
  const status=alertStatus(item), hasEnabledDate=item.dates.some(d=>d.reminders_enabled);
  const label=status==='enabled'?'Reminder alert enabled':status==='paused'?'Reminder alerts paused':'Reminder alerts off';
  async function change(enabled:boolean,replace=false) {
    if(demo){setMessage('Sign in to choose coverage for your own reminders.');return;}
    setBusy(true);setMessage('');
    try { const result=await changeCoverage(item.id,item.revision,enabled,replace?choices.find(c=>c.id===selected):undefined);setMessage(result.error||result.success||'');if(!result.error){setChoices([]);router.refresh();} }
    catch {setMessage('Unable to update coverage. Please retry.');} finally {setBusy(false);}
  }
  async function choose(){if(demo){setMessage('Sign in to manage your alerts.');return;}setBusy(true);try{setChoices(await coverageChoices());}catch{setMessage('Unable to load selections.');}finally{setBusy(false);}}
  return <section className={'panel reminder-quick-card coverage-quick '+(status==='enabled'?'coverage-enabled':'')} aria-label="Reminder alert status">
    <span className="quick-action-icon"><Bell size={22} aria-hidden="true"/></span>
    <div className="quick-action-body">
      <div className="coverage-heading"><h2>{label}</h2>
        {!item.archived_at&&!covered&&<button type="button" className="quick-action-link" disabled={busy||!hasEnabledDate} onClick={()=>void change(true)}>Enable alerts</button>}
        {!item.archived_at&&covered&&item.alert_delivery_paused&&<Link className="quick-action-link" href={(demo?'/demo':'')+'/settings/alerts'}>Alert Options</Link>}
      </div>
      <div className="coverage-meta"><span className="alert-slot-count">{usage.reminders} / {usage.slot_limit ?? 3} <span>alert slots</span></span><Link className="quick-action-link" href={(demo?'/demo':'')+'/settings/billing'}>Add more alert slots <ArrowRight size={14} aria-hidden="true"/></Link></div>
      <details className="coverage-details"><summary>Manage alerts</summary>
        <p className="hint">All enabled dates on this reminder share one slot. Account preferences also control alert delivery.</p>
        {item.archived_at?<p className="hint">Restore this reminder to resume alerts.</p>:<div className="coverage-controls">
          {requested&&<button type="button" className="text-button" disabled={busy} onClick={()=>void change(false)}>Turn alert coverage off</button>}
          {!covered&&<button type="button" className="text-button" disabled={busy||!hasEnabledDate} onClick={()=>void choose()}>Move a slot here</button>}
        </div>}
        {item.coverage==='paused_capacity'&&<p className="hint">Choose an available slot, or move coverage from another reminder.</p>}
        {covered&&status==='off'&&<p className="hint">This reminder has a slot, but no open date with alerts enabled.</p>}
        {!hasEnabledDate&&<p className="hint">Enable a date’s alert preference first, then select coverage.</p>}
        {choices.length>0&&<div className="spaced"><label>Replace coverage on<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose a reminder</option>{choices.filter(c=>c.id!==item.id).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button type="button" className="button secondary spaced" disabled={busy||!selected} onClick={()=>void change(true,true)}>Move this alert slot</button></div>}
      </details>
      {message&&<p className="alert info spaced" role="status">{message}</p>}
    </div>
  </section>;
}
