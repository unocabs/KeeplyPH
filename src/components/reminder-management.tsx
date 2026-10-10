'use client';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changeCoverage } from '@/features/reminders/actions';
import { alertStatus, type ItemWithDetails } from '@/features/items/domain';
import type { Usage } from '@/lib/domain';
export function CoverageControl({item,demo=false}:{item:ItemWithDetails;usage:Usage;demo?:boolean}) {
 const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const covered=item.coverage==='covered',status=alertStatus(item),enabledDate=item.dates.some(date=>date.reminders_enabled);
 async function change(enabled:boolean){if(demo){setMessage('Sign in to manage alerts for your own household.');return;}setBusy(true);try{const result=await changeCoverage(item.id,item.revision,enabled);setMessage(result.error||result.success||'');if(!result.error)router.refresh();}catch{setMessage('Unable to update alerts. Please retry.');}finally{setBusy(false);}}
 return <section className={'panel reminder-quick-card coverage-quick '+(status==='enabled'?'coverage-enabled':'')} aria-label="Reminder alert status"><span className="quick-action-icon"><Bell size={22}/></span><div className="quick-action-body"><h2>{status==='enabled'?'Reminder alert enabled':status==='paused'?'Reminder alerts paused':'Reminder alerts off'}</h2><p className="hint">Choose alerts for your dates. Your account preferences control delivery.</p><div className="coverage-controls">{!item.archived_at&&<button type="button" className="quick-action-link" disabled={busy||(!covered&&!enabledDate)} onClick={()=>void change(!covered)}>{covered?'Turn alerts off':'Enable alerts'}</button>}<Link className="quick-action-link" href={(demo?'/demo':'')+'/settings/alerts'}>Alert Options</Link></div>{!enabledDate&&<p className="hint">Enable alerts on an important date first.</p>}{message&&<p className="alert info spaced" role="status">{message}</p>}</div></section>;
}
