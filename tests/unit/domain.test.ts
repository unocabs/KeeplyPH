import { describe, expect, it } from 'vitest';
import { addMonths, daysUntil, parseMoney, safeReturnPath, todayIn, warrantyStatus, type Warranty } from '@/lib/domain';
import { purchaseSchema, warrantySchema } from '@/lib/validation';
describe('Calendar and amount behavior', () => {
  it('clamps month-end dates and leap years', () => {
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2024-02-29', 12)).toBe('2025-02-28');
    expect(addMonths('2025-08-31', 6)).toBe('2026-02-28');
  });
  it('uses the account timezone rather than server midnight', () => {
    const now = new Date('2026-09-20T17:00:00Z');
    expect(todayIn('Asia/Manila', now)).toBe('2026-09-21');
    expect(todayIn('America/Los_Angeles', now)).toBe('2026-09-20');
    expect(daysUntil('2026-03-09', '2026-03-08')).toBe(1);
  });
  it('treats expiration today as still covered and future starts as upcoming', () => {
    const w = { expires_on: '2026-09-20', starts_on: null } as Warranty;
    expect(warrantyStatus(w, '2026-09-20')).toBe('expiring');
    expect(warrantyStatus(w, '2026-09-21')).toBe('expired');
    expect(warrantyStatus({ ...w, starts_on: '2026-09-19' }, '2026-09-18')).toBe('upcoming');
  });
  it('parses decimal pesos exactly and rejects ambiguous inputs', () => {
    expect(parseMoney('1299.50')).toBe(129950);
    expect(parseMoney('0.1')).toBe(10);
    expect(parseMoney('')).toBe(null);
    for (const value of ['-1', '1.001', '1e3', '1,299.50', 'Infinity']) expect(() => parseMoney(value)).toThrow();
  });
  it('requires only a product name for a purchase', () => {
    expect(purchaseSchema.safeParse({ product_name: 'Lamp', purchased_on: '', merchant: '', category: '', notes: '', price_minor: null }).success).toBe(true);
  });
  it('rejects invalid dates and backwards warranties', () => {
    const w = { starts_on: '2026-01-01', expires_on: '2025-12-31', notes: '', serial_number: '', reminders_enabled: false };
    expect(warrantySchema.safeParse(w).success).toBe(false);
    expect(warrantySchema.safeParse({ ...w, expires_on: '2026-02-30' }).success).toBe(false);
  });
});
describe('OAuth return paths', () => {
  it.each(['https://evil.test', '//evil.test', '/\\evil.test', '/\n/evil.test'])('rejects %s', value => expect(safeReturnPath(value)).toBe('/dashboard'));
  it('keeps an internal purchase destination', () => expect(safeReturnPath('/purchases/new?source=welcome')).toBe('/purchases/new?source=welcome'));
});
