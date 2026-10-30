import { describe, expect, it } from 'vitest';
import { planAirconCleaning, safeAirconPlan } from '@/lib/aircon-plan';
import { safeAuthIntent } from '@/lib/auth-intent';
import { addIntent } from '@/features/templates';

describe('aircon cleaning plans', () => {
  it('calculates calendar months and clamps end-of-month dates', () => {
    expect(planAirconCleaning('2026-10-29', '4', '2026-10-29')).toEqual({ last: '2026-10-29', plan: { serviceDate: '2027-02-28', serviceInterval: 4 } });
    expect(planAirconCleaning('2023-10-31', '4', '2026-10-29')).toEqual({ last: '2023-10-31', plan: { serviceDate: '2024-02-29', serviceInterval: 4 } });
    expect(planAirconCleaning('2024-02-29', '12', '2026-10-29')).toMatchObject({ plan: { serviceDate: '2025-02-28' } });
  });
  it('keeps a past planned date instead of inventing later visits', () => {
    expect(planAirconCleaning('2020-01-01', '6', '2026-10-29')).toMatchObject({ plan: { serviceDate: '2020-07-01' } });
  });
  it('rejects unknown, impossible, future and unsupported completion dates', () => {
    for (const last of ['', 'unknown', '2026-02-29', '2026-04-31', '2026-10-30', '1899-12-31', '2026-1-01']) {
      expect(planAirconCleaning(last, '4', '2026-10-29')).toMatchObject({ field: 'last' });
    }
  });
  it('requires an explicit whole-month interval and bounds the result', () => {
    for (const interval of ['', '0', '-1', '3.5', '121', 'Infinity', '3e0']) expect(planAirconCleaning('2026-10-29', interval, '2026-10-29')).toMatchObject({ field: 'interval' });
    expect(planAirconCleaning('2200-12-01', '1', '2200-12-30')).toMatchObject({ field: 'last' });
    expect(planAirconCleaning('1900-01-01', '120', '2026-10-29')).toMatchObject({ plan: { serviceDate: '1910-01-01', serviceInterval: 120 } });
  });
  it('validates both handoff values as an atomic plan', () => {
    for (const [date, interval] of [['2026-02-30', 4], ['2026-10-29', ''], ['2026-10-29', null], ['2026-10-29', ['4']], [['2026-10-29'], 4], ['2201-01-01', 4]]) expect(safeAirconPlan(date, interval)).toBeUndefined();
    expect(safeAirconPlan('2028-02-29', '4')).toEqual({ serviceDate: '2028-02-29', serviceInterval: 4 });
  });
  it('retains only the next date and chosen interval over repeated sign-in sanitization', () => {
    const intent = addIntent('aircon', undefined, undefined, undefined, undefined, { serviceDate: '2027-02-28', serviceInterval: 4 });
    expect(intent).toBe('/add/aircon?serviceDate=2027-02-28&serviceInterval=4');
    const clean = safeAuthIntent(intent + '&lastClean=2026-10-29&label=Private%20unit&provider=Private%20name');
    expect(clean).toBe(intent);
    expect(safeAuthIntent(safeAuthIntent(clean))).toBe(intent);
    expect(safeAuthIntent('/add/car?serviceDate=2027-02-28&serviceInterval=4')).toBe('/add/car');
    expect(safeAuthIntent('/add/aircon?serviceDate=2027-02-31&serviceInterval=4')).toBe('/add/aircon');
    expect(safeAuthIntent('/add/aircon?serviceDate=2027-02-28')).toBe('/add/aircon');
    expect(safeAuthIntent('https://evil.example/add/aircon?serviceDate=2027-02-28&serviceInterval=4')).toBe('/dashboard');
  });
});
