import { describe, expect, it } from 'vitest';
import fixtures from '../fixtures/household-planning.json';
import { sampleItems } from '@/lib/demo';
import type { ItemWithDetails, Occurrence } from '@/features/items/domain';
import { sampleHouseholdPlanningRows } from '@/features/items/planning';
import { paymentTotal, samplePaymentPlan, samplePaymentRows } from '@/features/items/insights';
import { samplePlanner, samplePlannerRows, type PlannerHorizon } from '@/features/premium/planner';

describe('shared household planning contract', () => {
  it.each(fixtures)('$name', fixture => {
    const item = structuredClone(sampleItems(fixture.today)[0]);
    Object.assign(item, { template_key: 'other', reminder_preset: 'electric-bill', archived_at: null, state: 'saved' }, fixture.item);
    const date = item.dates[0];
    Object.assign(date, {
      kind: 'other', label: 'Payment', payment_amount_minor: 10000, payment_amount_certainty: 'estimated',
      recurrence_months: null, recurrence_anchor: fixture.today, recurrence_ends_on: null, recurrence_policy: 'fixed',
    }, fixture.schedule);
    const current: Occurrence = {
      ...date.occurrences[0], due_on: fixture.today, status: 'open', completed_on: null,
      expected_amount_minor: null, amount_certainty: null, ...fixture.current,
    } as Occurrence;
    date.occurrences = [current, ...(fixture.history || []).map((entry, index) => ({
      ...current, id: 'history-' + index, ...entry, status: entry.status as Occurrence['status'],
      completed_on: entry.status === 'completed' ? entry.due_on : null,
    }))];
    const rows = sampleHouseholdPlanningRows([item as ItemWithDetails], fixture.today, fixture.days);
    expect(rows.map(row => ({
      due_on: row.due_on, amount_minor: row.amount_minor, certainty: row.certainty, projected: row.projected,
    }))).toEqual(fixture.expected);
    for (const row of rows) {
      expect(row.reporting_category).toBe(fixture.reporting_category || 'bills');
      expect(row.cost_expected).toBe(fixture.cost_expected ?? true);
      expect(row.occurrence_id).toBe(row.projected ? null : current.id);
    }
    expect(new Set(rows.map(row => row.date_id + ':' + row.due_on)).size).toBe(rows.length);
    expect(samplePlannerRows([item], fixture.today, fixture.days as PlannerHorizon).map(row => row.due_on)).toEqual(rows.map(row => row.due_on));
    const paymentRows = samplePaymentRows([item], fixture.today);
    const plannerRows = samplePlannerRows([item], fixture.today, 30).filter(row => row.cost_expected);
    expect(paymentRows.map(row => [row.date_id, row.due_on, row.amount_minor, row.certainty])).toEqual(plannerRows.map(row => [row.date_id, row.due_on, row.amount_minor, row.certainty]));
    expect(paymentTotal(samplePaymentPlan([item], fixture.today))).toBe(samplePlanner([item], fixture.today, 30).total_minor);
  });
});
