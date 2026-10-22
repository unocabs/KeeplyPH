'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Check, Sparkles } from 'lucide-react';
import { addDays } from '@/features/items/planning';
import { checkupHref, type CheckupActions, type SpendingCheckup } from '@/features/premium/checkup';
import { formatDate } from '@/lib/domain';
import styles from './spending-checkup.module.css';

type RangePlan=Pick<SpendingCheckup,'today'|'mode'|'saved_payday'|'expired_payday'>;
export function CheckupRangeControls({plan,demo,savePaydayAction}:{plan:RangePlan;demo:boolean;savePaydayAction?:CheckupActions['savePayday']}) {
 const router=useRouter(),[editing,setEditing]=useState(false),[date,setDate]=useState(plan.saved_payday&&plan.saved_payday>plan.today?plan.saved_payday:''),[error,setError]=useState(''),[pending,startTransition]=useTransition();
 const input=useRef<HTMLInputElement>(null),trigger=useRef<HTMLButtonElement>(null),base=demo?'/demo':'';
 const validPayday=Boolean(plan.saved_payday&&plan.saved_payday>plan.today&&plan.saved_payday<=addDays(plan.today,365));
 useEffect(()=>{if(editing)input.current?.focus();},[editing]);
 function cancel(){setEditing(false);setError('');setDate(validPayday?plan.saved_payday!:'');trigger.current?.focus();}
 function open(){setDate(validPayday?plan.saved_payday!:'');setEditing(true);setError('');}
 return <div className={styles.range}>
   <nav className={styles.segments} aria-label="Checkup period">
     <Link aria-current={plan.mode!=='payday'?'page':undefined} href={checkupHref(base,{...plan,mode:'30'})}>Next 30 days</Link>
     {validPayday?<Link aria-current={plan.mode==='payday'?'page':undefined} href={checkupHref(base,{...plan,mode:'payday'})}>Until payday</Link>:<button type="button" ref={trigger} aria-expanded={editing} aria-controls="checkup-payday-form" onClick={open}>Until payday</button>}
   </nav>
   {validPayday&&<div className={styles.paydayLine}><span><CalendarDays size={15} aria-hidden="true"/>Payday · {formatDate(plan.saved_payday!,true)}</span><button type="button" ref={trigger} onClick={open} aria-expanded={editing} aria-controls="checkup-payday-form">Change payday</button></div>}
   {plan.expired_payday&&!editing&&<p className={styles.note}>Your saved payday has passed. Showing the next 30 days until you choose a new date.</p>}
   {editing&&<form id="checkup-payday-form" className={styles.paydayForm} onKeyDown={event=>{if(event.key==='Escape'&&!pending){event.preventDefault();cancel();}}} onSubmit={event=>{
     event.preventDefault();setError('');
     if(!date||date<=plan.today||date>addDays(plan.today,365)){setError('Choose a payday from tomorrow to one year ahead.');return;}
     startTransition(async()=>{
       try {
         const result=savePaydayAction?await savePaydayAction(date):demo?{}:{error:'Your payday could not be saved. Please try again.'};
         if(result.error){setError(result.error);return;}
         setEditing(false);router.push(checkupHref(base,{mode:'payday',saved_payday:date}));router.refresh();
       }catch{setError('Your payday could not be saved. Please try again.');}
     });
   }}>
     <label htmlFor="checkup-payday">When is your next payday?</label>
     <p id="checkup-payday-help">Plan for expenses before this date. Expenses on payday are excluded. Your expense dates stay the same.</p>
     <input ref={input} id="checkup-payday" name="payday" type="date" required min={addDays(plan.today,1)} max={addDays(plan.today,365)} value={date} onChange={event=>setDate(event.target.value)} disabled={pending} aria-describedby="checkup-payday-help"/>
     {error&&<p className="form-error" role="alert">{error}</p>}
     <div className={styles.actions}><button className="button primary" type="submit" disabled={pending}>{pending?'Saving…':'Save payday'}</button><button className="button secondary" type="button" disabled={pending} onClick={cancel}>Cancel</button></div>
   </form>}
 </div>;
}

/** This POST runs only after the signed-in checkup is mounted, never on prefetch. */
export function CheckupCapture({captureAction,firstUse}:{captureAction:NonNullable<CheckupActions['capture']>;firstUse:boolean}) {
 const started=useRef(false),[state,setState]=useState<'saving'|'saved'|'error'>('saving');
 async function save(){setState('saving');try{const result=await captureAction();setState(result.error?'error':'saved');}catch{setState('error');}}
 useEffect(()=>{if(!started.current){started.current=true;void save();} // The daily backend key also deduplicates tabs and remounts.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 if(!firstUse&&state!=='error')return null;
 return <div className={styles.baseline} aria-live="polite">{state==='error'?<><p>Your comparison point could not be saved. Your expenses are still available.</p><button className="text-button" type="button" onClick={()=>void save()}>Try saving again</button></>:firstUse?<><span className={styles.insightIcon}>{state==='saved'?<Check size={18} aria-hidden="true"/>:<Sparkles size={18} aria-hidden="true"/>}</span><div><strong>{state==='saved'?'Your first checkup is saved':'Saving your first checkup'}</strong><p>On your next visit, see what changed. We keep the first checkup of each day for comparison.</p></div></>:null}</div>;
}
