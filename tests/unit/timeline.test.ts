import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { sampleItems } from '@/lib/demo';
import { timelineAlerts, timelineAlertGroups, timelinePosition, timelineRows } from '@/features/items/timeline';
import { Dashboard } from '@/components/dashboard';
import { UpcomingTimeline } from '@/components/upcoming-timeline';
import type { Usage } from '@/lib/domain';

const today = '2026-12-20';
const usage = { purchases: 1, reminders: 1, storage_bytes: 0, premium: false, premium_until: null } as Usage;
function fixture(due = '2027-01-03') {
  const item = structuredClone(sampleItems(today)[0]);
  item.dates = [item.dates[0]];
  item.dates[0].occurrences = [{ ...item.dates[0].occurrences.at(-1)!, due_on: due }];
  item.dates[0].scheduled_alerts = [
    { on: today, channel: 'email' },
    { on: '2026-12-27', channel: 'email' },
    { on: '2026-12-27', channel: 'push' },
    { on: due, channel: 'push' },
    { on: '2026-12-19', channel: 'email' },
    { on: '2027-01-20', channel: 'email' },
  ];
  return item;
}

describe('dashboard timeline', () => {
  it('retains the exact fallback hero and Add Reminder when no dates qualify', () => {
    for (const items of [[], [fixture('2027-01-20')], [fixture('2026-12-19')]]) {
      const html = renderToStaticMarkup(createElement(Dashboard, { items, today, name: 'Test', usage }));
      expect(html).toContain('Everything in its place.');
      expect(html).toContain('Add Reminder');
      expect(html).not.toContain('coming-up-title');
    }
  });
  it('includes today and day 30, sorts across years, and omits archived/draft/closed reminders', () => {
    const items = [fixture('2027-01-19'), fixture(today), fixture('2026-12-31'), fixture('2027-01-20')].map((item, index) => ({ ...item, id: String(index) }));
    expect(timelineRows(items, today).map(row => row.item.id)).toEqual(['1', '2', '0']);
    expect(timelineRows([{ ...items[0], archived_at: today }, { ...items[1], state: 'draft' }], today)).toEqual([]);
    items[2].dates[0].occurrences[0].status = 'completed';
    expect(timelineRows([items[2]], today)).toEqual([]);
    expect(timelinePosition(today, today)).toBe(0);
    expect(timelinePosition('2027-01-19', today)).toBe(100);
    expect(timelinePosition('2027-01-04', today)).toBe(50);
  });
  it('represents each reminder once using its earliest open recurring occurrence', () => {
    const item = fixture();
    const other = structuredClone(item.dates[0]);
    other.id = 'second-date'; other.occurrences[0].due_on = '2026-12-31';
    item.dates.push(other);
    const rows = timelineRows([item], today);
    expect(rows).toHaveLength(1);
    expect(rows[0].date.id).toBe('second-date');
    expect(rows[0].date.recurrence_months).toBe(1);
  });
  it('uses only queued alerts, groups channels, and keeps same-day alerts', () => {
    const row = timelineRows([fixture()], today)[0];
    expect(timelineAlerts(row, today)).toEqual([
      { on: today, channels: ['email'] },
      { on: '2026-12-27', channels: ['email', 'push'] },
      { on: '2027-01-03', channels: ['push'] },
    ]);
    row.date.scheduled_alerts = undefined;
    expect(timelineAlerts(row, today)).toEqual([]);
    row.date.scheduled_alerts = [{ on: today, channel: 'email' }];
    expect(timelineAlerts(row, today)).toHaveLength(1);
    row.date.reminders_enabled = false;
    expect(timelineAlerts(row, today)).toEqual([]);
    row.date.reminders_enabled = true;
    for (const state of ['off', 'paused_capacity'] as const) {
      row.item.coverage = state;
      expect(timelineAlerts(row, today)).toEqual([]);
    }
    row.item.coverage = 'covered'; row.item.alert_delivery_paused = true;
    expect(timelineAlerts(row, today)).toEqual([]);
  });
  it('keeps all nearby dates in one accessible touch target', () => {
    const row = timelineRows([fixture()], today)[0];
    row.date.scheduled_alerts = [today, '2026-12-21', '2026-12-22', '2026-12-30'].map(on => ({ on, channel: 'email' }));
    expect(timelineAlertGroups(row, today).map(group => group.map(alert => alert.on))).toEqual([[today, '2026-12-21', '2026-12-22'], ['2026-12-30']]);
  });
  it('renders one/five rows, overflow navigation, accessible dates, and preserves Upcoming below', () => {
    for (const count of [1, 4, 5, 8]) {
      const items = Array.from({ length: count }, (_, index) => ({ ...fixture(), id: String(index), product_name: `Real reminder ${index}` }));
      const rows = timelineRows(items, today);
      const html = renderToStaticMarkup(createElement(UpcomingTimeline, { rows, today }));
      expect(html.match(/aria-haspopup="dialog"/g)).toHaveLength(Math.min(count, 5));
      expect(html.includes('View all upcoming')).toBe(count > 4);
      expect(html).toContain('Real reminder 0 due January 3, 2027');
      expect(html).toContain('Email / Device alert');
      expect(html).toContain('role="tooltip"');
      const dashboard = renderToStaticMarkup(createElement(Dashboard, { items, today, name: 'Test', usage }));
      expect(dashboard).toContain('coming-up-title');
      expect(dashboard).toContain('upcoming-heading');
      expect(dashboard).not.toContain('Everything in its place.');
    }
  });
});
