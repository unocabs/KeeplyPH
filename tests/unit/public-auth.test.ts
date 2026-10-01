import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const session = vi.hoisted(() => ({ configured: vi.fn(), claims: vi.fn(), client: vi.fn() }));
vi.mock('@/lib/env', () => ({ isConfigured: session.configured }));
vi.mock('@/lib/supabase/server', () => ({ serverClient: session.client }));
import { isSignedIn } from '@/lib/auth';

beforeEach(() => {
  vi.resetAllMocks();
  session.configured.mockReturnValue(true);
  session.client.mockResolvedValue({ auth: { getClaims: session.claims } });
});

describe('Public navigation session detection', () => {
  it('recognizes a verified signed-in session', async () => {
    session.claims.mockResolvedValue({ data: { claims: { sub: 'user-id' } }, error: null });
    expect(await isSignedIn()).toBe(true);
  });
  it('keeps the sign-in option when there is no session', async () => {
    session.claims.mockResolvedValue({ data: null, error: null });
    expect(await isSignedIn()).toBe(false);
  });
  it('rejects claims when verification fails', async () => {
    session.claims.mockResolvedValue({ data: { claims: { sub: 'user-id' } }, error: new Error('Expired') });
    expect(await isSignedIn()).toBe(false);
  });
  it('supports previews without Supabase configuration', async () => {
    session.configured.mockReturnValue(false);
    expect(await isSignedIn()).toBe(false);
    expect(session.client).not.toHaveBeenCalled();
  });
});
