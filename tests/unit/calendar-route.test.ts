import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' as string | null, configured: true, rows: {} as Record<string, { data: unknown; error: unknown }>, filters: [] as [string, string, unknown][] }));
vi.mock('@/lib/env', () => ({ isConfigured: () => mocks.configured, appUrl: () => 'http://localhost:3000' }));
vi.mock('@/lib/supabase/server', () => ({ serverClient: async () => ({
  auth: { getClaims: async () => ({ data: mocks.user ? { claims: { sub: mocks.user } } : null, error: null }) },
  from: (table: string) => { const query = { select: () => query, eq: (key: string, value: unknown) => { mocks.filters.push([table, key, value]); return query; }, single: async () => mocks.rows[table] }; return query; },
}) }));
import { GET } from '@/app/api/items/[id]/calendar/route';
const id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', date = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', occurrence = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const request = () => new Request(`https://keeplyph.com/api/items/${id}/calendar?date=${date}&occurrence=${occurrence}`);
const params = () => ({ params: Promise.resolve({ id }) });
beforeEach(() => { mocks.user = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; mocks.configured = true; mocks.filters = []; mocks.rows = {
  items: { data: { id, product_name: 'Payment' }, error: null }, important_dates: { data: { id: date, label: 'Installment' }, error: null }, date_occurrences: { data: { id: occurrence, due_on: '2026-10-12' }, error: null },
}; });
describe('private calendar downloads', () => {
  it('rejects signed-out access and malformed IDs without privately caching errors', async () => {
    mocks.user = null;
    const response = await GET(request(), params());
    expect(response.status).toBe(401); expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect((await GET(new Request('https://keeplyph.com/api/items/invalid/calendar'), { params: Promise.resolve({ id: 'invalid' }) })).status).toBe(400);
  });
  it('checks ownership and relationships for every row, and rejects another owner or stale occurrence', async () => {
    mocks.rows.items = { data: null, error: { message: 'not owned' } };
    expect((await GET(request(), params())).status).toBe(404);
    for (const table of ['items', 'important_dates', 'date_occurrences']) expect(mocks.filters).toContainEqual([table, 'user_id', mocks.user]);
    expect(mocks.filters).toContainEqual(['important_dates', 'item_id', id]);
    expect(mocks.filters).toContainEqual(['date_occurrences', 'date_id', date]);
    expect(mocks.filters).toContainEqual(['date_occurrences', 'status', 'open']);
  });
  it('returns a safe private UTF-8 attachment using a canonical HTTPS link without requiring coverage', async () => {
    const response = await GET(request(), params());
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8');
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="Payment.ics"');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Vary')).toBe('Cookie, Authorization');
    const content = (await response.text()).replace(/\r\n /g, '');
    expect(content).toContain(`URL:https://keeplyph.com/items/${id}?date=${date}`);
    expect(content).toContain('DTSTART;VALUE=DATE:20261012');
    expect(mocks.filters.some(([, key]) => key.includes('coverage'))).toBe(false);
  });
});
