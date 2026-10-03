'use client';

import Image from 'next/image';
import { useId, useRef, useState, useSyncExternalStore } from 'react';
import { Smartphone, Monitor, ArrowRight, X, Gift } from 'lucide-react';
import { installSteps, type InstallDevice } from '@/lib/install-guide';
import { PushOptions } from './push-options';
import styles from './install-setup.module.css';

const subscribeDismissal = (update: () => void) => {
  window.addEventListener('keeply-setup-dismissed', update);
  return () => window.removeEventListener('keeply-setup-dismissed', update);
};

export function InstallSetup({ publicKey, claimed = false, accountId, dashboard = false }: { publicKey: string | null; claimed?: boolean; accountId: string; dashboard?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const [device, setDevice] = useState<InstallDevice | null>(null);
  const [step, setStep] = useState(0);
  const dismissed = useSyncExternalStore(subscribeDismissal, () => {
    try { return sessionStorage.getItem('keeply-setup-dismissed:' + accountId) === 'yes'; } catch { return false; }
  }, () => false);
  const steps = device ? installSteps[device] : [];
  const current = steps[step];
  const notifications = Boolean(device && step === steps.length);
  function open() { setDevice(null); setStep(0); dialog.current?.showModal(); }
  function dismiss() {
    try { sessionStorage.setItem('keeply-setup-dismissed:' + accountId, 'yes'); } catch { /* The guide remains available if storage is blocked. */ }
    window.dispatchEvent(new Event('keeply-setup-dismissed'));
  }
  function go(next: number) { setStep(next); requestAnimationFrame(() => heading.current?.focus()); }
  return <>
    {dashboard && (dismissed || claimed) ? <div className={styles.returnLink}><button type="button" className="text-button" onClick={open}>{claimed ? 'Set up Keeply on another device' : 'Install Keeply & get 2 permanent free slots'} <ArrowRight size={15} aria-hidden="true" /></button></div> :
      <section className={styles.card} aria-label="Install Keeply and set up notifications">
        <span className={styles.icon}><Gift size={24} aria-hidden="true" /></span>
        <div className={styles.copy}><span className="eyebrow">KEEPLY, A TAP AWAY</span><h2>{claimed ? 'Keeply goes with you.' : 'Get 2 permanent free alert slots.'}</h2><p>{claimed ? 'Your one-time reward is already included. Use this guide to connect another device.' : 'Add Keeply to your Home Screen or install it on your computer, then turn on notifications. Claim once per account.'}</p></div>
        <button type="button" className="button primary" onClick={open}>{claimed ? 'Device setup guide' : 'Show me how'} <ArrowRight size={16} aria-hidden="true" /></button>
        {dashboard && <button type="button" className={'icon-button ' + styles.dismiss} aria-label="Dismiss setup card for this session" onClick={dismiss}><X size={18} /></button>}
      </section>}
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onClose={() => { setDevice(null); setStep(0); }}>
      <div className={styles.header}><span className="eyebrow">{device ? `STEP ${step + 1} OF ${steps.length + 1}` : 'A LITTLE CLOSER TO KEEPLY'}</span><button type="button" className="icon-button" aria-label="Close device setup guide" onClick={() => dialog.current?.close()}><X size={21} /></button></div>
      {device && <progress className={styles.progress} value={step + 1} max={steps.length + 1} aria-label="Setup guide progress" />}
      <h2 id={titleId} ref={heading} tabIndex={-1}>{!device ? 'Where would you like to add Keeply?' : notifications ? 'Turn on notifications & claim your slots' : current.title}</h2>
      {!device ? <>
        <p className={styles.description}>Choose the device you want help with. You can follow along here, even if you’re setting up a different device.</p>
        <div className={styles.choices}>{([['ios', 'iPhone or iPad', 'Guide with screenshots'], ['android', 'Android', 'Step-by-step text guide'], ['computer', 'Computer', 'Windows, Mac, Chromebook or Linux']] as const).map(([key, label, hint]) => <button type="button" className={styles.choice} key={key} onClick={() => { setDevice(key); go(0); }}>{key === 'computer' ? <Monitor size={24} aria-hidden="true" /> : <Smartphone size={24} aria-hidden="true" />}<span><strong>{label}</strong><small>{hint}</small></span><ArrowRight size={18} aria-hidden="true" /></button>)}</div>
        <p className="hint">{claimed ? 'Your 2 permanent free slots are already included. Another device does not grant another reward.' : 'Complete installation and notification setup on the same device to claim 2 extra alert slots. They stay yours, even if you later turn notifications off.'}</p>
      </> : notifications ? <>
        <p className={styles.description}>On the device you installed Keeply on, open it from its icon. Tap Turn on notifications below, then choose Allow in the device’s permission popup.</p>
        <p className="hint">Setting up another device? Open Settings → Alert Options in its installed Keeply app to finish there. The buttons below control the device you’re using right now.</p>
        <PushOptions publicKey={publicKey} showReward rewardClaimed={claimed} />
      </> : <>
        <p className={styles.description}>{current.text}</p>
        {current.image && <figure className={styles.figure}><a href={current.image} target="_blank" rel="noopener noreferrer" aria-label="Open screenshot at full size"><Image src={current.image} alt={current.alt || current.title} width={600} height={1100} sizes="(max-width: 600px) 85vw, 420px" className={styles.screenshot} /></a><figcaption>Look for the control circled in red. Tap the image to enlarge it.</figcaption></figure>}
        {current.hint && <p className={'alert info ' + styles.hint}>{current.hint}</p>}
      </>}
      {device && !notifications && <button type="button" className="text-button spaced" onClick={() => go(steps.length)}>Already installed? Set up notifications →</button>}
      <div className={styles.footer}>{device ? <>
        <button type="button" className="button secondary" onClick={() => step ? go(step - 1) : setDevice(null)}>Back</button>
        {!notifications && <button type="button" className="button primary" onClick={() => go(step + 1)}>Next <ArrowRight size={16} aria-hidden="true" /></button>}
        {notifications && <button type="button" className="button secondary" onClick={() => dialog.current?.close()}>Done</button>}
      </> : <button type="button" className="text-button" onClick={() => dialog.current?.close()}>Maybe later</button>}</div>
    </dialog>
  </>;
}
