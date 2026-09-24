import 'server-only';
import { z } from 'zod';
import { requireEnv } from './env';
export function paymentMode() {
  const mode = requireEnv('PAYMONGO_MODE');
  if (!['test', 'live'].includes(mode)) throw new Error('Invalid payment mode');
  const key = requireEnv('PAYMONGO_SECRET_KEY');
  if (!key.startsWith('sk_' + mode + '_')) throw new Error('Payment environment mismatch');
  return mode === 'live';
}
export async function paymongo(path: string, attributes?: Record<string, unknown>) {
  paymentMode();
  const response = await fetch('https://api.paymongo.com' + path, {
    method: attributes ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { Authorization: 'Basic ' + Buffer.from(requireEnv('PAYMONGO_SECRET_KEY') + ':').toString('base64'), 'Content-Type': 'application/json' },
    ...(attributes ? { body: JSON.stringify({ data: { attributes } }) } : {}),
  });
  if (!response.ok) throw new Error('Payment provider request failed (' + response.status + ')');
  return response.json() as Promise<unknown>;
}
export const checkoutSchema = z.object({ data: z.object({
  id: z.string().regex(/^cs_[A-Za-z0-9]+$/),
  attributes: z.object({
    livemode: z.boolean(), checkout_url: z.string().optional(), reference_number: z.string().optional(),
    payments: z.array(z.object({ id: z.string().regex(/^pay_[A-Za-z0-9]+$/), attributes: z.object({
      amount: z.number().int(), currency: z.string(), status: z.string(), livemode: z.boolean(),
      refunded: z.boolean().optional(), refunds: z.array(z.unknown()).optional(), disputed: z.boolean().optional(),
    }) })).optional(),
  }),
}) });
export function validCheckoutUrl(value: string): boolean {
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'checkout.paymongo.com' && !url.username && !url.password && !url.port; } catch { return false; }
}
