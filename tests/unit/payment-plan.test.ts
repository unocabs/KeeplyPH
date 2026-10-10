import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { HouseholdPaymentPlan } from '@/components/payment-plan';
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
    for(const label of ['Mark paid','Edit amount','Add amount','Approx.'])expect(html).toContain(label);
    expect(html).not.toContain('action=amount');
    expect(html).not.toContain('Amount checked');expect(html).not.toContain('Unverified');
    expect(html).toContain('₱13,648');expect(html).toContain('1 payment needs');expect(html).toContain('Includes 2 estimates');
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
