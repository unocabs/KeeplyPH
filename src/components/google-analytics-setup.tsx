import { headers } from 'next/headers';
import { isSignedIn } from '@/lib/auth';
import { serverClient } from '@/lib/supabase/server';
import { AnalyticsChoicesButton, GoogleAnalytics } from './google-analytics';

function configuredMeasurementId() {
  const measurementId = process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID || '';
  return /^G-[A-Z0-9]+$/.test(measurementId) && process.env.GOOGLE_ANALYTICS_ENABLED === 'true' ? measurementId : null;
}

export function GoogleAnalyticsPreferences({ compact = false }: { compact?: boolean }) {
  if (!configuredMeasurementId()) return null;
  if (compact) return <AnalyticsChoicesButton/>;
  return <section className="panel spaced" id="browser-analytics" aria-labelledby="browser-analytics-heading">
    <h2 id="browser-analytics-heading">Analytics in this browser</h2>
    <p className="section-description">Allow or decline optional Google Analytics for this browser, including the sample account. This is separate from your account’s Help improve Keeply setting.</p>
    <AnalyticsChoicesButton/>
  </section>;
}

export async function GoogleAnalyticsSetup() {
  const measurementId = configuredMeasurementId();
  if (!measurementId) return null;
  let accountAllowed = false;
  try {
    if (await isSignedIn()) {
      const supabase = await serverClient();
      const { data } = await supabase.auth.getClaims();
      if (data?.claims.sub) {
        const { data: profile } = await supabase.from('profiles').select('analytics_enabled').eq('id', data.claims.sub).single();
        accountAllowed = profile?.analytics_enabled === true;
      }
    }
  } catch { /* Keep account measurement off when its preference cannot be checked. */ }
  return <GoogleAnalytics measurementId={measurementId} nonce={(await headers()).get('x-nonce') || ''} accountAllowed={accountAllowed} />;
}
