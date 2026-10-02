import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { requireEnv } from './env';
const claimsSchema = z.object({ user: z.string().uuid(), enrollment: z.string().uuid(), purpose: z.literal('reminder-ideas') }).strict();
function secret() {
  const key = requireEnv('EMAIL_UNSUBSCRIBE_SECRET');
  if (key.length < 32) throw new Error('EMAIL_UNSUBSCRIBE_SECRET must contain at least 32 characters');
  return key;
}
export function unsubscribeToken(user: string, enrollment: string) {
  const data = Buffer.from(JSON.stringify(claimsSchema.parse({ user, enrollment, purpose: 'reminder-ideas' }))).toString('base64url');
  return data + '.' + createHmac('sha256', secret()).update(data).digest('base64url');
}
export function verifyUnsubscribeToken(token: string) {
  if (token.length > 1024) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts.every(p => /^[A-Za-z0-9_-]+$/.test(p))) return null;
  const expected = createHmac('sha256', secret()).update(parts[0]).digest();
  const actual = Buffer.from(parts[1], 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try { return claimsSchema.parse(JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))); } catch { return null; }
}
