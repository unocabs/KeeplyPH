import { describe, expect, it } from 'vitest';
import { ltoSchedule } from '@/lib/lto-schedule';

describe('standard LTO plate schedule', () => {
  it('maps the requested car plate to the full August window', () => {
    expect(ltoSchedule('CCC 2398', 2026)).toMatchObject({ month: 'August', start: 22, end: 31 });
    expect(ltoSchedule('98', 2026)).toEqual(ltoSchedule('ccc-2398', 2026));
  });
  it('handles month ends including leap years and zero digits', () => {
    expect(ltoSchedule('02', 2028)).toMatchObject({ month: 'February', end: 29 });
    expect(ltoSchedule('02', 2026)).toMatchObject({ end: 28 });
    expect(ltoSchedule('94', 2026)).toMatchObject({ end: 30 });
    expect(ltoSchedule('00', 2026)).toMatchObject({ month: 'October', start: 22, end: 31 });
  });
  it('covers each weekly boundary and legacy plates', () => {
    for (const [digits, start, end] of [['18',1,7],['38',1,7],['48',8,14],['68',8,14],['78',15,21],['88',15,21]] as const) {
      expect(ltoSchedule(digits, 2026)).toMatchObject({ start, end });
    }
    expect(ltoSchedule('ABC 124', 2026)).toMatchObject({ month: 'April', start: 1, end: 7 });
  });
  it('rejects unsupported plates, extra text and invalid years', () => {
    for (const value of ['', '8', '1234', 'ABC', 'AB 12345', 'CCC2398garbage', 'CCC 23.98']) expect(ltoSchedule(value, 2026)).toBeNull();
    for (const year of [NaN, 0, 2026.5, 2101]) expect(ltoSchedule('98', year)).toBeNull();
  });
});

import { safeRenewalDate, suggestedRenewalDate } from '@/lib/lto-schedule';
import { safeAuthIntent } from '@/lib/auth-intent';
import { addIntent } from '@/features/templates';

it('prefills the window start and preserves only the date through sign-in', () => {
  const date = suggestedRenewalDate('CCC 2398', 2026);
  expect(date).toBe('2026-08-22');
  const intent = addIntent('car', 'registration', undefined, undefined, date);
  expect(safeAuthIntent(intent + '&plate=CCC2398&label=private')).toBe('/add/car?focus=registration&renewalDate=2026-08-22');
  expect(safeAuthIntent(safeAuthIntent(intent))).toBe(intent);
  expect(safeAuthIntent('/add/passport?renewalDate=2026-08-22')).toBe('/add/passport');
  expect(safeAuthIntent('/add/car?focus=insurance&renewalDate=2026-08-22')).toBe('/add/car?focus=insurance');
});
it('rejects malformed and unsupported prefill dates', () => {
  for (const date of ['2026-02-31', '2026-13-01', '2026-11-01', '2026-08-23', '2026-8-22', 'private', '2101-08-22']) expect(safeRenewalDate(date)).toBeUndefined();
  expect(suggestedRenewalDate('not a plate', 2026)).toBeUndefined();
});
