'use client';

import Image from 'next/image';
import { startTransition, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { Smartphone, Monitor, ArrowRight, X, Gift } from 'lucide-react';
import { installedApp, installSteps, subscribeInstalledApp, type InstallDevice } from '@/lib/install-guide';
import { pushDeviceStatus } from '@/features/alerts/push-actions';
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
  const [directNotifications, setDirectNotifications] = useState(false);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const installed = useSyncExternalStore(subscribeInstalledApp, installedApp, () => false);
  useEffect(() => {
    if (!installed || claimed || !publicKey || !('serviceWorker' in navigator) || !('Notification' in window)) return;
    let live = true;
    async function check() {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        const subscription = await registration?.pushManager.getSubscription();
        if (!subscription || Notification.permission !== 'granted') { if (live) setDeviceConnected(false); return; }
        const status = await pushDeviceStatus(subscription.endpoint);
        if (live) setDeviceConnected(status.enabled && status.registered && Notification.permission === 'granted');
      } catch { if (live) setDeviceConnected(false); }
    }
    const refresh = () => startTransition(() => { void check(); });
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('keeply-push-permission', refresh);
    return () => { live = false; window.removeEventListener('focus', refresh); window.removeEventListener('keeply-push-permission', refresh); };
  }, [installed, claimed, publicKey]);
  const dismissed = useSyncExternalStore(subscribeDismissal, () => {
    try { return sessionStorage.getItem('keeply-setup-dismissed:' + accountId) === 'yes'; } catch { return false; }
  }, () => false);
  const steps = device ? installSteps[device] : [];
  const current = steps[step];
  const notifications = directNotifications || Boolean(device && step === steps.length);
  const readyToClaim = installed && deviceConnected && !claimed;
  const headline = claimed ? 'Keeply goes with you.' : readyToClaim ? 'Your free gift is ready.' : installed ? 'Never miss a deadline by turning on your notifications.' : 'It’s easy to add Keeply to your device.';
  const actionLabel = claimed ? 'Set up another device' : readyToClaim ? 'Claim your 2 free slots' : installed ? 'Turn on notifications' : 'Show me how';
  function chooseDevice() { setDirectNotifications(false); setDevice(null); setStep(0); }
  function open() { setDevice(null); setStep(0); setDirectNotifications(installedApp() && !claimed); dialog.current?.showModal(); }
  function dismiss() {
    try { sessionStorage.setItem('keeply-setup-dismissed:' + accountId, 'yes'); } catch { /* The guide remains available if storage is blocked. */ }
    window.dispatchEvent(new Event('keeply-setup-dismissed'));
  }
  function go(next: number) { setStep(next); requestAnimationFrame(() => heading.current?.focus()); }
  return <>
    {dashboard && (dismissed || claimed) ? <div className={styles.returnLink}><button type="button" className="text-button" onClick={open}>{claimed ? 'Set up another device' : installed ? actionLabel : 'Add Keeply & get your 2 permanent free slots'} <ArrowRight size={15} aria-hidden="true" /></button></div> :
      <section className={styles.card} aria-label="Install Keeply and set up notifications">
        <span className={styles.icon}><Gift size={24} aria-hidden="true" /></span>
        <div className={styles.copy}><span className="eyebrow">YOUR REMINDERS, ALL IN ONE PLACE</span><h2>{headline}</h2><p>{claimed ? 'Your 2 permanent free slots are already included. Keep your reminders close on another device.' : readyToClaim ? 'Keeply is a tap away, with notifications ready to help you stay ahead of approaching deadlines. Claim your gift of 2 permanent free alert slots.' : installed ? 'Feel more in control with one place for all your reminders. Turn on notifications to stay ahead of approaching deadlines, and receive your gift of 2 permanent free alert slots.' : 'Feel more in control with one place for all your reminders. Keeply stays a tap away, with helpful notifications for your approaching deadlines.'}</p>{!claimed && <p>{!installed && 'Install Keeply and turn on notifications to receive a gift of 2 permanent free alert slots. '}They stay yours permanently. Claim once per account.</p>}</div>
        <button type="button" className="button primary" onClick={open}>{actionLabel} <ArrowRight size={16} aria-hidden="true" /></button>
        {dashboard && <button type="button" className={'icon-button ' + styles.dismiss} aria-label="Dismiss setup card for this session" onClick={dismiss}><X size={18} /></button>}
      </section>}
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onClose={chooseDevice}>
      <div className={styles.header}><span className="eyebrow">{directNotifications ? readyToClaim || claimed ? 'YOUR FREE GIFT' : 'YOUR DEADLINES, IN SIGHT' : device ? `STEP ${step + 1} OF ${steps.length + 1}` : 'A LITTLE CLOSER TO KEEPLY'}</span><button type="button" className="icon-button" aria-label="Close device setup guide" onClick={() => dialog.current?.close()}><X size={21} /></button></div>
      {device && <progress className={styles.progress} value={step + 1} max={steps.length + 1} aria-label="Setup guide progress" />}
      <h2 id={titleId} ref={heading} tabIndex={-1}>{notifications ? claimed ? 'Your 2 permanent free slots are included.' : readyToClaim ? 'Claim your gift of 2 permanent free slots.' : 'Never miss a deadline by turning on your notifications.' : !device ? 'Where would you like to add Keeply?' : current.title}</h2>
      {!device && !notifications ? <>
        <p className={styles.description}>Choose the device you want help with. You can follow along here, even if you’re setting up a different device.</p>
        <div className={styles.choices}>{([['ios', 'iPhone or iPad', 'Guide with screenshots'], ['android', 'Android', 'Step-by-step text guide'], ['computer', 'Computer', 'Windows, Mac, Chromebook or Linux']] as const).map(([key, label, hint]) => <button type="button" className={styles.choice} key={key} onClick={() => { setDevice(key); go(0); }}>{key === 'computer' ? <Monitor size={24} aria-hidden="true" /> : <Smartphone size={24} aria-hidden="true" />}<span><strong>{label}</strong><small>{hint}</small></span><ArrowRight size={18} aria-hidden="true" /></button>)}</div>
        <p className="hint">{claimed ? 'Your 2 permanent free slots are already included and available across your devices.' : 'Complete installation and notification setup on the same device to claim 2 extra alert slots. They stay yours permanently.'}</p>
      </> : notifications ? <>
        <p className={styles.description}>{claimed ? 'Your gift stays yours permanently, with all your reminders together in one place. Keeply is here to help you stay ahead of approaching deadlines.' : readyToClaim ? 'Your reminders are together in one place, and notifications are ready to help you stay ahead of approaching deadlines. Your gift stays yours permanently.' : directNotifications ? 'Keep all your reminders in one place and stay ahead of approaching deadlines. Tap Turn on notifications, then choose Allow to receive helpful reminders and your gift of 2 permanent free alert slots.' : 'Open Keeply from its new icon. Tap Turn on notifications below, then choose Allow to stay ahead of approaching deadlines and receive your gift of 2 permanent free alert slots.'}</p>
        {!directNotifications && <p className="hint">Setting up another device? Open Settings → Alert Options in its installed Keeply app to finish there. The buttons below control the device you’re using right now.</p>}
        <PushOptions publicKey={publicKey} showReward rewardClaimed={claimed} setupFlow onConnectedChange={setDeviceConnected} />
      </> : <>
        <p className={styles.description}>{current.text}</p>
        {current.image && <figure className={styles.figure}><a href={current.image} target="_blank" rel="noopener noreferrer" aria-label="Open screenshot at full size"><Image src={current.image} alt={current.alt || current.title} width={600} height={1100} sizes="(max-width: 600px) 85vw, 420px" className={styles.screenshot} /></a><figcaption>Look for the control circled in red. Tap the image to enlarge it.</figcaption></figure>}
        {current.hint && <p className={'alert info ' + styles.hint}>{current.hint}</p>}
      </>}
      {device && !notifications && <button type="button" className="text-button spaced" onClick={() => go(steps.length)}>Already installed? Set up notifications →</button>}
      <div className={styles.footer}>{directNotifications ? <>
        <button type="button" className="text-button" onClick={chooseDevice}>Set up another device</button>
        <button type="button" className="button secondary" onClick={() => dialog.current?.close()}>Done</button>
      </> : device ? <>
        <button type="button" className="button secondary" onClick={() => step ? go(step - 1) : setDevice(null)}>Back</button>
        {!notifications && <button type="button" className="button primary" onClick={() => go(step + 1)}>Next <ArrowRight size={16} aria-hidden="true" /></button>}
        {notifications && <button type="button" className="button secondary" onClick={() => dialog.current?.close()}>Done</button>}
      </> : <button type="button" className="text-button" onClick={() => dialog.current?.close()}>Maybe later</button>}</div>
    </dialog>
  </>;
}
