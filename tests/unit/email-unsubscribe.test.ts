import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ adminClient: () => ({ rpc: mocks.rpc }) }));
import { unsubscribeToken, verifyUnsubscribeToken } from '@/lib/email-unsubscribe';
import { GET, POST } from '@/app/api/email/unsubscribe/route';
const user = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', enrollment = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
beforeEach(() => { vi.stubEnv('EMAIL_UNSUBSCRIBE_SECRET', 'test-secret-'.repeat(4)); vi.stubEnv('APP_URL', 'https://keeplyph.com'); mocks.rpc.mockReset().mockResolvedValue({ error: null }); });
afterEach(() => vi.unstubAllEnvs());
const request = (method: string, body?: string) => new Request('https://keeplyph.com/api/email/unsubscribe?token=' + unsubscribeToken(user, enrollment), { method, body });
describe('purpose-limited email unsubscribe', () => {
  it('accepts only a valid signed enrollment', () => {
    const token = unsubscribeToken(user, enrollment);
    expect(verifyUnsubscribeToken(token)).toEqual({ user, enrollment, purpose: 'reminder-ideas' });
    expect(verifyUnsubscribeToken(token + 'x')).toBeNull();
    expect(verifyUnsubscribeToken('x'.repeat(1025))).toBeNull();
    vi.stubEnv('EMAIL_UNSUBSCRIBE_SECRET', 'a-different-secret'.repeat(3));
    expect(verifyUnsubscribeToken(token)).toBeNull();
  });
  it('GET and link scanners cannot change a preference', async () => {
    const response = await GET(request('GET'));
    expect(response.status).toBe(200); expect(await response.text()).toContain('method="post"');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer'); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('one-click POST opts out without login and returns blank success', async () => {
    const response = await POST(request('POST', 'List-Unsubscribe=One-Click'));
    expect(response.status).toBe(200); expect(await response.text()).toBe('');
    expect(mocks.rpc).toHaveBeenCalledWith('unsubscribe_reminder_ideas', { p_user: user, p_enrollment: enrollment });
  });
  it('does not acknowledge failed preference writes', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'unavailable' } });
    expect((await POST(request('POST'))).status).toBe(503);
  });
  it('rejects unsigned requests before touching the database', async () => {
    expect((await POST(new Request('https://keeplyph.com/api/email/unsubscribe?token=invalid', { method: 'POST' }))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
