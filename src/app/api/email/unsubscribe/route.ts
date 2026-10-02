import { adminClient } from '@/lib/supabase/admin';
import { verifyUnsubscribeToken } from '@/lib/email-unsubscribe';
import { emailLayout, escapeHtml } from '@/lib/email-layout';
import { appUrl } from '@/lib/env';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex', 'Content-Type': 'text/html; charset=utf-8' };
function claims(request: Request) { return verifyUnsubscribeToken(new URL(request.url).searchParams.get('token') || ''); }
export async function GET(request: Request) {
  try {
    if (!claims(request)) return new Response('This unsubscribe link is invalid.', { status: 400, headers });
    const token = new URL(request.url).searchParams.get('token')!;
    const action = appUrl() + '/api/email/unsubscribe?token=' + encodeURIComponent(token);
    return new Response(emailLayout({ url: appUrl(), preview: 'Choose whether to stop Reminder ideas & tips.', eyebrow: 'Your email preferences', heading: 'A little less in your inbox?', body: '<p>Unsubscribe from Reminder ideas & tips. Your saved reminders and deadline alert preferences stay as you chose them.</p><form method="post" action="' + escapeHtml(action) + '"><button type="submit" style="background:#6153ca;color:white;border:0;border-radius:12px;padding:16px 24px;font:700 16px Arial;cursor:pointer">Unsubscribe from ideas & tips</button></form>', reason: 'Opening this page does not change your preferences.' }), { headers });
  } catch { return new Response('Email preferences are temporarily unavailable. Please try again.', { status: 503, headers }); }
}
export async function POST(request: Request) {
  try {
    const data = claims(request);
    if (!data) return new Response('This unsubscribe link is invalid.', { status: 400, headers });
    const { error } = await adminClient().rpc('unsubscribe_reminder_ideas', { p_user: data.user, p_enrollment: data.enrollment });
    if (error) return new Response('Please try again.', { status: 503, headers });
    // RFC 8058 clients submit the standard body and expect a blank success response.
    if ((await request.text()).trim() === 'List-Unsubscribe=One-Click') return new Response(null, { status: 200, headers });
    return new Response(emailLayout({ url: appUrl(), preview: 'Your email preference has been updated.', eyebrow: 'Your email preferences', heading: 'Your preference has been updated', body: '<p>Reminder ideas & tips are turned off for the enrollment linked to this email. Your deadline alert preferences stay as you chose them. You can review your current preferences in Alert Options.</p>', reason: 'You can choose Reminder ideas & tips again in Alert Options.' }), { headers });
  } catch { return new Response('Email preferences are temporarily unavailable. Please try again.', { status: 503, headers }); }
}
