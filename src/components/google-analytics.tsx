'use client';
import Script from 'next/script';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { analyticsPage, analyticsReferrer, analyticsSurfaces, consentKey, readAnalyticsChoice, setAnalyticsActive, trackAnalytics, type AnalyticsSurface } from '@/lib/google-analytics';
import styles from './google-analytics.module.css';

const choiceChanged = 'keeply-analytics-choice';
const openChoices = 'keeply-open-analytics-choices';
let choicesOpener: HTMLButtonElement | null = null;
let sessionChoice = 'null';
function consentSnapshot() {
  try { return 'saved:' + (localStorage.getItem(consentKey) || 'null'); }
  catch { return 'session:' + sessionChoice; }
}
function subscribeToChoice(callback: () => void) {
  const sync = (event: StorageEvent) => { if (event.key === consentKey || event.key === null) callback(); };
  window.addEventListener('storage', sync);
  window.addEventListener(choiceChanged, callback);
  return () => { window.removeEventListener('storage', sync); window.removeEventListener(choiceChanged, callback); };
}
const serverConsentSnapshot = () => '';

export function AnalyticsChoicesButton() {
  const snapshot = useSyncExternalStore(subscribeToChoice, consentSnapshot, serverConsentSnapshot);
  const choice = readAnalyticsChoice(snapshot.slice(snapshot.indexOf(':') + 1));
  return <div className={styles.control}>
    <p role="status">{snapshot === '' ? 'Loading browser choice…' : choice === 'granted' ? 'Analytics allowed in this browser.' : choice === 'denied' ? 'Analytics declined in this browser.' : 'No analytics choice saved in this browser.'}</p>
    <button type="button" className="button secondary" disabled={snapshot === ''} aria-controls="analytics-choices" onClick={event => {
      choicesOpener = event.currentTarget;
      window.dispatchEvent(new Event(openChoices));
    }}>Analytics choices</button>
  </div>;
}

