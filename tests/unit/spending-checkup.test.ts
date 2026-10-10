import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import fixtures from '../fixtures/spending-checkup.json';
import { sampleItems } from '@/lib/demo';
import { addDays, type AmountCertainty } from '@/features/items/planning';
import { checkupInsights, sampleSpendingCheckup, spendingShare } from '@/features/premium/checkup';
import { paymentTotal, samplePaymentPlan } from '@/features/items/insights';
import type { ItemWithDetails } from '@/features/items/domain';
import { SpendingCheckupView, SpendingCheckupInvitation } from '@/components/spending-checkup';
import { safeAuthIntent } from '@/lib/auth-intent';

interface FixtureExpense { offset:number; amount:number|null; certainty?:string; template?:string; kind?:string; schedule_amount?:number; recurrence_months?:number }
function items(fixture:{today:string;expenses:FixtureExpense[]}):ItemWithDetails[] {
 return fixture.expenses.map((expense,index)=>{
   const item=structuredClone(sampleItems(fixture.today).find(item=>item.reminder_preset==='electric-bill')!);
   item.id=`00000000-0000-4000-8000-${String(index).padStart(12,'0')}`;
   item.product_name='Expense '+index;item.template_key=(expense.template??'other') as ItemWithDetails['template_key'];item.reminder_preset=expense.template?null:'electric-bill';
   const date=item.dates[0],occurrence=date.occurrences.find(row=>row.status==='open')!;
   item.dates=[date];date.id=item.id;date.kind=(expense.kind??'other') as typeof date.kind;date.label='Payment';
   date.payment_amount_minor=expense.schedule_amount??expense.amount;date.payment_amount_certainty=expense.certainty==='unverified'?'unverified':'estimated';
   date.recurrence_months=expense.recurrence_months??null;date.recurrence_anchor=fixture.today;date.recurrence_policy='fixed';date.recurrence_ends_on=null;
   occurrence.id=item.id;occurrence.due_on=addDays(fixture.today,expense.offset);occurrence.expected_amount_minor=expense.amount;occurrence.amount_certainty=(expense.certainty??(expense.amount==null?'unset':'estimated')) as AmountCertainty;
   date.occurrences=[occurrence];return item;
 });
}
describe('30-Day Spending Checkup',()=>{
 for(const fixture of fixtures)it(fixture.name,()=>{
   const records=items(fixture),plan=sampleSpendingCheckup(records,fixture.today),insights=checkupInsights(plan);
   expect(paymentTotal(plan)).toBe(fixture.total_minor);expect(plan.weeks.map(week=>week.total_minor)).toEqual(fixture.week_totals);
   expect(plan.categories.reduce((sum,category)=>sum+BigInt(category.total_minor),0n).toString()).toBe(fixture.total_minor);
   expect(paymentTotal(samplePaymentPlan(records,fixture.today))).toBe(fixture.total_minor);
   if(fixture.insight)expect(insights).toMatchObject({highest:plan.weeks[fixture.insight.highest_index],ties:fixture.insight.ties,only_period:fixture.insight.only_period,share:fixture.insight.share});
   else expect(insights).toBeNull();
 });
 it('includes the full account in insights and preserves filters across pages',()=>{
   const fixture=fixtures[0],records=items({...fixture,expenses:Array.from({length:29},(_,index)=>({offset:index===28?28:0,amount:index===28?900000:100,certainty:'estimated'}))});
   const plan=sampleSpendingCheckup(records,fixture.today);expect(plan.total).toBe(29);expect(plan.rows).toHaveLength(25);expect(checkupInsights(plan)?.highest.starts_on).toBe(addDays(fixture.today,28));
   const last=plan.rows.at(-1)!,page=sampleSpendingCheckup(records,fixture.today,{before:last.due_on,id:last.date_id});
   expect(page.rows).toHaveLength(4);expect(page.weeks).toEqual(plan.weeks);expect(page.categories).toEqual(plan.categories);
   const selected=sampleSpendingCheckup(records,fixture.today,{week:addDays(fixture.today,28),category:'bills'});
   expect(selected.filtered_total).toBe(1);expect(selected.rows[0].amount_minor).toBe(900000);expect(selected.weeks).toEqual(plan.weeks);
 });
 it('keeps exact large-money shares and does not round a partial share to 100 percent',()=>{
   expect(spendingShare('9007199254740993','18014398509481986')).toBe('50%');
   expect(spendingShare('1','1000000')).toBe('<0.1%');expect(spendingShare('999999','1000000')).toBe('>99.9%');
   expect(spendingShare('0','0')).toBeNull();expect(spendingShare('0','100')).toBe('0%');
 });
 it('keeps low-data sample education separate from real totals',()=>{
   const plan=sampleSpendingCheckup([],fixtures[0].today),html=renderToStaticMarkup(createElement(SpendingCheckupView,{plan}));
   expect(html).toContain('Build a useful checkup');expect(html).toContain('href="/demo/checkup"');expect(html).not.toContain('Highest-cost upcoming period');expect(html).not.toContain('₱0');
   const invitation=renderToStaticMarkup(createElement(SpendingCheckupInvitation,{usage:{household_premium:false} as import('@/lib/domain').Usage}));expect(invitation).toContain('₱59');expect(invitation).toContain('Free payment plan');expect(invitation).not.toContain('Your planning takeaway');
 });
 it('preserves the checkup destination through sign-in without accepting query injection',()=>{
   expect(safeAuthIntent('/checkup?user=someone-else&premium=true')).toBe('/checkup');
 });
});
