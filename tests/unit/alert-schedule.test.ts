import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { alertMode, nextAlertSummary, offsetsForRecurrence, presetOffsets, timingLabel } from '@/features/items/alert-schedule';
import { dateStatus } from '@/features/items/domain';
import { dateSchema } from '@/features/items/validation';
import { DateFields, initialDate } from '@/components/date-fields';
import { sampleItems } from '@/lib/demo';

describe('alert schedules', () => {
  it('offers presets accepted by the scheduler for one-time and recurring dates', () => {
    for (const recurring of [false, true]) {
      for (const mode of ['gentle', 'standard'] as const) {
        const offsets = presetOffsets(mode, recurring);
        expect(dateSchema.safeParse({ ...initialDate('other'), due_on: '2026-10-18', offsets, recurrence_months: recurring ? 1 : null }).success).toBe(true);
        expect(alertMode([...offsets].reverse(), recurring)).toBe(mode);
      }
    }
    expect(presetOffsets('standard', false).map(o => o.value)).toEqual([30, 7, 1]);
    expect(presetOffsets('standard', true).map(o => o.value)).toEqual([14, 7, 1]);
  });

  it('preserves valid custom recurrence offsets, including due-day alerts', () => {
    const custom = [{ unit: 'days' as const, value: 3 }, { unit: 'days' as const, value: 0 }];
    expect(offsetsForRecurrence(custom)).toEqual(custom);
    expect(alertMode(custom, true)).toBe('custom');
    expect(offsetsForRecurrence([{ unit: 'months', value: 6 }])).toEqual(presetOffsets('standard', true));
    expect(offsetsForRecurrence(presetOffsets('standard', false))).toEqual(presetOffsets('standard', true));
    expect(alertMode([{ unit: 'months', value: 6 }], false)).toBe('custom');
  });

  it('labels zero days and calendar months clearly', () => {
    expect(timingLabel({ unit: 'days', value: 0 })).toBe('On the due date');
    expect(timingLabel({ unit: 'days', value: 1 })).toBe('1 day before');
    expect(timingLabel({ unit: 'months', value: 1 })).toBe('1 calendar month before');
  });

  it('renders existing calendar-month schedules as custom without replacing them', () => {
    const value = { ...initialDate('passport'), due_on: '2027-10-18' };
    const html = renderToStaticMarkup(createElement(DateFields, { template: 'passport', value, onChange: () => {} }));
    expect(html).toContain('value="custom" selected');
    expect(html).toContain('12 calendar months before');
    expect(html).toContain('value="2027-10-18"');
    expect(value.offsets.map(o => o.value)).toEqual([12, 6, 3]);
  });
});

describe('next-alert presentation', () => {
  const item = sampleItems()[0];
  const date = { ...item.dates[0], next_scheduled_on: '2026-10-11', occurrences: [{ ...item.dates[0].occurrences[0], due_on: '2026-10-18' }] };
  const today = '2026-10-02';

  it('uses the queued alert date and exposes missing or delayed jobs accurately', () => {
    expect(nextAlertSummary(item, date, today).value).toContain('2026');
    expect(nextAlertSummary(item, { ...date, next_scheduled_on: null }, today).value).toBe('No alerts pending for this date');
    expect(nextAlertSummary(item, { ...date, next_scheduled_on: today }, today).value).toBe('Today');
    expect(nextAlertSummary(item, { ...date, next_scheduled_on: '2026-10-01' }, today).label).toBe('Alert awaiting delivery');
  });

  it('does not advertise queued delivery for disabled, paused, archived or completed dates', () => {
    expect(nextAlertSummary({ ...item, alert_delivery_paused: true }, date, today).label).toBe('Alerts paused');
    expect(nextAlertSummary({ ...item, coverage: 'paused_capacity' }, date, today).value).toBe('No available alert slot');
    expect(nextAlertSummary({ ...item, coverage: 'off' }, date, today).label).toBe('Alerts off');
    expect(nextAlertSummary(item, { ...date, reminders_enabled: false }, today).label).toBe('Alerts off');
    expect(nextAlertSummary({ ...item, archived_at: today }, date, today).value).toBe('Reminder archived');
    expect(nextAlertSummary(item, { ...date, occurrences: [] }, today).value).toBe('No upcoming date');
    expect(nextAlertSummary(item, date, '2026-10-19').value).toBe('No further alerts for this past date');
  });

  it('distinguishes today and a single overdue day in the countdown', () => {
    const row = { item, date, occurrence: date.occurrences[0] };
    expect(dateStatus(row, '2026-10-18')).toBe('Due today');
    expect(dateStatus(row, '2026-10-17')).toBe('1 day remaining');
    expect(dateStatus({ ...row, date: { ...date, kind: 'other' } }, '2026-10-19')).toBe('Overdue · 1 day ago');
    expect(dateStatus({ ...row, date: { ...date, kind: 'warranty' } }, '2026-10-19')).toBe('Expired · 1 day ago');
  });
});
