import { z } from 'zod';
import { dateValue } from '@/lib/validation';
export const requiredDate = dateValue.refine(v => Boolean(v) && v >= '1900-01-01' && v <= '2200-12-31', 'Enter a date between 1900 and 2200.');
export const offsetSchema = z.object({ unit: z.enum(['days','months']), value: z.number().int().min(0).max(365) }).refine(v => v.unit === 'days' || (v.value >= 1 && v.value <= 24), 'Choose 1–24 months.');
export const dateSchema = z.object({
  kind: z.enum(['warranty','registration','insurance','service','expiration','other']), label: z.string().trim().min(1).max(160),
  due_on: requiredDate, reminders_enabled: z.boolean(), offsets: z.array(offsetSchema).min(1).max(3).refine(v => new Set(v.map(o => o.unit + o.value)).size === v.length, 'Choose distinct reminder timings.'),
  last_completed_on: dateValue.optional(),
  interval_months: z.number().int().min(1).max(120).nullable(),
});
