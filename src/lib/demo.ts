import { addMonths, todayIn, type PurchaseWithDetails, type Usage } from './domain';
import { defaultOffsets, reminderPresets, type DateKind, type ReminderPreset, type TemplateKey } from '@/features/templates';
import { comingUp, dateRows, type DateWithDetails, type ItemWithDetails } from '@/features/items/domain';
import { readinessChecks } from '@/features/items/insights';
import { activityTitle, completionType, type UnconfirmedSummary } from '@/features/items/activity';

// Stable IDs preserve existing sample links, including the passport and receipt previews.
const ids = {
  washing: '11111111-1111-4111-8111-111111111111',
  fan: '22222222-2222-4222-8222-222222222222',
  headphones: '88888888-8888-4888-8888-888888888888',
  car: '99999999-9999-4999-8999-999999999999',
  passport: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  licence: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  aircon: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
};
const day = (today: string, offset: number) => new Date(Date.parse(today + 'T00:00:00Z') + offset * 86400000).toISOString().slice(0, 10);
const sampleId = (index: number) => `dddddddd-dddd-4ddd-8ddd-${String(index).padStart(12, '0')}`;

interface Sample {
  id?: string;
  name: string;
  note: string;
  template?: TemplateKey;
  preset?: ReminderPreset;
  kind?: DateKind;
  due: number | null;
  recurrence?: number;
  amount?: number;
  history?: boolean;
  covered?: boolean;
  merchant?: string;
  price?: number;
  bought?: number;
}

// Preserve array indices for stable sample links. Household priorities determine the overview order.
const householdOrder = [1, 6, 5, 13, 0, 3, 7, 8, 4, 2, 9, 10, 11, 12, 14, 15, 16];
const samples: Sample[] = [
  { name: 'Home Credit: phone installment', preset: 'credit-card-installment', due: 3, recurrence: 1, amount: 189900, history: true, note: 'Set aside payment after payday. Keep the payment confirmation.' },
  { name: 'Meralco: household electricity', preset: 'electric-bill', due: 5, recurrence: 1, note: 'Check the bill before paying. The amount can change each month.' },
  { name: 'Mia’s tuition: next installment', preset: 'tuition', due: 9, amount: 650000, note: 'Check the school’s payment schedule for the amount and due date.' },
  { id: ids.car, name: 'Family car: Toyota Vios', template: 'car', kind: 'registration', due: 27, note: 'Keep it ready for school runs and trips home.' },
  { name: 'Family checkup: follow-up appointment', preset: 'medical-appointment', due: 7, note: 'Confirm the appointment and prepare questions for the doctor.' },
  { id: ids.washing, name: 'Washing machine: receipt & warranty', template: 'receipt', kind: 'warranty', due: 23, merchant: 'SM Appliance', price: 2399500, bought: -342, note: 'Keep the receipt here in case it needs repairs.' },
  { name: 'PLDT: home internet', preset: 'internet-bill', due: 18, recurrence: 1, amount: 120000, note: 'Used for work and online classes. Include in the monthly budget.' },
  { name: 'Life insurance: quarterly premium', preset: 'life-insurance', due: 40, recurrence: 3, amount: 450000, note: 'Set aside the premium before the next quarter.' },
  { name: 'Netflix: monthly renewal', preset: 'streaming', due: 21, recurrence: 1, amount: 54900, note: 'Check if we still use it before the next charge.' },
  { name: 'Honda Click: daily commute', template: 'motorcycle', kind: 'registration', due: 65, note: 'Check the next oil change and registration dates.' },
  { id: ids.passport, name: 'Passport: my renewal', template: 'passport', kind: 'expiration', due: 244, note: 'Check the expiry date before booking a trip.' },
  { id: ids.licence, name: 'Driver’s license: my renewal', template: 'licence', kind: 'expiration', due: 400, note: 'Check the expiry date and plan a day for renewal.' },
  { name: 'PRC license: my renewal', preset: 'prc-license', due: 90, note: 'Check the requirements before renewing.' },
  { id: ids.aircon, name: 'Bedroom aircon: next cleaning', template: 'aircon', kind: 'service', due: -3, history: true, note: 'Keep the last cleaning date and technician’s number here.' },
  { name: 'Family reunion: confirm our attendance', due: 35, note: 'Confirm how many of us are coming.' },
  { id: ids.fan, name: 'Electric fan: receipt', template: 'receipt', due: null, covered: false, merchant: 'Abenson', price: 249500, bought: -8, note: 'Keep the receipt in case we need it later.' },
  { id: ids.headphones, name: 'Old headphones: expired warranty', template: 'receipt', kind: 'warranty', due: -45, covered: false, merchant: 'Electronics shop', price: 299500, bought: -410, note: 'The warranty has ended. Keep the purchase details for reference.' },
];

