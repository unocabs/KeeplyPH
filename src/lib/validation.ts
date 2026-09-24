import { z } from 'zod';
import { categories } from './domain';
const optional = (max: number) => z.string().trim().max(max);
export const dateValue = z.string().refine(value => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value), 'Enter a valid date.');
export const purchaseSchema = z.object({
  product_name: z.string().trim().min(1, 'Add a product name.').max(160),
  purchased_on: dateValue, merchant: optional(160), notes: optional(5000),
  category: z.union([z.enum(categories), z.literal('')]), price_minor: z.number().int().min(0).max(999999999999).nullable(),
});
export const warrantySchema = z.object({
  starts_on: dateValue, expires_on: dateValue.refine(Boolean, 'Add an expiration date.'),
  serial_number: optional(160), notes: optional(5000), reminders_enabled: z.boolean(),
}).refine(v => !v.starts_on || v.expires_on >= v.starts_on, { message: 'Expiration must be on or after the warranty starts.', path: ['expires_on'] });
export const uuidSchema = z.string().uuid();
