import { headers } from 'next/headers';
import { isSignedIn } from '@/lib/auth';
import { serverClient } from '@/lib/supabase/server';
import { GoogleAnalytics } from './google-analytics';

export async function GoogleAnalyticsSetup() {
  const measurementId = process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID || '';
  if (!/^G-[A-Z0-9]+$/.test(measurementId) || process.env.GOOGLE_ANALYTICS_ENABLED !== 'true') return null;
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