export function sampleItems(today = todayIn()): ItemWithDetails[] {
  return samples.map((sample, index) => {
    const id = sample.id || sampleId(index);
    const template = sample.template || 'other';
    const timestamp = day(today, -householdOrder.indexOf(index)) + 'T09:00:00Z';
    const covered = sample.covered !== false;
    const item: ItemWithDetails = {
      id, user_id: 'sample', state: 'saved', product_name: sample.name,
      purchased_on: sample.bought == null ? null : day(today, sample.bought),
      merchant: sample.merchant || null, price_minor: sample.price ?? null, currency: 'PHP',
      category: template === 'receipt' ? (id === ids.headphones ? 'electronics' : 'appliances') : null,
      notes: sample.note, revision: 1, created_at: timestamp, updated_at: timestamp,
      utility_id: sample.preset === 'electric-bill' ? 'meralco' : sample.preset === 'internet-bill' ? 'pldt' : null, utility_name: null,
      insurer_id: sample.preset === 'life-insurance' ? 'sun-life' : null, insurer_name: null,
      lender_id: sample.preset === 'credit-card-installment' ? 'home-credit' : null, lender_name: null,
      template_key: template, subscription_brand: sample.preset === 'streaming' ? 'netflix' : null, car_brand: template === 'car' ? 'toyota' : null, motorcycle_brand: template === 'motorcycle' ? 'honda' : null, reminder_preset: sample.preset || null, template_version: 1,
      archived_at: null, coverage: covered ? 'covered' : 'off', dates: [], documents: [],
    };
    function addDate(kind: DateKind, label: string, offset: number, options: { recurrence?: number; amount?: number; history?: boolean } = {}) {
      const dateId = sampleId(100 + index * 10 + item.dates.length);
      const due = day(today, offset);
      const frequency = options.recurrence;
      const anchor = frequency ? addMonths(due, -frequency * 2) : null;
      const timings = frequency ? [14, 7, 1, 0].map(value => ({ unit: 'days' as const, value })) : defaultOffsets(template, kind);
      const alertDays = covered && offset >= 0 ? [...new Set(timings.map(t => t.unit === 'months' ? addMonths(due, -t.value) : day(due, -t.value)))].filter(d => d >= today).sort() : [];
      const nextAlert = alertDays[0] || null;
      const date: DateWithDetails = {
        id: dateId, item_id: id, user_id: 'sample', kind, label,
        starts_on: kind === 'warranty' ? item.purchased_on : null, serial_number: null, notes: null,
        reminders_enabled: covered, reminders_enabled_at: covered ? timestamp : null,
        reminder_disabled_reason: null, interval_months: template === 'aircon' ? 6 : null,
        revision: 1, created_at: timestamp, updated_at: timestamp, offsets: timings,
        recurrence_months: frequency || null, recurrence_anchor: anchor,
        recurrence_ends_on: index === 0 ? addMonths(due, 7) : null,
        payment_amount_minor: options.amount ?? null, payment_amount_certainty: index === 8 ? 'unverified' : 'estimated', recurrence_policy: 'fixed', next_scheduled_on: nextAlert,
        scheduled_alerts: alertDays.map(on => ({ on, channel: 'email' as const })),
        occurrences: [],
      };
      if (options.history) {
        for (let cycle = 1; cycle <= 2; cycle++) {
          const past = addMonths(due, -(frequency || 6) * (3 - cycle));
          date.occurrences.push({ id: sampleId(1000 + index * 100 + item.dates.length * 10 + cycle), date_id: dateId, user_id: 'sample', cycle, due_on: past, status: index === 0 && cycle === 2 ? 'unconfirmed' : 'completed', completed_on: index === 0 && cycle === 2 ? null : past, created_at: timestamp });
        }
      }
      date.occurrences.push({ id: sampleId(1000 + index * 100 + item.dates.length * 10 + 3), date_id: dateId, user_id: 'sample', cycle: options.history ? 3 : 1, due_on: due, status: 'open', completed_on: null, created_at: timestamp });
      item.dates.push(date);
    }
    if (sample.due !== null) {
      const kind = sample.kind || 'other';
      const label = sample.preset ? reminderPresets[sample.preset].dateLabel : ({ registration: 'Registration', expiration: 'Expiration', warranty: 'Warranty', service: 'Aircon cleaning', other: 'Confirm attendance', insurance: 'Insurance renewal' }[kind]);
      addDate(kind, label, sample.due, { recurrence: sample.recurrence, amount: sample.amount, history: sample.history });
    }
    if (template === 'car') {
      addDate('service', 'Maintenance / PMS', 6);
      addDate('insurance', 'Insurance renewal', 45);
    }
    if (template === 'motorcycle') addDate('service', 'Oil change', 32);
    if (sample.preset === 'life-insurance') addDate('other', 'Policy review', 180);
    if (id === ids.washing) {
      item.documents = [{ id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', purchase_id: id, user_id: 'sample', kind: 'receipt', state: 'ready', staging_key: '', object_key: '/demo/washing-machine-receipt.svg', original_name: 'Sample washing machine receipt.svg', mime_type: 'image/svg+xml', size_bytes: null, reserved_bytes: 0, checksum: null, upload_expires_at: timestamp, created_at: timestamp }];
    }
    item.activity_history = {
      activities: item.dates.flatMap(date => date.occurrences.filter(o => o.status === 'completed').map(o => ({
        id: o.id, user_id: 'sample', item_id: item.id, occurrence_id: o.id, scheduled_on: o.due_on,
        activity_type: completionType(item, date), title: activityTitle(item, date), completed_on: o.completed_on!,
        amount_minor: date.kind === 'service' ? 60000 : null, currency: 'PHP' as const, notes: null, actor_id: null,
        source: 'recorded' as const, revision: 1, voided_at: null, document_ids: [],
        created_at: o.completed_on + 'T09:00:00Z', updated_at: o.completed_on + 'T09:00:00Z',
      }))).sort((a, b) => b.created_at.localeCompare(a.created_at)),
      has_more: false,
    };
    if ([0,2].includes(index)) { const occurrence = item.dates[0].occurrences.find(o=>o.status==='open')!; occurrence.expected_amount_minor=sample.amount; occurrence.amount_certainty='confirmed'; }
    item.readiness_checks=readinessChecks(item).map(check=>index===15&&check.key==='warranty'?{...check,state:'unknown'}:index===9&&check.key==='service_history'?{...check,state:'dismissed'}:check);
    return item;
  });
}

export function samplePurchases(items = sampleItems()): PurchaseWithDetails[] {
  return items.filter(item => item.template_key === 'receipt').map(item => {
    const date = item.dates.find(date => date.kind === 'warranty');
    const occurrence = date?.occurrences.find(o => o.status === 'open');
    return { ...item, warranty: date && occurrence ? {
      id: date.id, purchase_id: item.id, user_id: 'sample', starts_on: date.starts_on,
      expires_on: occurrence.due_on, serial_number: null, notes: null,
      reminders_enabled: date.reminders_enabled, reminders_enabled_at: date.reminders_enabled_at,
      reminder_disabled_reason: null, created_at: date.created_at, updated_at: date.updated_at,
    } : null };
  });
}

export function sampleUsage(items: ItemWithDetails[], today = todayIn()): Usage {
  const rows = dateRows(items);
  return {
    purchases: items.length, active_reminders: items.length,
    reminders: items.filter(item => item.coverage === 'covered').length,
    slot_limit: 20, uncovered: items.filter(item => item.coverage === 'off').length,
    storage_bytes: 0, premium: false, premium_until: null,
    upcoming: comingUp(rows, today).length, overdue: rows.filter(row => row.occurrence.due_on < today).length,
  };
}

// Same review shape and cursor order as the private account query. All examples are fictional.
export function sampleUnconfirmed(items: ItemWithDetails[], before?: string, beforeId?: string): UnconfirmedSummary {
  const rows = items.filter(item => item.state === 'saved' && !item.archived_at).flatMap(item => item.dates.flatMap(date => date.occurrences.filter(o => o.status === 'unconfirmed').map(o => ({ item_id:item.id,product_name:item.product_name!,date_id:date.id,occurrence_id:o.id,due_on:o.due_on,label:date.label }))))
    .sort((a,b) => a.due_on.localeCompare(b.due_on) || a.occurrence_id.localeCompare(b.occurrence_id));
  const page = rows.filter(row => !before || !beforeId || row.due_on > before || (row.due_on === before && row.occurrence_id > beforeId));
  return { total:rows.length,rows:page.slice(0,20),has_more:page.length > 20 };
}
