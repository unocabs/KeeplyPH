import { createHmac } from 'node:crypto';
import { constantEquals } from './security';
export function verifyPaymongoSignature(raw: string, header: string, secret: string, live: boolean, now = Date.now()) {
  const fields = Object.fromEntries(header.split(',').map(s => s.trim().split('=')));
  const stamp = fields.t;
  const signature = fields[live ? 'li' : 'te'];
  if (!stamp || !/^\d+$/.test(stamp) || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  if (Math.abs(now / 1000 - Number(stamp)) > 300) return false;
  const expected = createHmac('sha256', secret).update(stamp + '.' + raw).digest('hex');
  return constantEquals(expected, signature.toLowerCase());
}
