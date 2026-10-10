'use client';
import { useRef, useState, useTransition } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { formatMoney, parseMoney } from '@/lib/domain';
import { actionError } from '@/lib/action-error';
import { occurrenceAmount, type AmountCertainty } from '@/features/items/insights';
import { saveOccurrenceAmount } from '@/features/items/insight-actions';
import type { DateWithDetails, Occurrence } from '@/features/items/domain';
import styles from './household-insights.module.css';
export function OccurrenceAmount({date,occurrence,demo=false,archived=false}:{date:DateWithDetails;occurrence:Occurrence;demo?:boolean;archived?:boolean}) {
  const [transitioning,startTransition]=useTransition();
  const initial=occurrenceAmount(date,occurrence),intent=useSearchParams(),pathname=usePathname(),submitting=useRef(false);
  const [preview,setPreview]=useState(initial),[editing,setEditing]=useState(false),[closedLink,setClosedLink]=useState(false),[estimated,setEstimated]=useState(initial.certainty==='estimated'),[amount,setAmount]=useState(initial.amount==null?'':String(initial.amount/100));
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const shown=demo?preview:initial;
  const linked=intent.get('action')==='amount'&&intent.get('date')===date.id,open=editing||(linked&&!closedLink);
  function close() {setEditing(false);setClosedLink(true);if(linked){const query=new URLSearchParams(intent);query.delete('action');query.delete('date');window.history.replaceState(null,'',pathname+(query.size?'?'+query:'')+'#date-'+date.id);}}
  function save(parsed:number|null,certainty:AmountCertainty|'inherit') {
    if(submitting.current)return;setError('');submitting.current=true;setBusy(true);
    startTransition(async()=>{try {
      if(demo){setPreview(certainty==='inherit'?occurrenceAmount(date,{...occurrence,amount_certainty:null,expected_amount_minor:null}):{amount:parsed,certainty});setMessage('Sample amount shown here. No changes are saved.');close();return;}
      const result=await saveOccurrenceAmount(occurrence.id,date.revision,parsed,certainty);if(result.error)throw new Error(result.error);
      setMessage('Amount saved.');close();
    }catch(e){setError(actionError(e));}finally{submitting.current=false;setBusy(false);}});
  }
  async function submit(e:React.FormEvent) {
    e.preventDefault();
    try {
      const parsed=parseMoney(amount);
      if(parsed!==null&&parsed>99999999999)throw new Error('Enter an amount up to ₱999,999,999.99.');
      await save(parsed,parsed===null?'unset':estimated?'estimated':'confirmed');
    }catch(e){setError(actionError(e));}
  }
  return <div className="spaced">
    <p><strong>Expected amount:</strong> {shown.amount==null?'Cost not added':formatMoney(shown.amount)}{shown.certainty==='estimated'&&<span className="hint"> · Approx.</span>}</p>
    {!archived&&!open&&<button type="button" className="text-button spaced" onClick={()=>{setEstimated(shown.certainty==='estimated');setAmount(shown.amount==null?'':String(shown.amount/100));setEditing(true);setError('');}}>{shown.amount==null?'Add expected cost':'Edit expected amount'}</button>}
    {open&&<form className={styles.editor} onSubmit={submit}><fieldset disabled={busy||transitioning}><h3>Expected amount for this date</h3>
      <label className="spaced">Expected amount (PHP)<input type="text" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></label>
      <label className="checkbox-row spaced"><input type="checkbox" checked={estimated} onChange={e=>setEstimated(e.target.checked)}/><span>This is an estimate</span></label>
      <p className="hint spaced">Included in your payment plan for this date. Leave empty to remove the amount. Future dates keep their schedule amount.</p>
      {error&&<p role="alert" className="alert error spaced">{error}</p>}
      <div className="form-actions"><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button primary">{busy||transitioning?'Saving…':demo?'Review sample amount':'Save expected amount'}</button></div>
      {occurrence.amount_certainty!=null&&<button type="button" className="text-button spaced" onClick={()=>void save(null,'inherit')}>Reset to schedule amount</button>}
    </fieldset></form>}{message&&<p role="status" className="alert info spaced">{message}</p>}
  </div>;
}
