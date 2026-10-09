import { z } from 'zod';
import { requiredDate } from './validation';
import { uuidSchema } from '@/lib/validation';
import { paymentDate, presetCategory } from '@/features/templates/categories';
import type { DateWithDetails, ItemWithDetails } from './domain';

export const activityTypes = ['payment', 'service', 'renewal', 'repair', 'completion', 'note', 'warranty_closed'] as const;
export type ActivityType = typeof activityTypes[number];
export const activityLabels: Record<ActivityType, string> = {
  payment: 'Payment', service: 'Service', renewal: 'Renewal', repair: 'Repair', completion: 'Completed task', note: 'Note', warranty_closed: 'Warranty tracking ended',
};
export interface ItemActivity {
  id: string; user_id: string; item_id: string; occurrence_id: string | null; scheduled_on: string | null;
  activity_type: ActivityType; title: string; completed_on: string; amount_minor: number | null; currency: 'PHP'; notes: string | null;
  actor_id: string | null; source: 'recorded' | 'legacy_completion'; revision: number; voided_at: string | null;
  created_at: string; updated_at: string; document_ids: string[];
}
export interface ActivityPage { activities: ItemActivity[]; has_more: boolean }
export interface ActivityCorrection { created_at: string; reason: string; before: ItemActivity; after: ItemActivity }
export interface UnconfirmedSummary { total: number; has_more: boolean; rows: { occurrence_id: string; due_on: string; date_id: string; label: string; item_id: string; product_name: string }[] }
export const activitySchema = z.object({
  activity_type: z.enum(activityTypes), title: z.string().trim().min(1, 'Give this activity a helpful name.').max(160),
  completed_on: requiredDate, amount_minor: z.number().int().min(0).max(99999999999).nullable(), currency: z.literal('PHP').default('PHP'),
  notes: z.string().max(5000).default(''), document_ids: z.array(uuidSchema).max(6).default([]),
});
export type ActivityInput = z.input<typeof activitySchema>;
export function completionType(item: ItemWithDetails, date: DateWithDetails): ActivityType {
  if (date.kind === 'warranty') return 'warranty_closed';
  if (date.kind === 'service' || presetCategory(item.reminder_preset) === 'maintenance') return 'service';
  if (paymentDate(item.reminder_preset, date.kind, date.label)) return 'payment';
  if (['expiration', 'registration', 'insurance'].includes(date.kind) || item.reminder_preset === 'prc-license') return 'renewal';
  return 'completion';
}

export function activityTitle(item: ItemWithDetails, date: DateWithDetails): string {
  const suffix = { payment: 'paid', service: 'completed', renewal: 'renewed', warranty_closed: 'tracking ended', completion: 'completed', repair: 'repaired', note: 'updated' }[completionType(item, date)];
  return `${date.label} ${suffix}`.slice(0, 160);
}
