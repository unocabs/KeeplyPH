'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { readinessChecks, readinessCopy, readinessHref, readinessStateLabels, type ReadinessCheck, type ReadinessState, type ReadinessKey } from '@/features/items/insights';
import { saveReadinessPreference } from '@/features/items/insight-actions';
import { actionError } from '@/lib/action-error';
import type { ItemWithDetails } from '@/features/items/domain';
import styles from './household-insights.module.css';
export function ReadinessPanel({item,demo=false,onAddDate}:{item:ItemWithDetails;demo?:boolean;onAddDate:()=>void}) {
  const [sampleStates,setSampleStates]=useState<Partial<Record<ReadinessKey,ReadinessState>>>({});
  const checks=readinessChecks(item).map(check=>demo && sampleStates[check.key] ? {...check,state:sampleStates[check.key]!} : check);
  return <section className={'panel spaced '+styles.card} aria-labelledby="readiness-heading"><h2 id="readiness-heading">Key details</h2><p className="hint spaced">Keep what’s useful for this item. Unknown or hidden details remain incomplete; not applicable details are excluded.</p><ul className={styles.checks}>{checks.map(check=><ReadinessChoice key={check.key} check={check} item={item} demo={demo} onAddDate={onAddDate} onSampleSave={state=>setSampleStates(states=>({...states,[check.key]:state}))}/>)}</ul></section>;
}
function ReadinessChoice({check,item,demo,onSampleSave,onAddDate}:{check:ReadinessCheck;item:ItemWithDetails;demo:boolean;onSampleSave:(state:ReadinessState)=>void;onAddDate:()=>void}) {
  const submitting=useRef(false);
  const [open,setOpen]=useState(false),[state,setState]=useState(check.state),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function submit(e:React.FormEvent) {
    e.preventDefault();if(submitting.current)return;setError('');
    if(demo){onSampleSave(state);setMessage('Sample preference shown here. No changes are saved.');setOpen(false);return;}
    submitting.current=true;setBusy(true);
    try {const result=await saveReadinessPreference(item.id,item.revision,check.key,state);if(result.error)throw new Error(result.error);setOpen(false);}
    catch(e){setError(actionError(e));}finally{submitting.current=false;setBusy(false);}
  }
  return <li className={styles.check}><div className={styles.checkHeading}><strong>{readinessCopy[check.key].label}</strong><span className={styles.state}>{readinessStateLabels[check.state]}</span></div>{check.state!=='complete'&&<><p className="hint spaced">{readinessCopy[check.key].help}</p><div className={styles.controls}>{['important_date','registration','service_date'].includes(check.key)?<button type="button" className="text-button" onClick={onAddDate}>Review dates</button>:<Link className="text-button" href={readinessHref(item.id,check.key,demo?'/demo':'')}>{check.key==='service_history'?'Record a service':'Add detail'}</Link>}{!item.archived_at&&<button type="button" className="text-button" onClick={()=>{setState(check.state);setError('');setOpen(!open);}} aria-expanded={open}>Manage suggestion</button>}</div></>}{open&&<form className={styles.editor} onSubmit={submit}><fieldset disabled={busy}><label>Detail status<select value={state} onChange={e=>setState(e.target.value as ReadinessState)}><option value="missing">To add</option><option value="unknown">Not known yet</option><option value="not_applicable">Not applicable</option><option value="dismissed">Hide this suggestion</option></select></label>{error&&<p role="alert" className="alert error spaced">{error}</p>}<div className="form-actions"><button type="button" className="button secondary" onClick={()=>setOpen(false)}>Cancel</button><button className="button primary">{busy?'Saving…':demo?'Review sample preference':'Save preference'}</button></div></fieldset></form>}{message&&<p className="alert info spaced" role="status">{message}</p>}</li>;
}
