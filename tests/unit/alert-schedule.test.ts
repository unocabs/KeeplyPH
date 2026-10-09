import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { alertMode, nextAlertSummary, offsetsForRecurrence, presetOffsets, timingLabel, withDueDateAlert } from '@/features/items/alert-schedule';
import { dateStatus } from '@/features/items/domain';
import { dateSchema } from '@/features/items/validation';
import { DateFields, initialDate } from '@/components/date-fields';
import { sampleItems } from '@/lib/demo';
import { reminderCategories, paymentPreset } from '@/features/templates/categories';

describe('alert schedules', () => {
  it('renders recurrence and valid defaults for every category choice', () => {
    for (const group of reminderCategories) {
      for (const choice of group.choices) {
        const value = { ...initialDate(choice.template, choice.focus, choice.preset), due_on: '2026-10-31' };
        const html = renderToStaticMarkup(createElement(DateFields, { template: choice.template, preset: choice.preset, value, onChange: () => {} }));
        expect(dateSchema.safeParse(value).success).toBe(true);
        expect(value.reminders_enabled).toBe(true);
        expect(value.offsets.filter(o => o.unit === 'days' && o.value === 0)).toHaveLength(1);
        expect(html).toContain('On the due date');
        if (value.kind === 'warranty') {
          expect(html).not.toContain('Recurring payment');
          expect(html).not.toContain('Repeat frequency');
        } else {
          expect(html).toContain(paymentPreset(choice.preset) ? 'Recurring payment' : (value.kind === 'service' || group.key === 'maintenance') ? 'Recurring service' : 'Repeat frequency');
          expect(html).toContain('Monthly');
          expect(html).toContain('Yearly');
        }
      }
    }
  });
  it('preselects monthly streaming and previews month-end payment dates', () => {
    const value = { ...initialDate('other', undefined, 'streaming'), due_on: '2031-01-31' };
    const html = renderToStaticMarkup(createElement(DateFields, { template: 'other', preset: 'streaming', value, onChange: () => {} }));
    expect(value.recurrence_months).toBe(1);
    expect(html).toContain('value="1" selected');
    expect(html).toContain('Upcoming dates');
    expect(html).toContain('Feb 28, 2031');
    expect(html).toContain('Mar 31, 2031');
    expect(html).toContain('Amount per payment');
    expect(html.indexOf('Next payment')).toBeLessThan(html.indexOf('Recurring payment'));
    expect(html.indexOf('Recurring payment')).toBeLessThan(html.indexOf('Send me alerts'));
  });
  it('renders existing one-time and yearly streaming schedules without applying new defaults', () => {
    for (const months of [null, 12]) {
      const value = { ...initialDate('other'), label: 'Streaming Subscription payment', due_on: '2026-10-31', recurrence_months: months, offsets: presetOffsets('gentle', Boolean(months)) };
      const html = renderToStaticMarkup(createElement(DateFields, { template: 'other', preset: 'streaming', value, onChange: () => {} }));
      expect(html).toContain(`value="${months || ''}" selected`);
      expect(value.recurrence_months).toBe(months);
    }
  });
  it('offers presets accepted by the scheduler for one-time and recurring dates', () => {
    for (const recurring of [false, true]) {
      for (const mode of ['gentle', 'standard'] as const) {
        const offsets = presetOffsets(mode, recurring);
        expect(dateSchema.safeParse({ ...initialDate('other'), due_on: '2026-10-18', offsets, recurrence_months: recurring ? 1 : null }).success).toBe(true);
        expect(alertMode([...offsets].reverse(), recurring)).toBe(mode);
      }
    }
    expect(presetOffsets('standard', false).map(o => o.value)).toEqual([30, 7, 1, 0]);
    expect(presetOffsets('standard', true).map(o => o.value)).toEqual([14, 7, 1, 0]);
  });

  it('preserves valid custom recurrence offsets, including due-day alerts', () => {
    const custom = [{ unit: 'days' as const, value: 3 }, { unit: 'days' as const, value: 0 }];
    expect(offsetsForRecurrence(custom)).toEqual(custom);
    expect(alertMode(custom, true)).toBe('custom');
    expect(offsetsForRecurrence([{ unit: 'months', value: 6 }])).toEqual(presetOffsets('standard', true, false));
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
    expect(value.offsets.map(o => o.value)).toEqual([12, 6, 3, 0]);
  });
});

describe('next-alert presentation', () => {
  const item = sampleItems()[0];
  const date = { ...item.dates[0], next_scheduled_on: '2026-10-11', occurrences: [{ ...item.dates[0].occurrences.find(o => o.status === 'open')!, due_on: '2026-10-18' }] };
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

 it('shows a queued overdue snooze separately from the actual due date', () => {
   const item = sampleItems()[0], date = item.dates[0];
   const snoozed = {...date,next_scheduled_on:'2026-10-03',occurrences:[{...date.occurrences.find(o => o.status === 'open')!,due_on:'2026-10-01',snoozed_on:'2026-10-03'}]};
   expect(nextAlertSummary(item,snoozed,'2026-10-02').value).toBe('October 3, 2026');
 });


describe('due-date alert preferences', () => {
  const value = { ...initialDate('other'), due_on: '2032-01-31' };
  it('adds due-date timing without replacing any advance timings or duplicating zero', () => {
    const offsets = presetOffsets('standard', false);
    expect(withDueDateAlert(offsets)).toEqual(offsets);
    expect(withDueDateAlert(withDueDateAlert(offsets, false))).toEqual(offsets);
    expect(dateSchema.safeParse(value).success).toBe(true);
  });
  it('preserves opting out through presets and recurring schedule changes', () => {
    const offsets = withDueDateAlert(initialDate('passport').offsets, false);
    expect(offsetsForRecurrence(offsets)).toEqual(presetOffsets('standard', true, false));
    expect(presetOffsets('gentle', true, false)).toEqual([{unit:'days',value:7}]);
    expect(alertMode(presetOffsets('standard', false, false), false)).toBe('standard');
  });
  it('accepts three advance alerts and a due-date alert, but rejects four advance alerts', () => {
    expect(dateSchema.safeParse({ ...value, offsets:[1,3,7,14].map(value => ({unit:'days',value})) }).success).toBe(false);
    expect(dateSchema.safeParse({ ...value, offsets:[{unit:'days',value:0}] }).success).toBe(true);
    expect(dateSchema.safeParse({ ...value, offsets:[] }).success).toBe(false);
    expect(dateSchema.safeParse({ ...value, reminders_enabled:false, offsets:[] }).success).toBe(true);
  });
  it('renders a due-date-only schedule with a checkbox and no early rows', () => {
    const html=renderToStaticMarkup(createElement(DateFields,{template:'other',value:{...value,offsets:[{unit:'days',value:0}]},onChange:()=>{}}));
    expect(html).toContain('Alert me on the due date');
    expect(html).toContain('On the due date');
    expect(html).toContain('Add an early alert');
    expect(html).not.toContain('Early alert 1');
  });
  it('keeps the due-date checkbox separate from custom early alerts', () => {
    const html = renderToStaticMarkup(createElement(DateFields, {template:'passport',value:{...initialDate('passport'),due_on:'2032-01-31'},onChange:()=>{}}));
    expect(html).toContain('Early alert 3');
    expect(html).toContain('Alert me on the due date');
    expect(html).not.toContain('Early alert 4');
    expect(html).not.toContain('value="0"');
    expect(html).toContain('On the due date');
  });
});
