import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { activitySchema, completionType } from '@/features/items/activity';
import { safeAuthIntent } from '@/lib/auth-intent';
import { sampleItems, sampleUsage } from '@/lib/demo';
import { ActivityEditor } from '@/components/activity-editor';
import { ActivityHistory } from '@/components/activity-history';
import { Dashboard } from '@/components/dashboard';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@/features/items/activity-actions', () => ({ recordOccurrence: vi.fn(), saveActivity: vi.fn(), activityHistory: vi.fn(), voidActivity: vi.fn(), activityCorrections: vi.fn() }));
const today = '2026-10-08', items = sampleItems(today);
const aircon = items.find(item => item.template_key === 'aircon')!;

describe('household activity data', () => {
  const valid = { activity_type: 'service', title: 'Filter cleaned', completed_on: today, amount_minor: null };
  it('keeps unknown cost separate from a zero actual cost', () => {
    expect(activitySchema.parse(valid).amount_minor).toBeNull();
    expect(activitySchema.parse({ ...valid, amount_minor: 0 }).amount_minor).toBe(0);
    for(const value of [-1, 0.5, 100000000000]) expect(activitySchema.safeParse({ ...valid, amount_minor: value }).success).toBe(false);
  });
  it('rejects impossible completion dates, blank titles and malformed file identities', () => {
    for(const input of [{ completed_on:'2026-02-29' },{ title:'  ' },{ document_ids:['not-a-file'] },{ currency:'USD' }]) expect(activitySchema.safeParse({ ...valid, ...input }).success).toBe(false);
  });
  it('classifies payment and expiry without inferring a payment from every generic date', () => {
    const bill=items.find(item => item.reminder_preset === 'electric-bill')!;
    expect(completionType(bill,bill.dates[0])).toBe('payment');
    const warranty=items.find(item => item.dates.some(date => date.kind === 'warranty'))!;
    expect(completionType(warranty,warranty.dates.find(date => date.kind === 'warranty')!)).toBe('warranty_closed');
    expect(completionType(aircon,aircon.dates[0])).toBe('service');
  });
  it('preserves an occurrence identity through login without retaining arbitrary parameters', () => {
    const date='11111111-1111-4111-8111-111111111111', occurrence='22222222-2222-4222-8222-222222222222';
    const path=`/items/${date}?date=${date}&action=complete&occurrence=${occurrence}&due=2026-01-31&notes=private`;
    const saved=safeAuthIntent(path); expect(saved).toContain('occurrence='+occurrence); expect(saved).not.toContain('notes');
    expect(safeAuthIntent(path.replace(occurrence,'private-name'))).not.toContain('occurrence=');
  });
});

describe('household history presentation', () => {
  it('shows explicitly fictional service history and its actual recorded costs', () => {
    const html=renderToStaticMarkup(createElement(ActivityHistory,{item:aircon,today,demo:true}));
    expect(html).toContain('Illustrative history'); expect(html).toContain('₱600'); expect(html).toContain('Scheduled for');
    expect(html).toContain('Correct'); expect(html).toContain('Remove recorded activity');
  });
  it('keeps optional actual amounts empty and offers review without pretending the sample saves', () => {
    const date=aircon.dates[0], occurrence=date.occurrences.find(o => o.status === 'open')!;
    const html=renderToStaticMarkup(createElement(ActivityEditor,{item:aircon,date,occurrence,today,demo:true,onClose:vi.fn()}));
    expect(html).toContain('Record completion'); expect(html).toContain('This sample does not save changes');
    expect(html).toContain('Schedule from the completion date'); expect(html).toContain('Review sample activity');
    expect(html).toContain('placeholder="0.00" value=""');
  });
  it('shows unresolved totals from the account query even when the preview has no such record', () => {
    const html=renderToStaticMarkup(createElement(Dashboard,{items,usage:sampleUsage(items,today),today,name:'Alex',unconfirmed:{total:45,has_more:true,rows:[{item_id:aircon.id,product_name:'Older service',date_id:aircon.dates[0].id,occurrence_id:'22222222-2222-4222-8222-222222222222',due_on:'2026-01-01',label:'Service'}]}}));
    expect(html).toContain('45 occurrences have'); expect(html).toContain('Older service'); expect(html).toContain('href="/items/review"'); expect(html).toContain('occurrence=');
    expect(html.indexOf('Occurrences to review')).toBeLessThan(html.indexOf('Alert coverage'));
  });
});
