import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoPlan, DEMO_PLAN_COOKIE } from '@/lib/demo-plan';
import { sampleItems, sampleUsage } from '@/lib/demo';

const { setCookie, cookieStore } = vi.hoisted(() => {
  const setCookie = vi.fn();
  return { setCookie, cookieStore: vi.fn(async () => ({ set: setCookie })) };
});
vi.mock('next/headers', () => ({ cookies: cookieStore }));

import { changeDemoPlan } from '@/app/demo/actions';

beforeEach(() => { vi.clearAllMocks(); setCookie.mockReset(); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('sample plan comparison', () => {
  it('preserves existing Premium sample entry points and ignores unknown preferences', () => {
    expect(demoPlan('free')).toBe('free');
    for (const value of [undefined, null, 'premium', 'paid', ['free'], 'FREE']) expect(demoPlan(value)).toBe('premium');
  });

  it('changes only sample planning access, keeping the same records, alerts and totals', () => {
    const today = '2026-10-30', items = sampleItems(today);
    const free = sampleUsage(items, today, 'free'), premium = sampleUsage(items, today, 'premium');
    expect(free.household_premium).toBe(false);
    expect(premium.household_premium).toBe(true);
    expect({ ...free, household_premium: true }).toEqual(premium);
  });

  it('stores a session preference scoped to the sample, without creating account access', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(await changeDemoPlan('free')).toEqual({});
    expect(setCookie).toHaveBeenCalledExactlyOnceWith(DEMO_PLAN_COOKIE, 'free', {
      path: '/demo', httpOnly: true, sameSite: 'lax', secure: true,
    });
    expect(await changeDemoPlan('premium')).toEqual({});
    expect(setCookie).toHaveBeenLastCalledWith(DEMO_PLAN_COOKIE, 'premium', expect.objectContaining({ path: '/demo' }));
  });

  it('rejects an invalid selection before changing the preference', async () => {
    expect((await changeDemoPlan('paid')).error).toBeTruthy();
    expect(cookieStore).not.toHaveBeenCalled();
    expect(setCookie).not.toHaveBeenCalled();
  });

  it('reports an unsuccessful switch without claiming the plan changed', async () => {
    setCookie.mockImplementationOnce(() => { throw new Error('Unavailable'); });
    expect(await changeDemoPlan('free')).toEqual({ error: 'The sample plan could not be changed. Try again.' });
  });
});
