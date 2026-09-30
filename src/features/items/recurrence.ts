import { addMonths } from '@/lib/domain';

export const recurrenceFrequencies = [
  { months: 1, label: 'Monthly' },
  { months: 3, label: 'Quarterly' },
  { months: 6, label: 'Every six months' },
  { months: 12, label: 'Yearly' },
] as const;

export interface RecurrenceFields {
  recurrence_months?: number | null;
  recurrence_anchor?: string | null;
  recurrence_ends_on?: string | null;
  payment_amount_minor?: number | null;
}

/** Use the original day each time: Jan 31 → Feb 28 → Mar 31. */
export function nextRecurringDate(anchor: string, after: string, months: number, end: string): string | null {
  const [ay, am] = anchor.split('-').map(Number);
  const [by, bm] = after.split('-').map(Number);
  let step = Math.max(0, Math.floor(((by - ay) * 12 + bm - am) / months));
  let next = addMonths(anchor, step * months);
  if (next <= after) next = addMonths(anchor, ++step * months);
  return next <= end ? next : null;
}
