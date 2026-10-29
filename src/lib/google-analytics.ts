// Only curated events and static route labels may be sent to Google.
export const analyticsEvents = ['calculator_anchor_click', 'check_schedule', 'set_reminder_click', 'calculator_result', 'calculator_error', 'sample_account_open', 'reminder_saved'] as const;
export type AnalyticsEvent = typeof analyticsEvents[number];
export const analyticsSurfaces = ['home', 'guide_hero', 'guide_navigation', 'guide_overview', 'calculator', 'guide_faq', 'guide_costs', 'guide_footer', 'public_page', 'app'] as const;
export type AnalyticsSurface = typeof analyticsSurfaces[number];
const publicPages = new Set(['/', '/bill-tracker', '/pricing', '/loan-payment-reminder', '/warranty-tracker', '/vehicle-registration-reminder', '/lto-registration-renewal', '/aircon-cleaning-schedule', '/document-expiry-tracker', '/privacy', '/terms', '/login', '/add', '/account-deleted']);
const privatePages = new Set(['/dashboard', '/items', '/items/payments', '/items/review', '/purchases', '/purchases/new', '/planner', '/checkup', '/settings', '/settings/billing', '/settings/alerts', '/feedback']);
const templates = new Set(['receipt', 'car', 'motorcycle', 'licence', 'passport', 'aircon', 'other']);
export const consentKey = 'keeply.google-analytics-consent.v1';
const consentLifetime = 180 * 24 * 60 * 60 * 1000;
export function readAnalyticsChoice(raw: string | null, now = Date.now()): 'granted' | 'denied' | null {
  try {
    const value = JSON.parse(raw || 'null');
    return value && ['granted', 'denied'].includes(value.choice) && Number.isFinite(value.at) && value.at <= now && now - value.at < consentLifetime ? value.choice : null;
  } catch { return null; }
}
export function analyticsPage(pathname: string): { path: string; private: boolean } | null {
  if (publicPages.has(pathname)) return { path: pathname, private: false };
  if (privatePages.has(pathname)) return { path: pathname, private: true };
  if (pathname.startsWith('/add/') && templates.has(pathname.slice(5))) return { path: pathname, private: true };
  if (/^\/items\/[0-9a-f-]{36}(\/edit)?$/i.test(pathname)) return { path: pathname.endsWith('/edit') ? '/items/record/edit' : '/items/record', private: true };
  if (/^\/purchases\/[0-9a-f-]{36}(\/edit)?$/i.test(pathname)) return { path: pathname.endsWith('/edit') ? '/purchases/record/edit' : '/purchases/record', private: true };
  if (pathname === '/demo' || pathname.startsWith('/demo/')) return { path: '/demo', private: false };
  return null;
}
export function analyticsReferrer(referrer: string, origin: string): string {
  try {
    const url = new URL(referrer);
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    return url.origin === origin ? origin + (analyticsPage(url.pathname)?.path || '/') : url.origin + '/';
  } catch { return ''; }
}
type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window { dataLayer?: unknown[]; gtag?: Gtag; }
}
let active = false;
let currentPage = '';
let currentPrivate = false;
export function setAnalyticsActive(enabled: boolean, path = '', isPrivate = false) {
  active = enabled; currentPage = path; currentPrivate = isPrivate;
}
export function trackAnalytics(event: AnalyticsEvent, surface: AnalyticsSurface = 'public_page') {
  if (typeof window === 'undefined' || !active || !window.gtag || !analyticsEvents.includes(event) || !analyticsSurfaces.includes(surface)) return;
  // Signed-in save events must additionally pass the account preference gate.
  if (event === 'reminder_saved' && !currentPrivate) return;
  try { window.gtag('event', event, { surface, page_path: currentPage }); } catch { /* Measurement never interrupts the household task. */ }
}
