import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { sampleItems, sampleUsage } from '@/lib/demo';
import { timelineAlerts, timelineAlertGroups, timelinePosition, timelineRows } from '@/features/items/timeline';
import { Dashboard } from '@/components/dashboard';
import { sampleInsights } from '@/features/items/insights';
import { UpcomingTimeline } from '@/components/upcoming-timeline';
import type { Usage } from '@/lib/domain';

// Closed add dialogs show catalog previews independently of a saved reminder's identity.
function withoutCategoryPickers(html: string) {
  return html.replace(/<dialog class="template-dialog"[\s\S]*?<\/dialog>/g, '');
}

const today = '2026-12-20';
const usage = { purchases: 1, reminders: 1, storage_bytes: 0, premium: false, premium_until: null } as Usage;
function fixture(due = '2027-01-03') {
  const item = structuredClone(sampleItems(today)[0]);
  item.lender_id = null; item.lender_name = null;
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
  it('groups the shared demo and account dashboard around calendar, checks, planning and records', () => {
    const items = sampleItems(today);
    for (const demo of [true, false]) {
      const html = renderToStaticMarkup(createElement(Dashboard, { items, today, name: 'Alex', usage: sampleUsage(items, today), insights: sampleInsights(items, today), demo }));
      const positions = ['coming-up', 'needs-a-check', 'plan-and-organise', 'saved-records'].map(id => html.indexOf(`id="${id}"`));
      expect(positions.every(position => position > 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
      expect(html.indexOf('id="planning-heading"')).toBeLessThan(html.indexOf('id="household-brief-heading"'));
      expect(html.indexOf('id="household-brief-heading"')).toBeLessThan(html.indexOf('id="needs-a-check"'));
      expect(html.indexOf('Household items')).toBeGreaterThan(html.indexOf('id="saved-records"'));
      expect(html).toContain('Details to add');
      expect(html).toContain('A few useful details are missing from your records. Add them whenever you’re ready.');
      expect(html).not.toContain('Household readiness');
      expect(html).toContain(`href="${demo ? '/demo' : ''}/items?filter=incomplete"`);
      expect(html).toContain('aria-label="On this page"');
    }
  });
  it('omits planning navigation when insights are unavailable and preserves the first-item welcome', () => {
    const html = renderToStaticMarkup(createElement(Dashboard, { items: [fixture()], today, name: 'Alex', usage }));
    expect(html).not.toContain('#plan-and-organise');
    const welcome = renderToStaticMarkup(createElement(Dashboard, { items: [], today, name: 'Alex', usage: { ...usage, purchases: 0 } }));
    expect(welcome).toContain('Welcome to Keeply.');
    expect(welcome).not.toContain('On this page');
  });
  it('defaults to one planning calendar and keeps navigation contained in the demo', () => {
    const items = sampleItems(today);
    const html = renderToStaticMarkup(createElement(Dashboard, { items, today, name: 'Alex', usage: sampleUsage(items, today), demo: true }));
    expect(html).toContain('planning-heading');
    expect(html).toContain('coming-up-title');
    expect(html).toContain('Planning view');
    expect(html).toContain('aria-pressed="true">Calendar</button><button type="button" aria-pressed="false">List</button>');
    expect(html).toContain('href="/demo/items?filter=upcoming"');
    expect(html).toContain('aria-label="Add item"');
    expect(html).toContain('Show more ·');
    expect(html).toContain('attention-heading');
    expect(html).not.toContain('Everything in its place.');
  });
  it('keeps saved brand artwork consistent between the timeline and Upcoming list', () => {
    const identities = [
      { template_key: 'other' as const, reminder_preset: 'streaming', subscription_brand: 'youtube-premium', source: '/subscription-brands/youtube-premium.webp' },
      { template_key: 'other' as const, reminder_preset: 'streaming', subscription_brand: 'netflix', source: '/subscription-brands/netflix.webp' },
      { template_key: 'other' as const, reminder_preset: 'gym', subscription_brand: 'anytime-fitness', source: '/subscription-brands/anytime-fitness.webp' },
      { template_key: 'car' as const, reminder_preset: null, car_brand: 'kia', source: '/car-brands/kia.webp' },
      { template_key: 'motorcycle' as const, reminder_preset: null, motorcycle_brand: 'honda', source: '/motorcycle-brands/honda.webp' },
      { template_key: 'other' as const, reminder_preset: 'motorcycle-loan', motorcycle_brand: 'yamaha', lender_id: 'bpi', source: '/lenders/bpi.webp' },
    ];
    for (const { source, ...identity } of identities) {
      const item = { ...fixture(), car_brand: null, motorcycle_brand: null, subscription_brand: null, ...identity, product_name: 'My reminder' };
      const timeline = withoutCategoryPickers(renderToStaticMarkup(createElement(UpcomingTimeline, { rows: timelineRows([item], today), today })));
      expect(timeline).toContain(source);
      const dashboard = withoutCategoryPickers(renderToStaticMarkup(createElement(Dashboard, { items: [item], today, name: 'Test', usage })));
      // The default planning calendar and record card share the saved identity.
      expect(dashboard.split(`src="${source}"`)).toHaveLength(3);
    }
  });
  it('keeps generic icons for missing, unknown, and incompatible saved brands', () => {
    for (const identity of [
      { reminder_preset: 'streaming', subscription_brand: null },
      { reminder_preset: 'streaming', subscription_brand: 'unknown' },
      { reminder_preset: 'streaming', subscription_brand: 'anytime-fitness' },
      { reminder_preset: 'life-insurance', subscription_brand: 'netflix' },
      { reminder_preset: 'motorcycle-loan', motorcycle_brand: 'unknown' },
    ]) {
      const item = { ...fixture(), template_key: 'other' as const, car_brand: null, motorcycle_brand: null, subscription_brand: null, ...identity };
      const html = withoutCategoryPickers(renderToStaticMarkup(createElement(UpcomingTimeline, { rows: timelineRows([item], today), today })));
      expect(html).not.toContain('-brands/');
      expect(html).toContain('reminder-icon');
      expect(html).toContain('<svg');
    }
  });
  it('keeps the household heading and useful empty planning state when no dates qualify', () => {
    for (const items of [[], [fixture('2027-01-20')], [fixture('2026-12-19')]]) {
      const html = renderToStaticMarkup(createElement(Dashboard, { items, today, name: 'Test', usage }));
      expect(html).toContain('Your household, organised.');
      expect(html).toContain('No dates saved for the next 30 days.');
      expect(html).toContain('Add item');
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
  it('keeps standalone calendar overflow and one default planning section on the dashboard', () => {
    for (const count of [1, 4, 5, 6, 10, 12]) {
      const items = Array.from({ length: count }, (_, index) => ({ ...fixture(), id: String(index), product_name: `Real reminder ${index}` }));
      const rows = timelineRows(items, today);
      const html = renderToStaticMarkup(createElement(UpcomingTimeline, { rows, today }));
      expect(html.match(/aria-haspopup="dialog"/g)).toHaveLength(Math.min(count, 5));
      expect(html.includes('View all upcoming')).toBe(count > 5);
      expect(html.includes('Show more')).toBe(count > 5);
      if (count > 5) {
        expect(html).toContain(`Show more · ${Math.min(count, 10) - 5} more`);
        expect(html).toContain('aria-expanded="false"');
      }
      expect(html).toContain('Real reminder 0 due January 3, 2027');
      expect(html).toContain('Email / Device alert');
      expect(html).toContain('role="tooltip"');
      const dashboard = renderToStaticMarkup(createElement(Dashboard, { items, today, name: 'Test', usage }));
      expect(dashboard).toContain('coming-up-title');
      expect(dashboard).toContain('planning-heading');
      expect(dashboard).not.toContain('upcoming-heading');
      expect(dashboard).not.toContain('Everything in its place.');
    }
  });
});
