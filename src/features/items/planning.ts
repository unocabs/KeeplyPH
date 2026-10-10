import { currentOccurrence, isActiveReminder, itemIdentity, type DateWithDetails, type ItemIdentity, type ItemWithDetails, type Occurrence } from './domain';
import { nextRecurringDate } from './recurrence';
import { itemCategory, paymentDate } from '@/features/templates/categories';

export type AmountCertainty = 'confirmed' | 'estimated' | 'unverified' | 'unset';

export interface HouseholdPlanningRow {
  identity?: ItemIdentity;
  item_id: string;
  product_name: string;
  date_id: string;
  label: string;
  occurrence_id: string | null;
  due_on: string;
  amount_minor: number | null;
  certainty: AmountCertainty;
  projected: boolean;
  cost_expected: boolean;
  kind: string;
  reporting_category: string;
}

export function addDays(day: string, count: number) {
  return new Date(Date.parse(day + 'T00:00:00Z') + count * 86400000).toISOString().slice(0, 10);
}

export function occurrenceAmount(date: DateWithDetails, occurrence: Occurrence): { amount: number | null; certainty: AmountCertainty } {
  return occurrence.amount_certainty
    ? { amount: occurrence.expected_amount_minor ?? null, certainty: occurrence.amount_certainty }
    : { amount: date.payment_amount_minor ?? null, certainty: date.payment_amount_minor == null ? 'unset' : date.payment_amount_certainty || 'unverified' };
}

/** Sample-only mirror of private.household_planning_rows. Production projections run in PostgreSQL. */
export function sampleHouseholdPlanningRows(items: ItemWithDetails[], today: string, days: number): HouseholdPlanningRow[] {
  const rows: HouseholdPlanningRow[] = [];
  // Preserve the existing inclusive range: today through today + days.
  const ends = addDays(today, days);
  for (const item of items.filter(isActiveReminder)) for (const date of item.dates) {
    const current = currentOccurrence(date);
    if (!current) continue;
    const amount = occurrenceAmount(date, current);
    const costExpected = paymentDate(item.reminder_preset, date.kind, date.label) || date.payment_amount_minor != null || current.expected_amount_minor != null;
    const append = (due: string, projected: boolean) => rows.push({
      identity: itemIdentity(item), item_id: item.id, product_name: item.product_name!, date_id: date.id, label: date.label,
      occurrence_id: projected ? null : current.id, due_on: due,
      amount_minor: projected ? date.payment_amount_minor ?? null : amount.amount,
      certainty: projected ? date.payment_amount_minor == null ? 'unset' : date.payment_amount_certainty || 'unverified' : amount.certainty,
      projected, cost_expected: costExpected, kind: date.kind, reporting_category: itemCategory(item),
    });
    if (current.due_on >= today && current.due_on <= ends) append(current.due_on, false);
    if (!date.recurrence_months || date.recurrence_policy === 'from_completion') continue;
    let next = nextRecurringDate(date.recurrence_anchor || current.due_on, current.due_on >= today ? current.due_on : addDays(today, -1), date.recurrence_months, date.recurrence_ends_on || null);
    for (let n = 0; n < 13 && next && next <= ends; n++) {
      if (!date.occurrences.some(entry => entry.due_on === next && ['completed', 'skipped', 'superseded'].includes(entry.status))) append(next, true);
      next = nextRecurringDate(date.recurrence_anchor || current.due_on, next, date.recurrence_months, date.recurrence_ends_on || null);
    }
  }
  return rows.sort((a, b) => a.due_on.localeCompare(b.due_on) || a.date_id.localeCompare(b.date_id));
}
