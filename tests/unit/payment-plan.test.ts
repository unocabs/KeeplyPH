import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { HouseholdPaymentPlan } from '@/components/payment-plan';
import { PaymentTotals } from '@/components/household-insights';
import { sampleItems } from '@/lib/demo';
import { paymentActionContext, paymentTotal, previewPaymentChange, samplePaymentPlan, type PaymentPlan } from '@/features/items/insights';

vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock('@/features/items/insight-actions',()=>({saveOccurrenceAmount:vi.fn()}));
vi.mock('@/features/items/activity-actions',()=>({recordOccurrence:vi.fn()}));
const today='2026-10-09';
const plan=()=>samplePaymentPlan(sampleItems(today),today);

describe('payment card actions',()=>{
  it('exposes payment recording and amount actions without an item-detail detour',()=>{
    const data=plan(),contexts=Object.fromEntries(data.rows.map(row=>[row.date_id,{revision:2,can_record_payment:true}]));
    const html=renderToStaticMarkup(createElement(HouseholdPaymentPlan,{plan:data,contexts}));
    for(const label of ['Mark paid','Edit amount','Add amount','Estimated amount','Confirmed amount','Expected amount'])expect(html).toContain(label);
    expect(html).not.toContain('action=amount');
    expect(html).not.toContain('Amount checked');expect(html).not.toContain('Unverified');
    expect(html).toContain('₱13,648');expect(html).toContain('1 upcoming expense needs');expect(html).toContain('₱4,700 of this total is estimated.');
  });
  it('keeps projected dates and unavailable contexts free of unsupported write actions',()=>{
    const data=plan(),row=data.rows[0];
    const projected={...row,occurrence_id:null,projected:true};
    const html=renderToStaticMarkup(createElement(HouseholdPaymentPlan,{plan:{...data,rows:[projected]},contexts:{[row.date_id]:{revision:2,can_record_payment:true}}}));
    expect(html).toContain('A planned date, not a saved bill yet.');
    expect(html).not.toContain('Mark paid');
    expect(html).not.toContain('<button');
    const unavailable=renderToStaticMarkup(createElement(HouseholdPaymentPlan,{plan:{...data,rows:[row]}}));
    expect(unavailable).not.toContain('Mark paid');
  });
  it.each(['estimated','confirmed','unverified'] as const)('offers Mark paid for %s service costs, including zero',certainty=>{
    const data=plan(),item=sampleItems(today).find(item=>item.template_key==='car')!;
    const date=item.dates.find(date=>date.kind==='service')!;
    const row={...data.rows.find(row=>row.date_id===date.id)!,certainty,amount_minor:0};
    const context=paymentActionContext(date);
    const html=renderToStaticMarkup(createElement(HouseholdPaymentPlan,{plan:{...data,rows:[row]},contexts:{[row.date_id]:context}}));
    expect(html).toContain('Edit amount');expect(html).toContain('Mark paid');expect(html).toContain('₱0');
    expect(context.service_schedule).toEqual({recurrence_months:date.recurrence_months,recurrence_policy:date.recurrence_policy,interval_months:date.interval_months});
  });
  it('keeps warranty tracking separate from marking costs paid',()=>{
    const item=sampleItems(today).find(item=>item.template_key==='receipt')!;
    const context=paymentActionContext(item.dates.find(date=>date.kind==='warranty')!);
    expect(context.can_record_payment).toBe(false);expect(context.service_schedule).toBeUndefined();
  });
  it('combines all saved amounts without losing precision or excluding old unverified amounts',()=>{
    expect(paymentTotal(plan())).toBe('1364800');
    expect(paymentTotal({confirmed_minor:'9007199254740993',estimated_minor:'2',unverified_minor:'1'})).toBe('9007199254740996');
    const data=plan();const html=renderToStaticMarkup(createElement(HouseholdPaymentPlan,{plan:{...data,estimated_count:0,unset_count:0}}));
    expect(html).not.toContain('Includes 0');expect(html).not.toContain('0 payments need');
  });
  it('updates sample certainty totals exactly and leaves the original plan unchanged',()=>{
    const data=plan(),row=data.rows.find(row=>row.certainty==='unverified')!,before=structuredClone(data);
    const updated=previewPaymentChange(data,row,{amount:120050,certainty:'confirmed'});
    expect(updated.confirmed_minor).toBe((BigInt(data.confirmed_minor)+120050n).toString());
    expect(updated.unverified_minor).toBe((BigInt(data.unverified_minor)-BigInt(row.amount_minor!)).toString());
    expect(updated.confirmed_count).toBe(data.confirmed_count+1);expect(updated.unverified_count).toBe(data.unverified_count-1);
    expect(updated.rows.find(candidate=>candidate.date_id===row.date_id)).toMatchObject({amount_minor:120050,certainty:'confirmed'});
    expect(data).toEqual(before);
    const large={...data,confirmed_minor:'9007199254740993'} as PaymentPlan;
    expect(previewPaymentChange(large,row,{amount:1,certainty:'confirmed'}).confirmed_minor).toBe('9007199254740994');
  });
  it('removes a paid sample date from the plan and adjusts only its amount category',()=>{
    const data=plan(),row=data.rows.find(row=>row.certainty==='unset')!;
    const updated=previewPaymentChange(data,row,'paid');
    expect(updated.total).toBe(data.total-1);expect(updated.unset_count).toBe(data.unset_count-1);
    expect(updated.confirmed_minor).toBe(data.confirmed_minor);
    expect(updated.rows.some(candidate=>candidate.date_id===row.date_id&&candidate.due_on===row.due_on)).toBe(false);
  });
});

