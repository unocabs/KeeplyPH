import { describe, expect, it } from 'vitest';
import { addMonths, daysUntil } from '@/lib/domain';
import { sampleItems, samplePurchases, sampleUsage } from '@/lib/demo';
import { sampleDocumentUrl } from '@/lib/demo-documents';
import { templateKeys } from '@/features/templates';
import { reminderCategories, itemCategory } from '@/features/templates/categories';
import { alertStatus, currentOccurrence, dateRows } from '@/features/items/domain';
import { capabilities } from '@/features/entitlements/domain';
import { nextRecurringDate } from '@/features/items/recurrence';

describe('expanded demo account', () => {
  for (const today of ['2026-10-04', '2027-01-31', '2028-02-29']) {
    it(`keeps coverage and every category consistent on ${today}`, () => {
      const items = sampleItems(today);
      const usage = sampleUsage(items, today);
      expect(items).toHaveLength(17);
      expect(items.filter(item => alertStatus(item) === 'enabled')).toHaveLength(15);
      expect(items.filter(item => item.coverage === 'off')).toHaveLength(2);
      expect(capabilities(usage)).toMatchObject({ slots: 20, used: 15, available: 5 });
      expect(usage.active_reminders).toBe(17);
      expect(new Set(items.map(itemCategory))).toEqual(new Set(reminderCategories.map(group => group.key)));
      expect(new Set(items.map(item => item.template_key))).toEqual(new Set(templateKeys));
      const rows = dateRows(items);
      expect(items[0].dates[0].scheduled_alerts?.map(alert => daysUntil(alert.on, today))).toEqual([2, 3]);
      expect(items[1].dates[0].scheduled_alerts?.map(alert => daysUntil(alert.on, today))).toEqual([4, 5]);
      for (const item of items) for (const date of item.dates) {
        const due = currentOccurrence(date)!.due_on;
        if (alertStatus(item, date) !== 'enabled' || due < today) expect(date.scheduled_alerts).toEqual([]);
        for (const alert of date.scheduled_alerts ?? []) {
          expect(alert.on >= today && alert.on <= due).toBe(true);
          expect(alert.channel).toBe('email');
        }
        expect(date.next_scheduled_on).toBe(date.scheduled_alerts?.[0]?.on ?? null);
      }
      expect(rows.filter(row => row.occurrence.due_on >= today).slice(0, 5).map(row => row.item.product_name)).toEqual([
        'Home Credit — phone installment', 'Meralco — bahay', 'Mama — follow-up checkup', 'Tuition ni Mia — next installment', 'Family car — Toyota Vios',
      ]);
      expect(items.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6).map(item => item.product_name)).toEqual(items.slice(0, 6).map(item => item.product_name));
    });
  }

  it('shows coherent payment history, service history, and shared vehicle coverage', () => {
    const today = '2026-10-04';
    const items = sampleItems(today);
    const loan = items[0].dates[0];
    const current = currentOccurrence(loan)!;
    expect(loan.occurrences.filter(o => o.status === 'completed')).toHaveLength(2);
    expect(loan.payment_amount_minor).toBe(189900);
    expect(nextRecurringDate(loan.recurrence_anchor!, current.due_on, loan.recurrence_months!, loan.recurrence_ends_on!)).toBe(addMonths(current.due_on, 1));
    const car = items.find(item => item.template_key === 'car')!;
    expect(car.dates.map(date => date.kind)).toEqual(['registration', 'service', 'insurance']);
    expect(car.dates.every(date => alertStatus(car, date) === 'enabled')).toBe(true);
    const aircon = items.find(item => item.template_key === 'aircon')!;
    expect(aircon.dates[0].occurrences.filter(o => o.status === 'completed')).toHaveLength(2);
    expect(currentOccurrence(aircon.dates[0])!.due_on < today).toBe(true);
    const allIds = items.flatMap(item => [item.id, ...item.dates.flatMap(date => [date.id, ...date.occurrences.map(o => o.id)]), ...item.documents.map(doc => doc.id)]);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('uses the same purchase details and warranty dates on both demo routes', () => {
    const items = sampleItems('2026-10-04');
    const purchases = samplePurchases(items);
    expect(purchases).toHaveLength(3);
    for (const purchase of purchases) {
      const item = items.find(item => item.id === purchase.id)!;
      expect(purchase.notes).toBe(item.notes);
      expect(purchase.documents).toEqual(item.documents);
      if (purchase.warranty) {
        expect(purchase.warranty.starts_on).toBe(item.purchased_on);
        expect(purchase.warranty.expires_on).toBe(currentOccurrence(item.dates[0])!.due_on);
        expect(purchase.warranty.starts_on! < purchase.warranty.expires_on).toBe(true);
      }
      for (const document of purchase.documents) expect(sampleDocumentUrl(document.id)).toBe('/demo/washing-machine-receipt.svg');
    }
    expect(sampleDocumentUrl('unknown')).toBeNull();
  });
});
