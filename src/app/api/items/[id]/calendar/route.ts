import { serverClient } from '@/lib/supabase/server';
import { appUrl, isConfigured } from '@/lib/env';
import { uuidSchema } from '@/lib/validation';
import { calendarEvent, calendarFilename } from '@/features/items/calendar';
const privateHeaders = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization', 'X-Content-Type-Options': 'nosniff' };
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const query = new URL(request.url).searchParams;
  const dateId = query.get('date'), occurrenceId = query.get('occurrence');
  const failure = (message: string, status: number) => new Response(message, { status, headers: privateHeaders });
  if (![id, dateId, occurrenceId].every(value => uuidSchema.safeParse(value).success)) return failure('Invalid date.', 400);
  if (!isConfigured()) return failure('Sign in to export this date.', 401);
  const supabase = await serverClient();
  const { data: claims, error: authError } = await supabase.auth.getClaims();
  if (authError || !claims?.claims.sub) return failure('Sign in to export this date.', 401);
  const owner = claims.claims.sub;
  const { data: item, error: itemError } = await supabase.from('items').select('id,product_name').eq('id', id).eq('user_id', owner).eq('state', 'saved').single();
  const { data: date, error: dateError } = await supabase.from('important_dates').select('id,label').eq('id', dateId!).eq('item_id', id).eq('user_id', owner).single();
  const { data: occurrence, error: occurrenceError } = await supabase.from('date_occurrences').select('id,due_on').eq('id', occurrenceId!).eq('date_id', dateId!).eq('user_id', owner).eq('status', 'open').single();
  if (itemError || dateError || occurrenceError || !item || !date || !occurrence) return failure('Date not found. Refresh this reminder.', 404);
  // Local development still exports a canonical HTTPS production link.
  const origin = appUrl().startsWith('https://') ? appUrl() : 'https://keeplyph.com';
  const url = `${origin}/items/${id}?date=${date.id}`;
  return new Response(calendarEvent({ occurrenceId: occurrence.id, dueOn: occurrence.due_on, product: item.product_name || 'Keeply reminder', label: date.label, url }), {
    headers: { ...privateHeaders, 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="${calendarFilename(item.product_name || 'Keeply reminder')}"` },
  });
}
