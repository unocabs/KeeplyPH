import { timingSafeEqual } from 'node:crypto';
import { appUrl } from './env';
export function checkOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return origin === appUrl();
}
export function constantEquals(a: string, b: string): boolean {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function validCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && constantEquals(request.headers.get('authorization') || '', 'Bearer ' + secret));
}
