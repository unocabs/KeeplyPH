import { z } from 'zod';
import { dateValue } from '@/lib/validation';
export const requiredDate = dateValue.refine(v => Boolean(v) && v >= '1900-01-01' && v <= '2200-12-31', 'Enter a date between 1900 and 2200.');
export const offsetSchema = z.object({ unit: z.enum(['days','months']), value: z.number().int().min(0).max(365) }).refine(v => v.unit === 'days' || (v.value >= 1 && v.value <= 24), 'Choose 1–24 months.');
export const dateSchema = z.object({
  kind: z.enum(['warranty','registration','insurance','service','expiration','other']), label: z.string().trim().min(1).max(160),
  due_on: requiredDate, reminders_enabled: z.boolean(), offsets: z.array(offsetSchema).min(1).max(3).refine(v => new Set(v.map(o => o.unit + o.value)).size === v.length, 'Choose distinct alert timings.'),
  last_completed_on: dateValue.optional(),
  recurrence_months: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]).nullable().optional(),
  recurrence_ends_on: requiredDate.nullable().optional(),
  payment_amount_minor: z.number().int().min(0).max(99999999999).nullable().optional(),
  interval_months: z.number().int().min(1).max(120).nullable(),
}).superRefine((value, ctx) => {
  if (!value.recurrence_months) return;
  if (value.kind !== 'other') ctx.addIssue({ code: 'custom', message: 'Recurring schedules use a custom important date.' });
  if (!value.recurrence_ends_on || value.recurrence_ends_on < value.due_on) ctx.addIssue({ code: 'custom', message: 'Choose an end date on or after the next payment.', path: ['recurrence_ends_on'] });
  if (value.offsets.some(offset => offset.unit !== 'days' || offset.value > 27)) ctx.addIssue({ code: 'custom', message: 'For recurring reminders, choose 0–27 days before each date.', path: ['offsets'] });
});
