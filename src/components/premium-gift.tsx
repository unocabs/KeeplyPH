'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import { startTransition, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Gift, PartyPopper, Sparkles, X, ArrowRight } from 'lucide-react';
import { installedApp, subscribeInstalledApp } from '@/lib/install-guide';
import { activateInstallationPremium, acknowledgeInstallationPremium, type InstallationGift } from '@/features/premium/actions';
import styles from './premium.module.css';
export function PremiumGift({accountId,timezone}:{accountId:string;timezone:string}) {
 const installed=useSyncExternalStore(subscribeInstalledApp,installedApp,()=>false),dialog=useRef<HTMLDialogElement>(null),started=useRef(false);
 const [gift,setGift]=useState<InstallationGift|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[opening,setOpening]=useState(false);
 const router=useRouter(),acknowledgementAttempted=useRef(false);
 useEffect(()=>{
  if(!installed||started.current)return;
  started.current=true;let live=true;
  startTransition(async()=>{try {
   const result=await activateInstallationPremium(true);
   if(!live)return;
   if(result.error){setError(result.error);return;}
   if(result.gift?.celebrate){acknowledgementAttempted.current=false;setGift(result.gift);}
  }catch{if(live)setError('Your gift is waiting. Check your connection and try again. No payment details are needed.');}});
  return ()=>{live=false;started.current=false;};
 },[installed,accountId,attempt]);
 useEffect(()=>{if(gift&&!dialog.current?.open)dialog.current?.showModal();},[gift]);
 const giftTime=(value:string)=>new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:timezone}).format(new Date(value));
 function close(){dialog.current?.close();}
 function dismissed(){if(gift&&!acknowledgementAttempted.current){acknowledgementAttempted.current=true;startTransition(async()=>{try{await acknowledgeInstallationPremium(gift.id);}catch{}});}setGift(null);}
 async function openCheckup(){
  if(!gift||opening)return;setOpening(true);
  acknowledgementAttempted.current=true;
  try{await acknowledgeInstallationPremium(gift.id);}catch{/* Access remains usable if acknowledgement cannot be saved. */}
  if(dialog.current?.open){close();router.push('/checkup');}setOpening(false);
 }
 return <>{error&&<div className="alert info" role="status">{error} <button type="button" className="text-button" onClick={()=>{started.current=false;setError('');setAttempt(value=>value+1);}}>Retry gift activation</button></div>}
 <dialog ref={dialog} className={styles.giftDialog} aria-labelledby="premium-gift-title" data-premium-surface="gift" onClose={dismissed}>
  <button type="button" className={'icon-button '+styles.close} aria-label="Close premium celebration" onClick={close}><X size={22}/></button>
  <div className={styles.celebration} aria-hidden="true"><Sparkles className={styles.sparkleOne}/><Gift size={58}/><PartyPopper className={styles.sparkleTwo}/></div>
  <span className="eyebrow">A LITTLE GIFT. A LOT TO LOOK FORWARD TO.</span>
  <h2 id="premium-gift-title">Hooray! Your 30 days of<br/>Keeply Premium are here!</h2>
  <p>Your household deserves a little breathing room. Open your 30-Day Spending Checkup, compare monthly costs, and plan up to a year ahead with your saved bills, maintenance and renewals.</p>
  <div className={styles.giftDates}>{gift&&<>Your gift runs from {giftTime(gift.starts_at)} to {giftTime(gift.ends_at)} ({timezone}).</>}</div>
  <p className={styles.noCard}>No card. No payment details. No automatic charges.</p>
  <Link className="button primary wide" href="/checkup" aria-disabled={opening} onClick={event=>{event.preventDefault();void openCheckup();}}>{opening?'Opening your checkup…':'Open my spending checkup'} <ArrowRight size={17}/></Link>
  <button type="button" className="text-button spaced" onClick={close}>Make myself at home first</button>
 </dialog></>;
}
