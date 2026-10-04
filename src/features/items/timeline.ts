import { daysUntil } from '@/lib/domain';
import { alertStatus, comingUp, dateRows, type DateRow, type ItemWithDetails, type ScheduledAlert } from './domain';

/** One actual reminder per row, represented by its nearest open due date. */
export function timelineRows(items: ItemWithDetails[], today: string): DateRow[] {
  const seen = new Set<string>();
  return comingUp(dateRows(items), today).filter(row => {
    if (seen.has(row.item.id)) return false;
    seen.add(row.item.id);
    return true;
  });
}

/** Group real queue entries by calendar day, including multiple push devices/channels. */
export function timelineAlerts(row: DateRow, today: string) {
  const grouped = new Map<string, Set<ScheduledAlert['channel']>>();
  if (alertStatus(row.item, row.date) !== 'enabled') return [];
  for (const alert of row.date.scheduled_alerts ?? []) {
    const day = daysUntil(alert.on, today);
    if (day < 0 || day > 30) continue;
    const channels = grouped.get(alert.on) ?? new Set<ScheduledAlert['channel']>();
    channels.add(alert.channel);
    grouped.set(alert.on, channels);
  }
  return [...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([on, channels]) => ({ on, channels: [...channels] }));
}

export function timelinePosition(on: string, today: string) {
  return daysUntil(on, today) / 30 * 100;
}

/** Nearby dots share a generous touch target; every queued day remains visible. */
export function timelineAlertGroups(row: DateRow, today: string) {
  const groups: ReturnType<typeof timelineAlerts>[] = [];
  for (const alert of timelineAlerts(row, today)) {
    const last = groups.at(-1);
    if (last && daysUntil(alert.on, last.at(-1)!.on) <= 3 && (Math.abs(daysUntil(row.occurrence.due_on, alert.on)) <= 2) === (Math.abs(daysUntil(row.occurrence.due_on, last.at(-1)!.on)) <= 2)) last.push(alert);
    else groups.push([alert]);
  }
  return groups;
}
