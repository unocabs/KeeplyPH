import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { dateAction } from '@/features/items/date-action';
import { ItemDateRow } from '@/components/item-ui';
import { dateRows } from '@/features/items/domain';
import { describe, it, expect } from 'vitest';
import { sampleItems } from '@/lib/demo';
import { alertStatus, isActiveReminder, itemsForCategory } from '@/features/items/domain';

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

it('filters individual vehicle dates without moving the vehicle or altering its dates', () => {
  const sample = sampleItems().find(item => item.template_key === 'car')!;
  const car = { ...sample, dates: sample.dates.filter(date => date.kind === 'registration') };
  const maintenance = { ...car.dates[0], id: 'service', kind: 'service' as const, label: 'PMS' };
  const insurance = { ...car.dates[0], id: 'insurance', kind: 'insurance' as const, label: 'Insurance renewal' };
  const item = { ...car, dates: [...car.dates, maintenance, insurance] };
  expect(itemsForCategory([item], 'maintenance')[0].dates.map(date => date.kind)).toEqual(['service']);
  expect(itemsForCategory([item], 'insurance')[0].dates.map(date => date.kind)).toEqual(['insurance']);
  expect(itemsForCategory([item], 'vehicles')[0].dates).toHaveLength(3);
  expect(itemsForCategory([car], 'maintenance')).toHaveLength(0);
  expect(item.dates).toHaveLength(3);
});


describe('dashboard date actions', () => {
  const rows = dateRows(sampleItems('2026-10-04'));
  it('opens the right confirmation with the original date and payment cycle', () => {
    const loan = rows.find(row => row.item.product_name?.startsWith('Home Credit'))!;
    const action = dateAction(loan, '/demo');
    expect(action.label).toBe('Mark paid');
    const url = new URL(action.href, 'https://keeplyph.com');
    expect(url.pathname).toBe('/demo/items/' + loan.item.id);
    expect(url.searchParams.get('date')).toBe(loan.date.id);
    expect(url.searchParams.get('due')).toBe(loan.occurrence.due_on);
    expect(url.searchParams.get('action')).toBe('complete');
    expect(url.hash).toBe('#date-' + loan.date.id);
    expect(dateAction(loan).href.startsWith('/items/')).toBe(true);
  });
  it('offers review for warranties and subscriptions, and appropriate completion for other dates', () => {
    for (const row of rows) {
      const action = dateAction(row);
      const url = new URL(action.href, 'https://keeplyph.com');
      if (row.date.kind === 'warranty' || row.item.reminder_preset === 'streaming') {
        expect(action.label).toBe(row.date.kind === 'warranty' ? 'Review warranty' : 'Review renewal');
        expect(url.searchParams.has('action')).toBe(false);
      }
    }
    expect(dateAction(rows.find(row => row.date.kind === 'service')!).label).toBe('Mark service done');
    expect(dateAction(rows.find(row => row.date.kind === 'registration')!).label).toBe('Mark renewed');
    expect(dateAction(rows.find(row => row.item.reminder_preset === 'prc-license')!).label).toBe('Mark renewed');
    expect(dateAction(rows.find(row => row.item.reminder_preset === 'medical-appointment')!).label).toBe('Mark done');
  });
  it('keeps the detail link and action separate, with a descriptive accessible name', () => {
    const row = rows.find(row => row.item.product_name?.startsWith('Home Credit'))!;
    const html = renderToStaticMarkup(createElement(ItemDateRow, {row, today:'2026-10-04', base:'/demo', compact:true}));
    expect(html.match(/<a\b/g)).toHaveLength(2);
    expect(html).not.toMatch(/<a\b[^>]*>(?:(?!<\/a>).)*<a\b/s);
    expect(html).toContain('aria-label="Mark paid for Home Credit');
    expect(html).toContain('action=complete');
  });
});