describe('Free spending clarity',()=>{
  const empty:PaymentPlan={today,ends_on:'2026-11-08',currency:'PHP',total:0,confirmed_minor:'0',estimated_minor:'0',unverified_minor:'0',confirmed_count:0,estimated_count:0,unverified_count:0,unset_count:0,has_more:false,rows:[]};
  const render=(data:PaymentPlan)=>renderToStaticMarkup(createElement(PaymentTotals,{plan:data}));
  it('distinguishes no upcoming expenses from expenses whose amounts are all unknown',()=>{
    const none=render(empty),unknown=render({...empty,total:2,unset_count:2});
    expect(none).toContain('No upcoming expenses');expect(none).not.toContain('₱0');
    expect(unknown).toContain('Amounts not added yet');expect(unknown).toContain('2 upcoming expenses need an amount');expect(unknown).not.toContain('₱0');
  });
  it('recognizes a saved zero while keeping missing expenses visible',()=>{
    const zero=render({...empty,total:1,confirmed_count:1});
    expect(zero).toContain('₱0');expect(zero).toContain('Saved amounts total zero');expect(zero).not.toContain('No upcoming expenses');
    const partial=render({...empty,total:2,confirmed_count:1,unset_count:1});
    expect(partial).toContain('₱0');expect(partial).toContain('1 upcoming expense needs an amount');
  });
  it('uses account-wide totals and missing counts even when this page has no rows',()=>{
    const html=render({...empty,total:29,confirmed_count:10,estimated_count:10,unverified_count:2,unset_count:7,confirmed_minor:'10000',estimated_minor:'123456',unverified_minor:'5000'});
    expect(html).toContain('₱1,384.56');expect(html).toContain('Known upcoming costs');expect(html).toContain('₱1,234.56 of this total is estimated');
    expect(html).toContain('₱50 uses saved amounts you haven’t confirmed');expect(html).toContain('7 upcoming expenses need an amount');
    expect(html).not.toContain('%');
  });
  it('labels a zero estimate as estimated rather than silently treating it as confirmed',()=>{
    expect(render({...empty,total:1,estimated_count:1})).toContain('₱0 of this total is estimated');
  });
});
