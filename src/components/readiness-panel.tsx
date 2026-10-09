'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { readinessChecks, readinessCopy, readinessDate, readinessSavedValue, readinessHref, readinessStateLabels, type ReadinessCheck, type ReadinessState, type ReadinessKey } from '@/features/items/insights';
import { guideToSection } from '@/lib/guide-to-section';
import { saveReadinessPreference } from '@/features/items/insight-actions';
import { actionError } from '@/lib/action-error';
import type { ItemWithDetails } from '@/features/items/domain';
import styles from './household-insights.module.css';
export function ReadinessPanel({item,demo=false,onAddDate,onRecordService}:{item:ItemWithDetails;demo?:boolean;onAddDate:()=>void;onRecordService:()=>void}) {
  const [sampleStates,setSampleStates]=useState<Partial<Record<ReadinessKey,ReadinessState>>>({});
  const checks=readinessChecks(item).map(check=>demo && sampleStates[check.key] ? {...check,state:sampleStates[check.key]!} : check);
  return <section className={'panel spaced '+styles.card} aria-labelledby="readiness-heading"><h2 id="readiness-heading">Key details</h2><p className="hint spaced">A checklist of useful records for this item. Add or update a record below, or tell Keeply when a detail is not needed.</p><ul className={styles.checks}>{checks.map(check=><ReadinessChoice key={check.key} check={check} item={item} demo={demo} onAddDate={onAddDate} onRecordService={onRecordService} onSampleSave={state=>setSampleStates(states=>({...states,[check.key]:state}))}/>)}</ul></section>;
}
function ReadinessChoice({check,item,demo,onSampleSave,onAddDate,onRecordService}:{check:ReadinessCheck;item:ItemWithDetails;demo:boolean;onSampleSave:(state:ReadinessState)=>void;onAddDate:()=>void;onRecordService:()=>void}) {
  const submitting=useRef(false);
  const [open,setOpen]=useState(false),[state,setState]=useState(check.state),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function submit(e:React.FormEvent) {
    e.preventDefault();if(submitting.current)return;setError('');
    if(demo){onSampleSave(state);setMessage('Sample preference shown here. No changes are saved.');setOpen(false);return;}
    submitting.current=true;setBusy(true);
    try {const result=await saveReadinessPreference(item.id,item.revision,check.key,state);if(result.error)throw new Error(result.error);setOpen(false);}
    catch(e){setError(actionError(e));}finally{submitting.current=false;setBusy(false);}
  }
  const copy=readinessCopy[check.key];
  const dateDetail=['important_date','registration','service_date','warranty'].includes(check.key);
  const savedDate=readinessDate(item,check.key);
  const savedValue=check.state==='complete'?readinessSavedValue(item,check.key):null;
  function guide(event:React.MouseEvent<HTMLAnchorElement>,id:string) {
    if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;
    event.preventDefault();guideToSection(id);
  }
  const explanation:Record<string,string>={
    missing:'Keep this on your checklist until you add the record.',
    unknown:'Keep this on your checklist as not known yet. You can add the record later.',
    not_applicable:'Exclude this detail from your missing-details count. No saved records are changed.',
    dismissed:'Hide this suggestion from the dashboard. The detail still counts as missing.',
  };
  return <li className={styles.check}><div className={styles.checkHeading}><strong>{copy.label}</strong><span className={styles.state}>{readinessStateLabels[check.state]}</span></div>
    {savedValue&&<p className={styles.savedValue}><strong>{savedValue.value}</strong>{savedValue.detail&&<span>{savedValue.detail}</span>}</p>}
    {check.state!=='complete'&&<p className="hint spaced">{check.state==='not_applicable'?'You marked this detail as not needed for this item.':check.state==='dismissed'?'Hidden from dashboard suggestions. You can still add the record here.':copy.help}</p>}
    {!item.archived_at&&<div className={styles.controls}>{dateDetail?(check.state==='complete'&&savedDate?<a className="text-button" href={'#date-'+savedDate.id} onClick={event=>guide(event,'date-'+savedDate.id)}>Review or update date</a>:<button type="button" className="text-button" onClick={onAddDate}>Add a date</button>):check.key==='service_history'?(check.state!=='complete'?<button type="button" className="text-button" onClick={onRecordService}>Record a completed service</button>:<a className="text-button" href="#activity-history-heading" onClick={event=>guide(event,'activity-history-heading')}>View service history</a>):<Link className="text-button" href={readinessHref(item.id,check.key,demo?'/demo':'')}>{check.state==='complete'?'Update detail':'Add detail'}</Link>}
      {check.state!=='complete'&&<button type="button" className="text-button" onClick={()=>{setState(check.state);setError('');setOpen(!open);}} aria-expanded={open}>Checklist options</button>}
    </div>}
    {open&&<form className={styles.editor} onSubmit={submit}><fieldset disabled={busy}><h3>{copy.label}: checklist options</h3><p className="hint spaced">This changes the checklist only. Choose an option above to add the actual record.</p><label className="spaced">How should Keeply treat this detail?<select value={state} onChange={e=>setState(e.target.value as ReadinessState)}><option value="missing">I still need to add it</option><option value="unknown">I don’t know it yet</option><option value="not_applicable">I don’t need this for this item</option><option value="dismissed">Hide from dashboard suggestions</option></select></label><p className="hint spaced" aria-live="polite">{explanation[state]}</p>{error&&<p role="alert" className="alert error spaced">{error}</p>}<div className="form-actions"><button type="button" className="button secondary" onClick={()=>setOpen(false)}>Cancel</button><button className="button primary">{busy?'Saving…':demo?'Preview checklist change':'Save checklist choice'}</button></div></fieldset></form>}{message&&<p className="alert info spaced" role="status">{message}</p>}</li>;
}
