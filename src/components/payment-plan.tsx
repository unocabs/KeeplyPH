'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, Pencil, ReceiptText } from 'lucide-react';
import { formatDate, formatMoney, parseMoney } from '@/lib/domain';
import { actionError } from '@/lib/action-error';
import { previewPaymentChange, type AmountCertainty, type PaymentActionContext, type PaymentPlan, type PlannedPayment } from '@/features/items/insights';
import { saveOccurrenceAmount } from '@/features/items/insight-actions';
import { recordOccurrence } from '@/features/items/activity-actions';
import { PaymentTotals } from './household-insights';
import { ItemIdentityIcon } from './reminder-icon';
import styles from './household-insights.module.css';

type AmountChange = { amount:number|null; certainty:AmountCertainty };
export function HouseholdPaymentPlan({plan,contexts={},base='',paged=false,demo=false}:{plan:PaymentPlan;contexts?:Record<string,PaymentActionContext>;base?:string;paged?:boolean;demo?:boolean}) {
  const [preview,setPreview]=useState(plan),[message,setMessage]=useState('');
  const shown=demo?preview:plan,last=shown.rows.at(-1);
  function changed(row:PlannedPayment,change:AmountChange|'paid') {
    if(demo)setPreview(current=>previewPaymentChange(current,row,change));
    setMessage(demo ? change==='paid'?'Sample payment marked paid here. No changes are saved.':'Sample amount shown here. No changes are saved.' : change==='paid'?`Payment recorded for ${row.product_name}.`:`Amount updated for ${row.product_name}.`);
  }
  return <><Link className="back-link" href={base+'/dashboard'}>← Household overview</Link>
    <div className="page-heading"><div><h1>Payments to plan for</h1><p>{formatDate(plan.today,true)} to {formatDate(plan.ends_on,true)} · {shown.total} {shown.total===1?'payment':'payments'}</p></div></div>
    <section className={'panel '+styles.card}><PaymentTotals plan={shown}/><p className={styles.footer}>Edit amounts or mark a payment paid here. Completed and overdue payments are excluded.</p></section>
    <div role="status" aria-live="polite" className={message?styles.paymentNotice:undefined}>{message}</div>
    <ol className={styles.paymentList}>{shown.rows.map(row=><PaymentCard key={row.date_id+':'+row.due_on} row={row} context={contexts[row.date_id]} today={plan.today} base={base} demo={demo} onChange={change=>changed(row,change)}/>)}</ol>
    {!shown.rows.length&&<p className="panel spaced">{paged?'No more payment dates in this window.':message?'You’re up to date. No more payments to plan for in this window.':'No payments saved for the next 30 days.'}</p>}
    <div className="form-actions">{paged&&<Link className="button secondary" href={base+'/items/payments'}>First page</Link>}{shown.has_more&&last&&<Link className="button secondary" href={base+'/items/payments?'+new URLSearchParams({before:last.due_on,id:last.date_id})}>Next page →</Link>}</div>
  </>;
}

