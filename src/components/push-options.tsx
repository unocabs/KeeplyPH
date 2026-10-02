'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Smartphone } from 'lucide-react';
import { pushDeviceStatus, registerPushSubscription, removePushSubscription, sendPushTest } from '@/features/alerts/push-actions';
import type { PushDeviceStatus } from '@/lib/push-subscription';

function applicationKey(value: string): Uint8Array<ArrayBuffer> {
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}
function browserSupport(): 'supported' | 'unsupported' | 'home-screen' {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  if (ios && !installed) return 'home-screen';
  return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window ? 'supported' : 'unsupported';
}
function subscribeBrowserState(update: () => void) {
  const media = matchMedia('(display-mode: standalone)');
  window.addEventListener('focus', update); window.addEventListener('keeply-push-permission', update); media.addEventListener('change', update);
  return () => { window.removeEventListener('focus', update); window.removeEventListener('keeply-push-permission', update); media.removeEventListener('change', update); };
}
const browserPermission = () => 'Notification' in window ? Notification.permission : 'default';
export function PushOptions({ publicKey, initialCount = 0, demo = false }: { publicKey: string | null; initialCount?: number; demo?: boolean }) {
  const support = useSyncExternalStore(subscribeBrowserState, browserSupport, () => 'checking');
  const permission = useSyncExternalStore(subscribeBrowserState, browserPermission, () => 'default');
  const [status, setStatus] = useState<PushDeviceStatus>({ enabled: false, registered: false, deviceCount: initialCount });
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const worker = useRef<ServiceWorkerRegistration | null>(null);
  useEffect(() => {
    let live = true;
    if (support !== 'supported' || demo || !publicKey) return;
    async function check() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
        await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        const state = await pushDeviceStatus(subscription?.endpoint || null);
        if (live) { worker.current = registration; setStatus(state); setReady(true); }
      } catch { if (live) setError('Unable to check notification setup. Reload the page to try again.'); }
    }
    void check();
    const focus = () => { if (live) { void check(); } };
    window.addEventListener('focus', focus);
    return () => { live = false; window.removeEventListener('focus', focus); };
  }, [publicKey, demo, support]);

  async function enable() {
    if (demo) { setMessage('Sign in to enable notifications on your own device. This sample does not request permission.'); return; }
    if (!publicKey || !worker.current) return;
    // Request permission directly from the user's click, before any server/network work.
    const permissionRequest = Notification.permission === 'default' ? Notification.requestPermission() : Promise.resolve(Notification.permission);
    setBusy(true); setError(''); setMessage('');
    let created: PushSubscription | null = null;
    try {
      const result = await permissionRequest; window.dispatchEvent(new Event('keeply-push-permission'));
      if (result !== 'granted') { setError(result === 'denied' ? 'Notifications are blocked. Allow them in your browser or device settings, then return here.' : 'Permission was not granted. You can try again whenever you’re ready.'); return; }
      const key = applicationKey(publicKey);
      let subscription = await worker.current.pushManager.getSubscription();
      if (subscription && subscription.options.applicationServerKey && Array.from(new Uint8Array(subscription.options.applicationServerKey)).join(',') !== Array.from(key).join(',')) {
        const removed = await removePushSubscription(subscription.endpoint);
        if (removed.error) throw new Error(removed.error);
        await subscription.unsubscribe(); subscription = null;
      }
      if (!subscription) { subscription = await worker.current.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }); created = subscription; }
      const saved = await registerPushSubscription(subscription.toJSON());
      if (saved.error) throw new Error(saved.error);
      created = null;
      setStatus(await pushDeviceStatus(subscription.endpoint)); setMessage('Web push is enabled on this device. Send a test to check your notifications.');
    } catch (cause) {
      // Roll back a newly-created local subscription if the account could not save it.
      if (created) await created.unsubscribe().catch(() => false);
      setError(cause instanceof Error ? cause.message : 'Unable to enable notifications. Please try again.');
    } finally { setBusy(false); }
  }
  async function disable() {
    setBusy(true); setError(''); setMessage('');
    try {
      const subscription = await worker.current?.pushManager.getSubscription();
      if (!subscription) { setStatus(await pushDeviceStatus(null)); return; }
      const removed = await removePushSubscription(subscription.endpoint);
      if (removed.error) throw new Error(removed.error);
      await subscription.unsubscribe(); setStatus(await pushDeviceStatus(null));
      setMessage('Web push is off on this device. Other connected devices keep their own settings.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to turn off notifications. Please try again.'); }
    finally { setBusy(false); }
  }
  async function test() {
    setBusy(true); setError(''); setMessage('');
    try {
      const subscription = await worker.current?.pushManager.getSubscription();
      if (!subscription) throw new Error('Enable web push on this device first.');
      const result = await sendPushTest(subscription.endpoint);
      if (result.error) { setError(result.error); setStatus(await pushDeviceStatus(subscription.endpoint)); }
      else setMessage(result.success || 'Test sent.');
    } catch { setError('Unable to send the test. Please try again.'); } finally { setBusy(false); }
  }
  const connected = status.enabled && status.registered;
  return <section className="push-options spaced" aria-labelledby="push-heading">
    <h3 id="push-heading"><Smartphone size={18} aria-hidden="true"/> Web push notifications</h3>
    <p className="section-description">Get a heads-up on this device, even when Keeply is closed. Push follows the same alert timings and coverage as email.</p>
    {support === 'checking' && <p className="hint spaced">Checking this browser…</p>}
    {support === 'home-screen' && <p className="alert info spaced">On iPhone or iPad, use Share → Add to Home Screen, then open Keeply from that icon and enable web push here. Requires iOS or iPadOS 16.4 or later.</p>}
    {support === 'unsupported' && <p className="alert info spaced">This browser does not support web push here. Try a supported browser on HTTPS, or keep email enabled.</p>}
    {!publicKey && !demo && <p className="alert info spaced">Web push is not available yet. Email reminders remain available.</p>}
    {support === 'supported' && permission === 'denied' && <p className="alert info spaced">Notifications are blocked in this browser. Allow them in browser or device settings to reconnect.</p>}
    {status.deviceCount > 0 && <p className="hint spaced">{status.deviceCount} connected {status.deviceCount === 1 ? 'device' : 'devices'}{connected ? ' · This device is connected' : ' · This device is not connected'}.</p>}
    {support === 'supported' && (publicKey || demo) && <div className="push-actions spaced">
      {connected ? <><button type="button" className="button secondary" disabled={busy} onClick={()=>void test()}>Send test notification</button><button type="button" className="text-button" disabled={busy} onClick={()=>void disable()}>Turn off this device</button></> : <button type="button" className="button secondary" disabled={busy || (!demo && (!ready || permission === 'denied'))} onClick={()=>void enable()}>{busy ? 'Connecting…' : 'Enable web push on this device'}</button>}
    </div>}
    <p className="hint spaced">You choose which devices receive alerts. Notifications can show reminder names on your lock screen; device settings can silence or delay them.</p>
    {error && <p className="alert error spaced" role="alert">{error}</p>}{message && <p className="alert success spaced" role="status">{message}</p>}
  </section>;
}
