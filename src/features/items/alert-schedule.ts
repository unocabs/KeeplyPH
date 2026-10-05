import { formatDate } from '@/lib/domain';
import type { Offset } from '@/features/templates';
import { alertStatus, currentOccurrence, type DateWithDetails, type ItemWithDetails } from './domain';

export type AlertMode = 'gentle' | 'standard' | 'custom';

export function withDueDateAlert(offsets: Offset[], enabled = true): Offset[] {
  const advance = offsets.filter(offset => offset.unit !== 'days' || offset.value !== 0);
  return enabled ? [...advance, { unit: 'days', value: 0 }] : advance;
}

export function presetOffsets(mode: Exclude<AlertMode, 'custom'>, recurring: boolean, dueDateAlert = true): Offset[] {
  return withDueDateAlert((mode === 'gentle' ? [7] : recurring ? [14, 7, 1] : [30, 7, 1]).map(value => ({ unit: 'days', value })), dueDateAlert);
}

export function alertMode(offsets: Offset[], recurring: boolean): AlertMode {
  offsets = withDueDateAlert(offsets, false);
  for (const mode of ['gentle', 'standard'] as const) {
    const preset = presetOffsets(mode, recurring, false);
    if (offsets.length === preset.length && preset.every(p => offsets.some(o => o.unit === p.unit && o.value === p.value))) return mode;
  }
  return 'custom';
}

/** Preserve valid custom timings when changing the repeat frequency. */
export function offsetsForRecurrence(offsets: Offset[]): Offset[] {
  return offsets.every(o => o.unit === 'days' && o.value <= 27) ? offsets : presetOffsets('standard', true, offsets.some(o => o.unit === 'days' && o.value === 0));
}

export function timingLabel(offset: Offset): string {
  if (offset.unit === 'days' && offset.value === 0) return 'On the due date';
  const unit = offset.unit === 'days' ? 'day' : 'calendar month';
  return `${offset.value} ${unit}${offset.value === 1 ? '' : 's'} before`;
}

/** Use the actual queue preview, never infer that an alert exists from its offsets. */
export function nextAlertSummary(item: ItemWithDetails, date: DateWithDetails, today: string) {
  const occurrence = currentOccurrence(date);
  if (item.archived_at) return { label: 'Alerts paused', value: 'Reminder archived' };
  if (!occurrence) return { label: 'Next alert', value: 'No upcoming date' };
  if (!date.reminders_enabled) return { label: 'Alerts off', value: 'Enable reminders for this date' };
  if (item.coverage === 'paused_capacity') return { label: 'Alerts paused', value: 'No available alert slot' };
  if (alertStatus(item, date) === 'off') return { label: 'Alerts off', value: 'Enable alert coverage for this reminder' };
  if (alertStatus(item, date) === 'paused') return { label: 'Alerts paused', value: 'Review your delivery preferences in Alert Options' };
  if (occurrence.due_on < today && !occurrence.snoozed_on) return { label: 'Next alert', value: 'No further alerts for this past date' };
  if (!date.next_scheduled_on) return { label: 'Next alert', value: 'No alerts pending for this date' };
  if (date.next_scheduled_on < today) return { label: 'Alert awaiting delivery', value: `Scheduled for ${formatDate(date.next_scheduled_on)}` };
  return { label: 'Next alert', value: date.next_scheduled_on === today ? 'Today' : formatDate(date.next_scheduled_on) };
}
