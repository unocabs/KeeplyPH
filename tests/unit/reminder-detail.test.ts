import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { sampleItems, sampleUsage } from '@/lib/demo';
import { CoverageControl } from '@/components/reminder-management';
import { ItemDetail } from '@/components/item-detail';

vi.mock('@/features/items/insight-actions', () => ({ saveReadinessPreference: vi.fn(), saveOccurrenceAmount: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }), usePathname: () => '/items/test', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/features/reminders/actions', () => ({ changeCoverage: vi.fn(), coverageChoices: vi.fn() }));
vi.mock('@/features/items/actions', () => ({ snoozeDate: vi.fn(), dateHistory: vi.fn(), saveDate: vi.fn(), completeDate: vi.fn(), archiveItem: vi.fn(), deleteItem: vi.fn() }));
vi.mock('@/features/items/activity-actions', () => ({ recordOccurrence: vi.fn(), saveActivity: vi.fn(), voidActivity: vi.fn(), skipOccurrence: vi.fn(), activityHistory: vi.fn() }));
vi.mock('@/components/item-documents', () => ({ ItemDocuments: () => null }));
const today = '2026-10-05';
const items = sampleItems(today);
const item = items[0];
const usage = sampleUsage(items, today);

function coverage(overrides = {}, slots = usage, demo = false) {
  return renderToStaticMarkup(createElement(CoverageControl, { item: { ...item, ...overrides }, usage: slots, demo }));
}

describe('compact reminder alert status', () => {
  it.each([0, 4, 9, 10])('renders real account usage of %i / 10 without a warning', used => {
    const html = coverage({}, { ...usage, reminders: used, slot_limit: 10 });
    expect(html).not.toContain(`${used} / 10`);
    expect(html).not.toContain('alert slots');
    expect(html).toContain('Reminder alert enabled');
    expect(html).toContain('coverage-enabled');
    expect(html).not.toContain('alert error');
    expect(html).toContain('href="/settings/alerts"');
    expect(html).not.toContain('Add more alert slots');
  });
  it('links to demo alert preferences', () => {
    expect(coverage({}, usage, true)).toContain('href="/demo/settings/alerts"');
  });
  it('offers enable for off coverage without capacity management', () => {
    const html = coverage({ coverage: 'off' });
    expect(html).toContain('Reminder alerts off');
    expect(html).toContain('Enable alerts');
    expect(html).not.toContain('Move a slot here');
    expect(html).toContain('href="/settings/alerts"');
    expect(html).not.toContain('Reminder alert enabled');
  });
  it('does not imply delivery is enabled when paused or no dates can alert', () => {
    expect(coverage({ coverage: 'paused_capacity' })).toContain('Reminder alerts paused');
    expect(coverage({ alert_delivery_paused: true })).toContain('Reminder alerts paused');
    expect(coverage({ alert_delivery_paused: true })).toContain('href="/settings/alerts"');
    expect(coverage({ dates: [] })).toContain('Reminder alerts off');
    expect(coverage({ dates: item.dates.map(d => ({ ...d, reminders_enabled: false })) })).not.toContain('Reminder alert enabled');
  });
  it('keeps archives off and prevents coverage activation', () => {
    const html = coverage({ archived_at: '2026-10-05T00:00:00Z' });
    expect(html).toContain('Reminder alerts off');
    expect(html).not.toContain('Enable alerts');
    expect(html).not.toContain('Turn alert coverage off');
  });
});

describe('reminder action hierarchy', () => {
  function detail(selected = item) {
    return renderToStaticMarkup(createElement(ItemDetail, { item: selected, today, usage, demo: true }));
  }
  it('puts the existing payment completion action above its due date once', () => {
    const html = detail();
    expect(html.indexOf('Mark paid')).toBeLessThan(html.indexOf('Due date'));
    expect(html.match(/Mark paid/g)).toHaveLength(1);
    expect(html).toContain('button primary date-primary-action');
    expect(html).toContain('Change payment schedule');
    expect(html).toContain('Edit date &amp; schedule');
    expect(html).toContain('History (');
  });
  it('retains the appropriate completion for a nonpayment reminder', () => {
    const html = detail(items.find(i => i.template_key === 'passport')!);
    expect(html).not.toContain('Mark paid');
    expect(html).toContain('Mark renewed');
  });
  it('does not offer payment completion without an open occurrence', () => {
    const html = detail({ ...item, dates: item.dates.map(d => ({ ...d, occurrences: d.occurrences.map(o => ({ ...o, status: 'completed' as const })) })) });
    expect(html).not.toContain('Mark paid');
  });
  it('offers custom date entry with and without dates, and respects the existing limit', () => {
    expect(detail()).toContain('Add custom dates (optional)');
    expect(detail({ ...item, dates: [] })).toContain('Add date');
    expect(detail({ ...item, dates: Array.from({ length: 10 }, (_, i) => ({ ...item.dates[0], id: `date-${i}` })) })).toContain('10 date limit');
  });
});
