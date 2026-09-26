import Link from 'next/link';
import { Brand } from '@/components/brand';
import { signIn } from '@/features/account/actions';
import { isConfigured } from '@/lib/env';
export const metadata = { title: 'Sign in', robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;
  const configured = isConfigured();
  return <main className="auth-page" id="main-content"><section className="auth-card"><Brand /><h1>A little peace of mind.</h1><p>Your receipts, important dates, and alerts. All in one place, just for you.</p>
    {!configured && <div className="alert info">Keeply is being set up. Google sign-in will be available when the dedicated Supabase project is connected. You can explore the sample preview now.</div>}
    {params.error && <div className="alert error" role="alert">{params.error === 'account' ? 'Your account is unavailable or scheduled for deletion.' : 'We couldn’t finish signing you in. Please try again.'}</div>}
    <form action={signIn}><input type="hidden" name="next" value={params.next || '/dashboard'} /><button className="google-button" disabled={!configured}><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.01v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.35Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59A6 6 0 0 1 12 5.96Z"/></svg>Continue with Google</button></form>
    <Link className="auth-preview-link" href="/demo">Explore a sample account →</Link><p className="auth-footer">By continuing, you agree to our <Link href="/terms">Terms</Link><br />and acknowledge our <Link href="/privacy">Privacy Policy</Link>.</p>
  </section></main>;
}
