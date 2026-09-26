import { describe, it, expect } from 'vitest';
import { sampleItems } from '@/lib/demo';
import { alertStatus, isActiveReminder } from '@/features/items/domain';

describe('reminder and alert presentation', () => {
  it('keeps overdue records active, but excludes archives and drafts', () => {
    const item = sampleItems().find(i => i.template_key === 'aircon')!;
    expect(isActiveReminder(item)).toBe(true);
    expect(isActiveReminder({ ...item, archived_at: '2026-09-27T00:00:00Z' })).toBe(false);
    expect(isActiveReminder({ ...item, state: 'draft' })).toBe(false);
  });
  it('requires a covered reminder with an enabled open date for the bell', () => {
    const item = sampleItems()[0];
    expect(alertStatus(item)).toBe('enabled');
    expect(alertStatus({ ...item, coverage: 'off' })).toBe('off');
    expect(alertStatus({ ...item, dates: [] })).toBe('off');
    expect(alertStatus({ ...item, dates: item.dates.map(d => ({ ...d, reminders_enabled: false })) })).toBe('off');
    expect(alertStatus({ ...item, dates: item.dates.map(d => ({ ...d, occurrences: d.occurrences.map(o => ({ ...o, status: 'completed' as const })) })) })).toBe('off');
  });
  it('distinguishes paused capacity and account delivery from enabled alerts', () => {
    const item = sampleItems()[0];
    expect(alertStatus({ ...item, coverage: 'paused_capacity' })).toBe('paused');
    expect(alertStatus({ ...item, alert_delivery_paused: true })).toBe('paused');
    expect(alertStatus({ ...item, archived_at: '2026-09-27T00:00:00Z' })).toBe('off');
    expect(alertStatus({ ...item, state: 'draft' })).toBe('off');
  });
  it('uses the individual date setting in heads-up rows', () => {
    const item = sampleItems()[0];
    const offDate = { ...item.dates[0], id: 'off-date', reminders_enabled: false };
    const multipleDates = { ...item, dates: [...item.dates, offDate] };
    expect(alertStatus(multipleDates)).toBe('enabled');
    expect(alertStatus(multipleDates, offDate)).toBe('off');
    expect(alertStatus(multipleDates, item.dates[0])).toBe('enabled');
  });
});
