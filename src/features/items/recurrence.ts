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
export function nextRecurringDate(anchor: string, after: string, months: number, end: string | null): string | null {
  const [ay, am] = anchor.split('-').map(Number);
  const [by, bm] = after.split('-').map(Number);
  let step = Math.max(0, Math.floor(((by - ay) * 12 + bm - am) / months));
  let next = addMonths(anchor, step * months);
  if (next <= after) next = addMonths(anchor, ++step * months);
  return next <= (end || '2200-12-31') ? next : null;
}

/** Include the chosen next date and up to two later dates from the original anchor. */
export function previewRecurringDates(anchor: string, due: string, months: number, end: string | null): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || (end && due > end)) return [];
  const dates = [due];
  while (dates.length < 3) {
    const next = nextRecurringDate(anchor, dates[dates.length - 1], months, end);
    if (!next) break;
    dates.push(next);
  }
  return dates;
}
