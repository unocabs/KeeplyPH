import { describe, it, expect } from 'vitest';
import { nextRecurringDate, previewRecurringDates } from '@/features/items/recurrence';
import { dateSchema } from '@/features/items/validation';

describe('recurring important dates', () => {
  it('returns the original day after short months and handles leap years', () => {
    expect(nextRecurringDate('2031-01-31', '2031-01-31', 1, '2032-12-31')).toBe('2031-02-28');
    expect(nextRecurringDate('2031-01-31', '2031-02-28', 1, '2032-12-31')).toBe('2031-03-31');
    expect(nextRecurringDate('2032-01-31', '2032-01-31', 1, '2032-12-31')).toBe('2032-02-29');
    expect(nextRecurringDate('2032-02-29', '2035-02-28', 12, '2036-12-31')).toBe('2036-02-29');
  });
  it('supports longer intervals and stops at an inclusive end date', () => {
    expect(nextRecurringDate('2026-10-15', '2026-10-15', 3, '2029-03-15')).toBe('2027-01-15');
    expect(nextRecurringDate('2026-10-15', '2029-02-15', 1, '2029-03-15')).toBe('2029-03-15');
    expect(nextRecurringDate('2026-10-15', '2029-03-15', 1, '2029-03-15')).toBeNull();
  });
  it('continues without an end date and previews dates from the original anchor', () => {
    expect(nextRecurringDate('2032-01-31', '2032-02-29', 1, null)).toBe('2032-03-31');
    expect(previewRecurringDates('2032-01-31', '2032-02-29', 1, null)).toEqual(['2032-02-29','2032-03-31','2032-04-30']);
    expect(previewRecurringDates('2032-01-31', '2032-02-29', 1, '2032-03-31')).toEqual(['2032-02-29','2032-03-31']);
    expect(nextRecurringDate('2200-12-31','2200-12-31',1,null)).toBeNull();
  });
  const valid = {kind:'other',label:'Loan payment',due_on:'2026-10-15',reminders_enabled:false,interval_months:null,offsets:[{unit:'days',value:7}],recurrence_months:1,recurrence_ends_on:'2029-03-15',payment_amount_minor:845000};
  it('validates shared schedules and optional exact-centavo amounts', () => {
    expect(dateSchema.safeParse(valid).success).toBe(true);
    expect(dateSchema.safeParse({...valid,recurrence_ends_on:null}).success).toBe(true);
    expect(dateSchema.safeParse({...valid,kind:'registration'}).success).toBe(true);
    expect(dateSchema.safeParse({...valid,payment_amount_minor:null}).success).toBe(true);
    for (const patch of [{payment_amount_minor:1.5},{payment_amount_minor:-1},{recurrence_ends_on:'2026-10-14'},{recurrence_months:2},{offsets:[{unit:'days',value:28}]}]) {
      expect(dateSchema.safeParse({...valid,...patch}).success).toBe(false);
    }
  });
});
