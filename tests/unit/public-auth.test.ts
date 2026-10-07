import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const session = vi.hoisted(() => ({ configured: vi.fn(), claims: vi.fn(), client: vi.fn() }));
vi.mock('@/lib/env', () => ({ isConfigured: session.configured }));
vi.mock('@/lib/supabase/server', () => ({ serverClient: session.client }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error('redirect:' + path); } }));
import { isSignedIn, requireUser } from '@/lib/auth';
import { googleAccountAvatar } from '@/lib/account-avatar';

beforeEach(() => {
  vi.resetAllMocks();
  session.configured.mockReturnValue(true);
  session.client.mockResolvedValue({ auth: { getClaims: session.claims } });
});

describe('Google account photos', () => {
  it('passes the photo from verified sign-in claims without another auth request', async () => {
    const photo = 'https://lh3.googleusercontent.com/a/photo=s96-c';
    session.claims.mockResolvedValue({ data: { claims: { sub: 'user-id', user_metadata: { avatar_url: photo } } }, error: null });
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { display_name: 'Gian' } }) };
    session.client.mockResolvedValue({ auth: { getClaims: session.claims }, from: vi.fn().mockReturnValue(query) });
    expect(await requireUser()).toMatchObject({ userId: 'user-id', avatarUrl: photo, profile: { display_name: 'Gian' } });
    expect(query.eq).toHaveBeenCalledWith('id', 'user-id');
  });
  it('uses picture when avatar_url is absent or invalid', () => {
    const picture = 'https://lh3.googleusercontent.com/a/photo';
    expect(googleAccountAvatar({ picture })).toBe(picture);
    expect(googleAccountAvatar({ avatar_url: 'invalid', picture })).toBe(picture);
  });
  it('falls back for missing photos and rejects insecure or unrelated hosts', () => {
    for (const metadata of [null, undefined, '', {}, { avatar_url: 42 },
      { avatar_url: 'http://lh3.googleusercontent.com/a/photo' },
      { avatar_url: 'https://googleusercontent.com.attacker.example/photo' },
      { avatar_url: 'https://attackergoogleusercontent.com/photo' },
      { avatar_url: 'https://user:password@lh3.googleusercontent.com/photo' },
      { avatar_url: 'https://lh3.googleusercontent.com:8080/photo' }]) {
      expect(googleAccountAvatar(metadata)).toBeNull();
    }
  });
  it('does not display metadata from an unverified session', async () => {
    session.claims.mockResolvedValue({ data: { claims: { sub: 'user-id', user_metadata: { avatar_url: 'https://lh3.googleusercontent.com/a/photo' } } }, error: new Error('Expired') });
    await expect(requireUser()).rejects.toThrow('redirect:/login');
  });
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
