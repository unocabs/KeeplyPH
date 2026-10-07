import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), origin: vi.fn(), configured: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ adminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock('@/lib/security', () => ({ checkOrigin: mocks.origin }));
vi.mock('@/lib/env', () => ({ isConfigured: mocks.configured }));
import { GET, POST } from '@/app/api/reactions/route';
const id = '11111111-1111-4111-8111-111111111111';
const request = (body: string, type = 'application/json') => new Request('https://www.keeplyph.com/api/reactions', { method: 'POST', headers: { 'Content-Type': type }, body });
describe('public calculator reactions', () => {
 beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('PUBLIC_REACTIONS_ENABLED', 'true'); mocks.origin.mockReturnValue(true); mocks.configured.mockReturnValue(true); mocks.rpc.mockResolvedValue({ data: true, error: null }); });
 it('hides the controls when disabled or the migration is missing', async () => {
  vi.stubEnv('PUBLIC_REACTIONS_ENABLED', 'false'); expect(await (await GET()).json()).toEqual({ available: false }); expect(mocks.rpc).not.toHaveBeenCalled();
  vi.stubEnv('PUBLIC_REACTIONS_ENABLED', 'true'); mocks.rpc.mockResolvedValue({ error: { message: 'missing function' } }); expect(await (await GET()).json()).toEqual({ available: false });
 });
 it('fails closed if readiness throws', async () => { mocks.rpc.mockRejectedValue(new Error('offline')); expect(await (await GET()).json()).toEqual({ available: false }); });
 it('acknowledges a saved reaction without collecting plate or account data', async () => {
  const response = await POST(request(JSON.stringify({ id, reaction: 'helpful' })));
  expect(response.status).toBe(200); expect(await response.json()).toEqual({ saved: true });
  expect(mocks.rpc).toHaveBeenCalledWith('record_public_reaction', { p_id: id, p_reaction: 'helpful' });
 });
 it('rejects foreign origins and disabled writes', async () => {
  mocks.origin.mockReturnValue(false); expect((await POST(request('{}'))).status).toBe(403);
  mocks.origin.mockReturnValue(true); vi.stubEnv('PUBLIC_REACTIONS_ENABLED', 'false'); expect((await POST(request('{}'))).status).toBe(503); expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it('rejects malformed input, unsupported emojis, extra personal fields and oversized bodies', async () => {
  for (const body of ['{', JSON.stringify({ id, reaction: 'sad' }), JSON.stringify({ id: 'invalid', reaction: 'love' }), JSON.stringify({ id, reaction: 'love', plate: 'ABC1234' })]) expect((await POST(request(body))).status).toBe(400);
  expect((await POST(request('x'.repeat(513)))).status).toBe(413);
  expect((await POST(request('{}', 'text/plain'))).status).toBe(415); expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it('does not pretend database errors, rate limits or network failures succeeded', async () => {
  mocks.rpc.mockResolvedValue({ error: { message: 'database unavailable' } }); expect((await POST(request(JSON.stringify({ id, reaction: 'easy' })))).status).toBe(503);
  mocks.rpc.mockResolvedValue({ error: { message: 'RATE_LIMITED' } }); expect((await POST(request(JSON.stringify({ id, reaction: 'easy' })))).status).toBe(429);
  mocks.rpc.mockRejectedValue(new Error('offline')); expect((await POST(request(JSON.stringify({ id, reaction: 'easy' })))).status).toBe(503);
 });
});