function clearAnalyticsCookies() {
  const domains = location.hostname.split('.');
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.trim().split('=')[0];
    if (!/^_ga(?:_|$)/.test(name)) continue;
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    for (let index = 0; index < domains.length - 1; index++) document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${domains.slice(index).join('.')}; SameSite=Lax`;
  }
}

export function GoogleAnalytics({ measurementId, nonce, accountAllowed }: { measurementId: string; nonce: string; accountAllowed: boolean }) {
  const pathname = usePathname();
  const snapshot = useSyncExternalStore(subscribeToChoice, consentSnapshot, serverConsentSnapshot);
  const choice = readAnalyticsChoice(snapshot.slice(snapshot.indexOf(':') + 1));
  const loaded = snapshot !== '';
  const [editing, setEditing] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const storageFailed = snapshot.startsWith('session:');
  const lastView = useRef('');
  const initialized = useRef(false);
  const route = analyticsPage(pathname);
  const allowed = choice === 'granted' && Boolean(route) && (!route?.private || accountAllowed);
  useEffect(() => {
    const open = () => setEditing(true);
    window.addEventListener(openChoices, open);
    // A Settings control may hydrate before this suspended integration finishes.
    if (choicesOpener) open();
    return () => window.removeEventListener(openChoices, open);
  }, []);
  useEffect(() => { if (editing && loaded) heading.current?.focus({ preventScroll: true }); }, [editing, loaded]);
  useEffect(() => {
    const page = analyticsPage(pathname);
    // Disable collection before changing consent or navigating to an excluded route.
    const flags = window as unknown as Record<string, unknown>;
    flags['ga-disable-' + measurementId] = !allowed;
    setAnalyticsActive(false);
    if (!allowed || !page) {
      window.gtag?.('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      lastView.current = '';
      if (choice !== 'granted') clearAnalyticsCookies();
      return;
    }
    window.dataLayer ||= [];
    // Google's command queue requires an Arguments object, rather than a dataLayer event object.
    // eslint-disable-next-line prefer-rest-params
    window.gtag ||= function () { window.dataLayer!.push(arguments); };
    const safePage = { page_location: location.origin + page.path, page_title: 'Keeply ' + page.path, page_referrer: analyticsReferrer(document.referrer, location.origin) };
    window.gtag('set', safePage);
    if (!initialized.current) {
      window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
      window.gtag('js', new Date());
      initialized.current = true;
    } else window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('config', measurementId, { ...safePage, send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_expires: 7776000 });
    if (lastView.current !== page.path) {
      // Only campaign slugs from public landing URLs are permitted, never the raw query.
      const campaign: Record<string, string> = {};
      if (!page.private) for (const [query, field] of [['utm_source', 'campaign_source'], ['utm_medium', 'campaign_medium'], ['utm_campaign', 'campaign_name']]) {
        const value = new URLSearchParams(location.search).get(query);
        if (value && /^[a-z0-9][a-z0-9_-]{0,49}$/i.test(value)) campaign[field] = value;
      }
      window.gtag('event', 'page_view', { ...safePage, ...campaign });
      lastView.current = page.path;
    }
    setAnalyticsActive(true, page.path, page.private);
    const click = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null;
      if (!link || event.defaultPrevented) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      const surface = link.closest('[data-analytics-surface]')?.getAttribute('data-analytics-surface');
      const source: AnalyticsSurface = analyticsSurfaces.includes(surface as AnalyticsSurface) ? surface as AnalyticsSurface : pathname === '/' ? 'home' : page.private ? 'app' : 'public_page';
      if (url.pathname === '/lto-registration-renewal' && url.hash === '#renewal-calculator') trackAnalytics('calculator_anchor_click', source);
      if (link.dataset.analyticsEvent === 'set_reminder_click') trackAnalytics('set_reminder_click', source);
      if (url.pathname === '/demo' || url.pathname.startsWith('/demo/')) trackAnalytics('sample_account_open', source);
    };
    // Capture before Next Link handles the navigation and prevents its default action.
    document.addEventListener('click', click, true);
    return () => { setAnalyticsActive(false); document.removeEventListener('click', click, true); };
  }, [allowed, measurementId, pathname, choice]);

  function closeChoices() {
    setEditing(false);
    if (choicesOpener?.isConnected) choicesOpener.focus({ preventScroll: true });
    choicesOpener = null;
  }
  function choose(next: 'granted' | 'denied') {
    if (next === 'denied') {
      (window as unknown as Record<string, unknown>)['ga-disable-' + measurementId] = true;
      setAnalyticsActive(false);
      clearAnalyticsCookies();
    }
    sessionChoice = JSON.stringify({ choice: next, at: Date.now() });
    try { localStorage.setItem(consentKey, sessionChoice); } catch { /* Use the browser session when persistent storage is blocked. */ }
    window.dispatchEvent(new Event(choiceChanged));
    closeChoices();
  }
  const showChoices = loaded && (choice === null || editing);
  return <>
    {allowed && <Script id="keeply-google-analytics" src={'https://www.googletagmanager.com/gtag/js?id=' + measurementId} nonce={nonce} strategy="afterInteractive" />}
    {showChoices && <section id="analytics-choices" className={styles.banner} aria-labelledby="analytics-heading">
      <div><h2 id="analytics-heading" ref={heading} tabIndex={-1}>Help us improve Keeply?</h2><p>Allow optional Google Analytics cookies to understand visits, calculator use and saves. We exclude household details. Signed-in actions also follow Help improve Keeply in Settings. <Link href="/privacy#google-analytics">Privacy details</Link></p>{storageFailed && <p>Your browser could not remember this choice. It applies to this page session.</p>}</div>
      <div className={styles.actions}><button type="button" className="button secondary" onClick={() => choose('denied')}>Decline analytics</button><button type="button" className="button primary" onClick={() => choose('granted')}>Allow analytics</button>{editing && choice !== null && <button type="button" className="text-button" onClick={closeChoices}>Close</button>}</div>
    </section>}
  </>;
}
