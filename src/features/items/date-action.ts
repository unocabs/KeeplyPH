import { reminderPresets } from '@/features/templates';
import { paymentDate, presetCategory } from '@/features/templates/categories';
import type { DateRow, DateWithDetails, ItemWithDetails } from './domain';

export function completionLabel(item: ItemWithDetails, date: DateWithDetails): string {
  if (date.kind === 'warranty') return 'Finish tracking this warranty';
  if (date.kind === 'service' || presetCategory(item.reminder_preset) === 'maintenance') return 'Mark service done';
  if (paymentDate(item.reminder_preset, date.kind, date.label)) return 'Mark paid';
  if (item.reminder_preset === 'prc-license' && date.label === reminderPresets['prc-license'].dateLabel) return 'Mark renewed';
  if (['expiration', 'registration', 'insurance'].includes(date.kind)) return 'Mark renewed';
  return 'Mark done';
}

export function dateAction(row: DateRow, base = '') {
  const review = row.date.kind === 'warranty' || presetCategory(row.item.reminder_preset) === 'subscriptions';
  const label = row.date.kind === 'warranty' ? 'Review warranty' : review ? 'Review renewal' : completionLabel(row.item, row.date);
  const query = new URLSearchParams({ date: row.date.id });
  if (!review) {
    query.set('action', 'complete');
    query.set('due', row.occurrence.due_on);
  }
  return { label, href: `${base}/items/${row.item.id}?${query}#date-${row.date.id}` };
}
