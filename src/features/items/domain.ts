import { itemCategory } from '@/features/templates/categories';
import type { RecurrenceFields } from './recurrence';
import { daysUntil, type Purchase, type Document } from '@/lib/domain';
import type { TemplateKey, DateKind, Offset } from '@/features/templates';
export interface Item extends Purchase { car_brand?: string | null; reminder_preset?: string | null; alert_delivery_paused?: boolean; template_key: TemplateKey; template_version: number; archived_at: string | null; coverage_requested_at?: string | null; coverage_active?: boolean; coverage_since?: string | null; coverage?: 'covered' | 'paused_capacity' | 'off' }
export interface Occurrence { snoozed_on?: string | null; id: string; date_id: string; user_id: string; cycle: number; due_on: string; status: 'open' | 'completed' | 'superseded' | 'unconfirmed'; completed_on: string | null; created_at: string }
export interface ImportantDate extends RecurrenceFields { id: string; item_id: string; user_id: string; kind: DateKind; label: string; starts_on: string | null; serial_number: string | null; notes: string | null; reminders_enabled: boolean; reminders_enabled_at: string | null; reminder_disabled_reason: string | null; interval_months: number | null; revision: number; created_at: string; updated_at: string }
export interface ScheduledAlert { on: string; channel: 'email' | 'push' | 'sms' }
export interface DateWithDetails extends ImportantDate { scheduled_alerts?: ScheduledAlert[]; next_scheduled_on?: string | null; occurrences: Occurrence[]; offsets: Offset[] }
export interface ItemWithDetails extends Item { dates: DateWithDetails[]; documents: Document[] }
export interface DateRow { item: ItemWithDetails; date: DateWithDetails; occurrence: Occurrence }
export function currentOccurrence(date: DateWithDetails) { return date.occurrences.find(o => o.status === 'open'); }
export function dateRows(items: ItemWithDetails[]): DateRow[] {
  return items.filter(i => i.state === 'saved' && !i.archived_at).flatMap(item => item.dates.flatMap(date => { const occurrence = currentOccurrence(date); return occurrence ? [{ item, date, occurrence }] : []; })).sort((a, b) => a.occurrence.due_on.localeCompare(b.occurrence.due_on) || a.date.id.localeCompare(b.date.id));
}
export function comingUp(rows: DateRow[], today: string) { return rows.filter(r => { const days = daysUntil(r.occurrence.due_on, today); return days >= 0 && days <= 30; }); }
export function dateStatus(row: DateRow, today: string) {
  const days = daysUntil(row.occurrence.due_on, today);
  if (days < 0) return (['expiration', 'warranty'].includes(row.date.kind) ? 'Expired' : 'Overdue') + ' · ' + Math.abs(days) + (days === -1 ? ' day ago' : ' days ago');
  if (days === 0) return 'Due today';
  if (days >= 365) return Math.floor(days / 365) + ' year' + (days >= 730 ? 's' : '') + ' remaining';
  if (days >= 60) return Math.floor(days / 30.4375) + ' months remaining';
  return days + (days === 1 ? ' day' : ' days') + ' remaining';
}

export type AlertStatus = 'enabled' | 'paused' | 'off';
export function isActiveReminder(item: Item) { return item.state === 'saved' && !item.archived_at; }
/** A bell describes enabled notifications, not merely an allocated slot. */
export function alertStatus(item: ItemWithDetails, date?: DateWithDetails): AlertStatus {
  if (!isActiveReminder(item)) return 'off';
  const dates = date ? [date] : item.dates;
  if (!dates.some(d => d.reminders_enabled && currentOccurrence(d))) return 'off';
  if (item.coverage === 'paused_capacity') return 'paused';
  if (item.coverage !== 'covered') return 'off';
  return item.alert_delivery_paused ? 'paused' : 'enabled';
}

/** Activity views select dates, while each item keeps its original category. */
export function dateMatchesCategory(item: ItemWithDetails, date: DateWithDetails, category: string) {
  if (category === 'all') return true;
  if (category === 'maintenance') return date.kind === 'service' || itemCategory(item) === 'maintenance';
  if (category === 'insurance') return date.kind === 'insurance' || itemCategory(item) === 'insurance';
  return itemCategory(item) === category;
}
export function itemMatchesCategory(item: ItemWithDetails, category: string) {
  return category === 'all' || itemCategory(item) === category || item.dates.some(date => dateMatchesCategory(item, date, category));
}
export function itemsForCategory(items: ItemWithDetails[], category: string): ItemWithDetails[] {
  return items.filter(item => itemMatchesCategory(item, category)).map(item => category === 'all' ? item : ({
    ...item, dates: item.dates.filter(date => dateMatchesCategory(item, date, category)),
  }));
}
