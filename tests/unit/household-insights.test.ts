import { describe, it, expect } from 'vitest';
import { sampleItems } from '@/lib/demo';
import { addDays, formatTotal, readinessChecks, readinessComplete, sampleInsights, samplePaymentRows, samplePaymentPlan, sampleSearchMatches } from '@/features/items/insights';
const today='2026-10-08';
describe('household insights',()=>{
  it('separates sample amounts, handles unset amounts and keeps current confirmations scoped',()=>{
    const items=sampleItems(today),plan=samplePaymentPlan(items,today);
    expect(plan.confirmed_minor).toBe('839900');expect(plan.estimated_minor).toBe('120000');expect(plan.unverified_minor).toBe('54900');expect(plan.unset_count).toBe(1);
    const loan=sampleItems('2026-01-31')[0],due=loan.dates[0].occurrences.find(o=>o.status==='open')!;
    due.due_on='2026-01-31';loan.dates[0].recurrence_anchor=due.due_on;
    const rows=samplePaymentRows([loan],'2026-01-31');
    expect(rows[0].certainty).toBe('confirmed');expect(rows[1].certainty).toBe('estimated');expect(rows[1].occurrence_id).toBeNull();
  });
  it('clamps month end and excludes dates after the schedule end',()=>{
    const item=structuredClone(sampleItems('2028-01-31')[0]);
    const date=item.dates[0],current=date.occurrences.find(o=>o.status==='open')!;
    current.due_on='2028-01-31';date.recurrence_anchor=current.due_on;date.recurrence_ends_on='2028-02-29';
    expect(samplePaymentRows([item],'2028-01-31').map(r=>r.due_on)).toEqual(['2028-01-31','2028-02-29']);
    date.recurrence_ends_on='2028-02-28';expect(samplePaymentRows([item],'2028-01-31')).toHaveLength(1);
  });
  it('does not project completion-based schedules, completed dates, archived or draft items',()=>{
    const item=structuredClone(sampleItems(today)[0]);item.dates[0].recurrence_policy='from_completion';
    expect(samplePaymentRows([item],today)).toHaveLength(1);
    item.dates[0].occurrences.find(o=>o.status==='open')!.status='completed';expect(samplePaymentRows([item],today)).toEqual([]);
    expect(samplePaymentRows([{...sampleItems(today)[0],archived_at:today},{...sampleItems(today)[0],state:'draft'}],today)).toEqual([]);
  });
  it('includes overdue fixed schedules as projections without summing overdue amounts',()=>{
    const item=structuredClone(sampleItems(today)[0]);const date=item.dates[0];
    date.occurrences.find(o=>o.status==='open')!.due_on='2026-09-08';date.recurrence_anchor='2026-09-08';
    const rows=samplePaymentRows([item],today);
    expect(rows.map(r=>r.due_on)).toEqual([today]);expect(rows[0].certainty).toBe('estimated');expect(rows[0].projected).toBe(true);
  });
  it('treats a zero amount as known and an explicit unset as overriding a schedule amount',()=>{
    const item=sampleItems(today)[0],current=item.dates[0].occurrences.find(o=>o.status==='open')!;
    current.expected_amount_minor=0;expect(samplePaymentPlan([item],today).confirmed_count).toBe(1);
    current.expected_amount_minor=null;current.amount_certainty='unset';expect(samplePaymentPlan([item],today).unset_count).toBe(1);
  });
  it('does not manufacture readiness from unknown or dismissed states',()=>{
    expect(readinessComplete([{key:'warranty',state:'unknown'}])).toBe(false);
    expect(readinessComplete([{key:'warranty',state:'dismissed'}])).toBe(false);
    expect(readinessComplete([{key:'warranty',state:'not_applicable'}])).toBe(true);
  });
  it('uses category-specific criteria and never requires files or sensitive identifiers',()=>{
    const item=sampleItems(today)[3];delete item.readiness_checks;
    expect(readinessChecks(item).map(c=>c.key)).toEqual(['registration','service_history']);
    item.documents=[];expect(readinessChecks(item).some(c=>c.key==='warranty')).toBe(false);
    const passport=sampleItems(today)[10];delete passport.readiness_checks;
    expect(readinessChecks(passport)).toEqual([{key:'important_date',state:'complete'}]);
  });
  it('builds a seven-day saved-data brief including service dates and missing data',()=>{
    const result=sampleInsights(sampleItems(today),today);
    expect(result.week.ends_on).toBe(addDays(today,6));expect(result.week.payment_count).toBe(2);
    expect(result.week.services[0].product_name).toBe('Family car: Toyota Vios');
    expect(result.readiness.unknown).toBe(1);expect(result.readiness.dismissed).toBe(1);
    expect(sampleInsights([],today).readiness.total).toBe(0);
  });
  it('keeps search literal and searches notes, non-voided history and authorised ready filenames',()=>{
    const items=sampleItems(today);
    expect(sampleSearchMatches(items[0],'payday')).toBe(true);
    expect(sampleSearchMatches(items[5],'Sample washing machine receipt.svg')).toBe(true);
    const item=items[13];expect(sampleSearchMatches(item,'Aircon cleaning completed')).toBe(true);
    item.activity_history!.activities.forEach(a=>a.voided_at=today);expect(sampleSearchMatches(item,'Aircon cleaning completed')).toBe(false);
    items[5].documents[0].state='pending';expect(sampleSearchMatches(items[5],'Sample washing machine receipt.svg')).toBe(false);
    expect(sampleSearchMatches(items[0],'%')).toBe(false);
  });
  it('keeps totals exact beyond Number.MAX_SAFE_INTEGER',()=>{
    expect(formatTotal('9007199254740993')).toBe('₱90,071,992,547,409.93');
    expect(formatTotal('0')).toBe('₱0');
  });
});
