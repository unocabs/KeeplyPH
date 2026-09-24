import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isConfigured } from '@/lib/env';
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const development = process.env.NODE_ENV !== 'production';
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : '';
  const csp = [
    "default-src 'self'", "script-src 'self' 'nonce-" + nonce + "' 'strict-dynamic'" + (development ? " 'unsafe-eval'" : ''),
    "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob: " + supabaseOrigin,
    "connect-src 'self' " + supabaseOrigin + (development ? ' ws://localhost:* ws://127.0.0.1:*' : ''),
    "font-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self' https://accounts.google.com https://checkout.paymongo.com " + supabaseOrigin,
    "frame-ancestors 'none'", ...(development ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce); headers.set('Content-Security-Policy', csp);
  let response = NextResponse.next({ request: { headers } });
  if (isConfigured() && !request.nextUrl.pathname.startsWith('/api/') && !request.nextUrl.pathname.startsWith('/demo')) {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      cookies: { getAll: () => request.cookies.getAll(), setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        headers.set('cookie', request.cookies.toString());
        response = NextResponse.next({ request: { headers } });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      } },
    });
    await supabase.auth.getClaims();
  }
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] };
