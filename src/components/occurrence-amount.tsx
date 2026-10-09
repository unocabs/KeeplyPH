'use client';
import { useRef, useState } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { formatMoney, parseMoney } from '@/lib/domain';
import { actionError } from '@/lib/action-error';
import { amountLabels, occurrenceAmount, type AmountCertainty } from '@/features/items/insights';
import { saveOccurrenceAmount } from '@/features/items/insight-actions';
import type { DateWithDetails, Occurrence } from '@/features/items/domain';
import styles from './household-insights.module.css';
export function OccurrenceAmount({date,occurrence,demo=false,archived=false}:{date:DateWithDetails;occurrence:Occurrence;demo?:boolean;archived?:boolean}) {
  const initial=occurrenceAmount(date,occurrence),intent=useSearchParams(),pathname=usePathname(),submitting=useRef(false);
  const [shown,setShown]=useState(initial),[editing,setEditing]=useState(false),[closedLink,setClosedLink]=useState(false),[certainty,setCertainty]=useState<AmountCertainty | 'inherit'>(initial.certainty),[amount,setAmount]=useState(initial.amount==null?'':String(initial.amount/100));
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const linked=intent.get('action')==='amount'&&intent.get('date')===date.id,open=editing||(linked&&!closedLink);
  function close() {setEditing(false);setClosedLink(true);if(linked){const query=new URLSearchParams(intent);query.delete('action');query.delete('date');window.history.replaceState(null,'',pathname+(query.size?'?'+query:'')+'#date-'+date.id);}}
  async function submit(e:React.FormEvent) {
    e.preventDefault();if(submitting.current)return;setError('');submitting.current=true;setBusy(true);
    try {
      const parsed=['unset','inherit'].includes(certainty)?null:parseMoney(amount);
      if(!['unset','inherit'].includes(certainty)&&(parsed===null||parsed>99999999999))throw new Error('Enter an amount for this occurrence, or choose Amount not saved.');
      if(demo){setShown(certainty==='inherit'?occurrenceAmount(date,{...occurrence,amount_certainty:null,expected_amount_minor:null}):{amount:parsed,certainty});setMessage('Sample amount shown here. No changes are saved.');close();return;}
      const result=await saveOccurrenceAmount(occurrence.id,date.revision,parsed,certainty);if(result.error)throw new Error(result.error);
      close();
    }catch(e){setError(actionError(e));}finally{submitting.current=false;setBusy(false);}
  }
  return <div className="spaced"><p><strong>Expected amount:</strong> {shown.amount==null?'Not saved':formatMoney(shown.amount)} <span className="hint">· {amountLabels[shown.certainty]}</span></p><p className="hint spaced">For this occurrence only. Confirming an amount does not record a payment.</p>{!archived&&!open&&<button type="button" className="text-button spaced" onClick={()=>{setCertainty(shown.certainty);setAmount(shown.amount==null?'':String(shown.amount/100));setEditing(true);setError('');}}>Edit expected amount</button>}{open&&<form className={styles.editor} onSubmit={submit}><fieldset disabled={busy}><h3>Expected amount for this date</h3><label className="spaced">Amount status<select value={certainty} onChange={e=>setCertainty(e.target.value as AmountCertainty | 'inherit')}><option value="inherit">Use schedule amount</option>{Object.entries(amountLabels).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>{!['unset','inherit'].includes(certainty)&&<label className="spaced">Expected amount (PHP)<input type="text" inputMode="decimal" required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></label>}<p className="hint spaced">Use Confirmed when you have checked this occurrence’s actual bill or agreed amount. Later cycles retain the schedule’s estimate or unverified amount.</p>{error&&<p role="alert" className="alert error spaced">{error}</p>}<div className="form-actions"><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button primary">{busy?'Saving…':demo?'Review sample amount':'Save expected amount'}</button></div></fieldset></form>}{message&&<p role="status" className="alert info spaced">{message}</p>}</div>;
}
