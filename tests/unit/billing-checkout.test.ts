import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), paymongo: vi.fn(), redirect: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireUser: mocks.auth }));
vi.mock('@/lib/supabase/admin', () => ({ adminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/paymongo', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/paymongo')>(), paymongo: mocks.paymongo }));

import { startCheckout } from '@/features/billing/actions';
import { configuredPaymentMethods } from '@/lib/paymongo';
import { safeAuthIntent } from '@/lib/auth-intent';

const id = '11111111-1111-4111-8111-111111111111';
const url = 'https://checkout.paymongo.com/cs_test';
function form(product = 'premium_30', slots = '25') {
  const data = new FormData(); data.set('product', product); data.set('slots', slots); return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('PAYMENTS_ENABLED', 'true'); vi.stubEnv('PREMIUM_PAYMENTS_ENABLED','true'); vi.stubEnv('PAYMONGO_MODE', 'test');
  vi.stubEnv('PAYMONGO_SECRET_KEY', 'sk_test_example'); vi.stubEnv('PAYMONGO_PAYMENT_METHODS', 'qrph,gcash');
  vi.stubEnv('APP_URL', 'https://www.keeplyph.com');
  mocks.auth.mockResolvedValue({ profile: { id: 'owner' } });
  mocks.rpc.mockImplementation(async name => ({ data: name === 'create_premium_order' ? { id, create_checkout: true, checkout_url: null, slot_count: 25, amount_minor: 5900 } : null, error: null }));
  mocks.paymongo.mockResolvedValue({ data: { id: 'cs_test', attributes: { livemode: false, checkout_url: url } } });
  mocks.redirect.mockImplementation(target => { throw new Error('redirect:' + target); });
});
afterEach(() => vi.unstubAllEnvs());

describe('Checkout review and return handling', () => {
  it('preserves quantity and product through sign-in without accepting a client-supplied price', () => {
    expect(safeAuthIntent('/settings/billing?slots=25&product=slots_permanent&amount=1&redirect=https://example.com')).toBe('/settings/billing?slots=25&product=slots_permanent');
    expect(safeAuthIntent('/settings/billing?slots=26&product=free')).toBe('/settings/billing');
    expect(safeAuthIntent('https://example.com/settings/billing?slots=25')).toBe('/dashboard');
  });
  it('preserves a valid payment reference if the session expires during checkout', () => {
    expect(safeAuthIntent(`/settings/billing?payment=return&order=${id}`)).toBe(`/settings/billing?payment=return&order=${id}`);
    expect(safeAuthIntent(`/settings/billing?payment=cancelled&order=${id}`)).toBe(`/settings/billing?payment=cancelled&order=${id}`);
    expect(safeAuthIntent('/settings/billing?payment=paid&order=other')).toBe('/settings/billing');
  });
  it('opens checkout for the exact server-priced Premium plan and identifies the same order on success and cancellation', async () => {
    await expect(startCheckout({}, form())).rejects.toThrow('redirect:' + url);
    expect(mocks.paymongo).toHaveBeenCalledWith('/v2/checkout_sessions', expect.objectContaining({
      success_url: `https://www.keeplyph.com/settings/billing?payment=return&order=${id}`,
      cancel_url: `https://www.keeplyph.com/settings/billing?payment=cancelled&order=${id}`,
      line_items: [expect.objectContaining({ amount: 5900, quantity: 1, currency: 'PHP' })],
      reference_number: id, pass_on_fees: false,
    }));
    expect(mocks.rpc).toHaveBeenCalledWith('attach_checkout', { p_id: id, p_checkout_id: 'cs_test', p_url: url });
  });
  it('reuses an existing checkout instead of creating a second payment attempt', async () => {
    mocks.rpc.mockResolvedValue({ data: { id, create_checkout: false, checkout_url: url, slot_count: 25, amount_minor: 5900 }, error: null });
    await expect(startCheckout({}, form())).rejects.toThrow('redirect:' + url);
    expect(mocks.paymongo).not.toHaveBeenCalled();
  });
  it('keeps checkout unavailable when payments are disabled and rejects unauthenticated purchases', async () => {
    vi.stubEnv('PAYMENTS_ENABLED', 'false');
    expect(await startCheckout({}, form())).toHaveProperty('error'); expect(mocks.auth).not.toHaveBeenCalled();
    vi.stubEnv('PAYMENTS_ENABLED', 'true'); vi.stubEnv('PREMIUM_PAYMENTS_ENABLED','false');
    expect(await startCheckout({}, form())).toHaveProperty('error'); expect(mocks.auth).not.toHaveBeenCalled();
    vi.stubEnv('PREMIUM_PAYMENTS_ENABLED','true'); mocks.auth.mockRejectedValue(new Error('sign-in required'));
    await expect(startCheckout({}, form())).rejects.toThrow('sign-in required'); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('rejects retired products and price mismatches before contacting the provider', async () => {
    expect(await startCheckout({}, form('slots_30', '26'))).toHaveProperty('error');
    mocks.rpc.mockResolvedValue({ data: { id, create_checkout: true, checkout_url: null, slot_count: 25, amount_minor: 1 }, error: null });
    expect(await startCheckout({}, form())).toHaveProperty('error'); expect(mocks.paymongo).not.toHaveBeenCalled();
  });
  it('handles provider errors and rejects unexpected checkout domains and payment environments', async () => {
    mocks.paymongo.mockRejectedValueOnce(new Error('provider offline'));
    expect(await startCheckout({}, form())).toHaveProperty('error');
    for (const attributes of [{ livemode: false, checkout_url: 'https://example.com/pay' }, { livemode: true, checkout_url: url }]) {
      mocks.paymongo.mockResolvedValue({ data: { id: 'cs_test', attributes } });
      expect(await startCheckout({}, form())).toHaveProperty('error');
    }
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalledWith('attach_checkout', expect.anything());
  });
  it('only presents configured, supported methods and omits invalid configurations', () => {
    expect(configuredPaymentMethods()).toEqual(['QR Ph', 'GCash']);
    vi.stubEnv('PAYMONGO_PAYMENT_METHODS', 'gcash, card,gcash,paymaya');
    expect(configuredPaymentMethods()).toEqual(['GCash', 'Credit / debit card', 'Maya']);
    vi.stubEnv('PAYMONGO_PAYMENT_METHODS', 'gcash,unknown'); expect(configuredPaymentMethods()).toEqual([]);
  });
});
