'use client';
import Link from 'next/link';
import { startTransition, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Gift, PartyPopper, Sparkles, X, ArrowRight } from 'lucide-react';
import { installedApp, subscribeInstalledApp } from '@/lib/install-guide';
import { activateInstallationPremium, acknowledgeInstallationPremium, type InstallationGift } from '@/features/premium/actions';
import styles from './premium.module.css';
export function PremiumGift({accountId,timezone}:{accountId:string;timezone:string}) {
 const installed=useSyncExternalStore(subscribeInstalledApp,installedApp,()=>false),dialog=useRef<HTMLDialogElement>(null),started=useRef(false);
 const [gift,setGift]=useState<InstallationGift|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(!installed||started.current)return;
  started.current=true;let live=true;
  startTransition(async()=>{try {
   const result=await activateInstallationPremium(true);
   if(!live)return;
   if(result.error){setError(result.error);return;}
   if(result.gift?.celebrate)setGift(result.gift);
  }catch{if(live)setError('Your gift is waiting. Check your connection and try again. No payment details are needed.');}});
  return ()=>{live=false;started.current=false;};
 },[installed,accountId,attempt]);
 useEffect(()=>{if(gift&&!dialog.current?.open)dialog.current?.showModal();},[gift]);
 const giftTime=(value:string)=>new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:timezone}).format(new Date(value));
 function close(){dialog.current?.close();}
 function dismissed(){if(gift)startTransition(async()=>{try{await acknowledgeInstallationPremium(gift.id);}catch{}});setGift(null);}
 return <>{error&&<div className="alert info" role="status">{error} <button type="button" className="text-button" onClick={()=>{started.current=false;setError('');setAttempt(value=>value+1);}}>Retry gift activation</button></div>}
 <dialog ref={dialog} className={styles.giftDialog} aria-labelledby="premium-gift-title" onClose={dismissed}>
  <button type="button" className={'icon-button '+styles.close} aria-label="Close premium celebration" onClick={close}><X size={22}/></button>
  <div className={styles.celebration} aria-hidden="true"><Sparkles className={styles.sparkleOne}/><Gift size={58}/><PartyPopper className={styles.sparkleTwo}/></div>
  <span className="eyebrow">A LITTLE GIFT. A LOT TO LOOK FORWARD TO.</span>
  <h2 id="premium-gift-title">Hooray! Your 30 days of<br/>KeeplyPH Premium are here!</h2>
  <p>Your household deserves a little breathing room. Enjoy the full planner, explore the months ahead, and bring your bills, maintenance and renewals together.</p>
  <div className={styles.giftDates}>{gift&&<>Your gift runs from {giftTime(gift.starts_at)} to {giftTime(gift.ends_at)} ({timezone}).</>}</div>
  <p className={styles.noCard}>No card. No payment details. No automatic charges.</p>
  <Link className="button primary wide" href="/planner?days=365" onClick={close}>Enjoy my Premium <ArrowRight size={17}/></Link>
  <button type="button" className="text-button spaced" onClick={close}>Make myself at home first</button>
 </dialog></>;
}
