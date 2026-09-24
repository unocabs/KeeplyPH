import { createHash } from 'node:crypto';
import { z } from 'zod';
const resource = z.object({ id: z.string(), attributes: z.record(z.string(), z.unknown()) });
const attributes = z.object({ type: z.string(), livemode: z.boolean(), data: resource });
const legacy = z.object({ data: z.object({ id: z.string().min(1).max(160), attributes }) });
const hosted = z.object({ event_type: z.literal('send.webhook'), data: attributes.extend({ id: z.string().optional() }) });
export function parsePaymongoEvent(value: unknown) {
  const old = legacy.safeParse(value);
  if (old.success) return old.data.data;
  const current = hosted.parse(value);
  // The newer hosted-checkout envelope can omit an event ID. A content key
  // deduplicates delivery; the order/payment constraints also prevent double credit.
  const id = current.data.data.id + ':' + current.data.type + ':' + createHash('sha256').update(JSON.stringify(current.data.data.attributes)).digest('hex');
  return { id, attributes: current.data };
}
