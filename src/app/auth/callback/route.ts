import { safeAuthIntent } from '@/lib/auth-intent';
import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';
import { appUrl } from '@/lib/env';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeAuthIntent(url.searchParams.get('next'));
  if (code) {
    const supabase = await serverClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(appUrl() + next, { headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.redirect(appUrl() + '/login?error=callback&next=' + encodeURIComponent(next));
}
