import { describe, expect, it } from 'vitest';
import { isSlotCount, packPrice } from '@/features/billing/products';
import { renewalEmail } from '@/lib/renewal-email';
describe('Slot pricing', () => {
  it.each([[5, 2900, 24900, 4900, 49900], [25, 14500, 124500, 24500, 249500], [100, 58000, 498000, 98000, 998000]])('prices %i slots in centavos', (slots, temporary, permanent, rawTemporary, rawPermanent) => {
    expect(packPrice('slots_30', slots)).toEqual({amount: temporary, originalAmount: rawTemporary});
    expect(packPrice('slots_permanent', slots)).toEqual({amount: permanent, originalAmount: rawPermanent});
  });
  it.each([0, 4, 6, 24, 101, 105, 5.5, NaN, Infinity])('rejects invalid quantity %s', slots => {
    expect(isSlotCount(slots)).toBe(false);
    expect(() => packPrice('slots_30', slots)).toThrow();
  });
  it('renewal emails direct customers to their quantity without quoting a five-slot price', () => {
    const email = renewalEmail({from:'test@example.test',to:'customer@example.test',expires:'2026-11-01',expired:false,url:'https://keeplyph.com'});
    expect(email.text).toContain('Choose your slot count');
    expect(email.text).not.toContain('₱29');
    expect(email.text).not.toContain('five');
  });
});