function PaymentCard({row,context,today,base,demo,onChange}:{row:PlannedPayment;context?:PaymentActionContext;today:string;base:string;demo:boolean;onChange:(change:AmountChange|'paid')=>void}) {
  const title=useId(),formId=useId(),submitting=useRef(false),request=useRef('');
  const form=useRef<HTMLFormElement>(null),editingRevision=useRef(0);
  const card=useRef<HTMLLIElement>(null),restoreFocus=useRef<'amount'|'paid'|null>(null);
  const [mode,setMode]=useState<'amount'|'paid'|null>(null),[amount,setAmount]=useState(''),[estimated,setEstimated]=useState(row.certainty==='estimated');
  const [paidOn,setPaidOn]=useState(today),[notes,setNotes]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const actionable=Boolean(row.occurrence_id&&!row.projected&&context);
  useEffect(()=>{
    if(mode){form.current?.scrollIntoView({block:'nearest'});form.current?.querySelector<HTMLElement>('input,select')?.focus({preventScroll:true});}
    else if(restoreFocus.current){card.current?.querySelector<HTMLElement>(`button[data-editor="${restoreFocus.current}"]`)?.focus({preventScroll:true});restoreFocus.current=null;}
  },[mode]);
  function close(){restoreFocus.current=mode;setMode(null);setError('');}
  function open(next:'amount'|'paid') {
    editingRevision.current=context?.revision??0;
    setAmount(row.amount_minor==null?'':String(row.amount_minor/100));setEstimated(row.certainty==='estimated');setPaidOn(today);setNotes('');setError('');request.current='';setMode(next);
  }
  async function saveAmount(change:AmountChange) {
    if(submitting.current||!context||!row.occurrence_id)return;
    submitting.current=true;setBusy(true);setError('');
    try {
      if(!demo){const result=await saveOccurrenceAmount(row.occurrence_id,mode?editingRevision.current:context.revision,change.amount,change.certainty);if(result.error)throw new Error(result.error);}
      close();onChange(change);
    }catch(error){setError(actionError(error));}finally{submitting.current=false;setBusy(false);}
  }
  async function submitAmount(event:React.FormEvent) {
    event.preventDefault();
    let value:number|null;
    try {value=parseMoney(amount);}catch {setError('Enter a valid amount with at most two decimal places.');return;}
    if(value!==null&&value>99999999999){setError('Enter an amount up to ₱999,999,999.99.');return;}
    await saveAmount({amount:value,certainty:value===null?'unset':estimated?'estimated':'confirmed'});
  }
  async function submitPaid(event:React.FormEvent) {
    event.preventDefault();if(submitting.current||!context||!row.occurrence_id)return;
    let value:number|null;
    try {value=parseMoney(amount);}catch {setError('Enter a valid amount with at most two decimal places.');return;}
    if(amount.trim()&&(value===null||value>99999999999)){setError('Enter the actual amount paid, or leave it empty if you don’t know it.');return;}
    if(!paidOn||paidOn>today){setError('Choose today or an earlier date for a payment you’ve already made.');return;}
    submitting.current=true;setBusy(true);setError('');
    try {
      if(!demo){
        request.current ||= crypto.randomUUID();
        const result=await recordOccurrence(request.current,row.occurrence_id,editingRevision.current,{activity_type:'payment',title:(row.label+' paid').slice(0,160),completed_on:paidOn,amount_minor:value,notes,document_ids:[]},'','fixed');
        if(result.error)throw new Error(result.error);
      }
      setMode(null);onChange('paid');
    }catch(error){setError(actionError(error));}finally{submitting.current=false;setBusy(false);}
  }
  return <li ref={card} className={styles.paymentRow} aria-labelledby={title}>
    <div className={styles.paymentHeading}><ItemIdentityIcon item={row.identity}/><div><Link className={styles.paymentIdentity} href={base+'/items/'+row.item_id+'#date-'+row.date_id}><strong id={title}>{row.product_name}</strong></Link><p>{row.label} · {formatDate(row.due_on)}{row.projected?' · Projected from saved schedule':''}</p></div></div>
    <div className={styles.amount}><strong>{row.amount_minor==null?'No amount added':formatMoney(row.amount_minor)}</strong>{row.certainty==='estimated'&&<p>Approx.</p>}</div>
    {actionable&&!mode&&<div className={styles.paymentActions} role="group" aria-busy={busy} aria-label={'Payment actions for '+row.product_name}>
      {context?.can_record_payment&&<button type="button" data-editor="paid" className={styles.paidAction} disabled={busy} onClick={()=>open('paid')} aria-expanded={false} aria-controls={formId}><CheckCircle2 size={17} aria-hidden="true"/>Mark paid</button>}
      <button type="button" data-editor="amount" disabled={busy} onClick={()=>open('amount')} aria-expanded={false} aria-controls={formId}><Pencil size={15} aria-hidden="true"/>{row.amount_minor==null?'Add amount':'Edit amount'}</button>
    </div>}
    {!actionable&&<p className={styles.projectedHint}>{row.projected?'A planned date, not a saved bill yet. Actions are available on the current saved payment date.':'This payment is no longer available to update. Refresh the page to see the latest details.'}</p>}
    {mode&&<form ref={form} id={formId} className={styles.paymentEditor} onSubmit={mode==='paid'?submitPaid:submitAmount}>
      <fieldset disabled={busy}>
        <h2><ReceiptText size={18} aria-hidden="true"/>{mode==='paid'?'Record a payment':'Expected amount for this date'}</h2>
        <p>{mode==='paid'?'Record a payment you’ve already made. Confirm the actual amount and date below. Any repeating schedule will continue.':'For this payment date only. Leave the amount empty to remove it.'}</p>
        <div className="field-grid spaced">
          {mode==='paid'&&<label>Paid on<input type="date" required min="1900-01-01" max={today} value={paidOn} onChange={event=>setPaidOn(event.target.value)}/></label>}
          <label className={mode==='paid'?undefined:'full'}>{mode==='paid'?'Amount paid (optional, PHP)':'Expected amount (PHP)'}<input type="text" inputMode="decimal" value={amount} onChange={event=>setAmount(event.target.value)} placeholder="0.00"/></label>
          {mode==='amount'&&<label className="checkbox-row full"><input type="checkbox" checked={estimated} onChange={event=>setEstimated(event.target.checked)}/><span>This is an estimate</span></label>}
          {mode==='paid'&&<label className="full">Notes (optional)<textarea rows={2} maxLength={5000} value={notes} onChange={event=>setNotes(event.target.value)}/></label>}
        </div>
        {error&&<p role="alert" className="alert error spaced">{error}</p>}
        <div className={styles.paymentFormActions}><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button primary">{busy?'Saving…':mode==='paid'?demo?'Preview paid payment':'Confirm payment recorded':demo?'Review sample amount':'Save expected amount'}</button></div>
      </fieldset>
    </form>}
    {error&&!mode&&<p role="alert" className={'alert error '+styles.paymentError}>{error}</p>}
  </li>;
}
