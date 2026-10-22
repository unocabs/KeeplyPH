import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import fixtures from '../fixtures/spending-checkup.json';
import { sampleItems } from '@/lib/demo';
import { addDays, type AmountCertainty } from '@/features/items/planning';
import { checkupHref, checkupRange, checkupInsights, sampleCheckupComparison, sampleSpendingCheckup, spendingShare } from '@/features/premium/checkup';
import { paymentTotal, samplePaymentPlan } from '@/features/items/insights';
import type { ItemWithDetails } from '@/features/items/domain';
import { SpendingCheckupView, SpendingCheckupInvitation } from '@/components/spending-checkup';
import { CheckupChangesView } from '@/components/checkup-changes';
import { safeAuthIntent } from '@/lib/auth-intent';

vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));

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
   expect(html).toContain('Your checkup starts with one expense');expect(html).toContain('href="/demo/checkup"');expect(html).not.toContain('Highest-cost upcoming period');expect(html).not.toContain('₱0');
   expect(html).toContain('href="/add?category=bills"');expect(html).toContain('Add its next date and an amount if you know it.');
   expect(html).toContain('Paid, completed and overdue dates are left out');expect(html).toContain('items without an upcoming expense date won’t appear here');
   const invitation=renderToStaticMarkup(createElement(SpendingCheckupInvitation,{usage:{household_premium:false} as import('@/lib/domain').Usage}));expect(invitation).toContain('₱59');expect(invitation).toContain('Free payment plan');expect(invitation).not.toContain('Your planning takeaway');
 });
 it('explains insufficient comparison data without hiding a useful amount or item identity',()=>{
   const today=fixtures[0].today,plan=sampleSpendingCheckup(items({today,expenses:[{offset:1,amount:25000,certainty:'confirmed'}]}),today);
   const html=renderToStaticMarkup(createElement(SpendingCheckupView,{plan}));
   expect(html).toContain('A little more detail, a clearer picture');expect(html).toContain('at least two different saved expenses');
   expect(html).toContain('₱250');expect(html).toContain('reminder-icon');expect(html).toContain('View expense');
   expect(html).not.toContain('id="checkup-period-heading"');
   expect(html.indexOf('id="checkup-more-data-heading"')).toBeLessThan(html.indexOf('id="checkup-expenses"'));
 });
 it('guides missing amounts and preserves correct zero amounts without inventing costs',()=>{
   const today=fixtures[0].today;
   const missing=renderToStaticMarkup(createElement(SpendingCheckupView,{plan:sampleSpendingCheckup(items({today,expenses:[{offset:1,amount:null}]}),today)}));
   expect(missing).toContain('Your dates are a good start.');expect(missing).toContain('none of these upcoming expenses has an amount');expect(missing).toContain('Add amount');expect(missing).toContain('action=amount');expect(missing).not.toContain('₱0');
   const zero=renderToStaticMarkup(createElement(SpendingCheckupView,{plan:sampleSpendingCheckup(items({today,expenses:[{offset:1,amount:0,certainty:'confirmed'}]}),today)}));
   expect(zero).toContain('Saved amounts total zero');expect(zero).toContain('Keep any correct zero amounts as they are.');expect(zero).not.toContain('Add the missing amounts');
 });
 it('offers a wider range for an empty payday period without losing the saved payday',()=>{
   const today=fixtures[0].today,payday=addDays(today,3),plan=sampleSpendingCheckup(items({today,expenses:[{offset:4,amount:10000}]}),today,{payday,mode:'payday'});
   expect(plan.total).toBe(0);expect(plan.after_payday_count).toBe(1);
   const html=renderToStaticMarkup(createElement(SpendingCheckupView,{plan,demo:true}));
   expect(html).toContain('See the next 30 days');expect(html).toContain(`href="/demo/checkup?mode=30&amp;payday=${payday}"`);expect(html).not.toContain('₱0');
   expect(html).toContain('Expenses due on payday or later are outside this view.');
 });
 it('recovers empty filters and exhausted pages without calling the whole account empty',()=>{
   const today=fixtures[0].today,records=items({today,expenses:[{offset:1,amount:25000}]});
   const filtered=sampleSpendingCheckup(records,today,{category:'vehicles'});
   const html=renderToStaticMarkup(createElement(SpendingCheckupView,{plan:filtered}));
   expect(html).toContain('No expenses match this selection yet.');expect(html).toContain('View all upcoming expenses');expect(html).toContain('₱250');expect(html).not.toContain('Your checkup starts with one expense');
   expect(html).toContain('This category has no upcoming expenses in the dates shown above.');
   const week=sampleSpendingCheckup(records,today,{week:addDays(today,7)});
   expect(renderToStaticMarkup(createElement(SpendingCheckupView,{plan:week}))).toContain('No upcoming expenses fall in this seven-day period.');
   const both=sampleSpendingCheckup(records,today,{week:addDays(today,7),category:'vehicles'});
   expect(renderToStaticMarkup(createElement(SpendingCheckupView,{plan:both}))).toContain('No upcoming expenses match both this category and this seven-day period.');
   const last=sampleSpendingCheckup(records,today).rows[0],page=sampleSpendingCheckup(records,today,{before:last.due_on,id:last.date_id});
   const ended=renderToStaticMarkup(createElement(SpendingCheckupView,{plan:page,paged:true}));
   expect(ended).toContain('You’ve reached the end of this page.');expect(ended).toContain('First page');expect(ended).toContain('View all upcoming expenses');
   expect(ended).toContain('This page starts after the last matching expense.');
 });
 it('preserves the checkup destination through sign-in without accepting query injection',()=>{
   expect(safeAuthIntent('/checkup?user=someone-else&premium=true')).toBe('/checkup');
 });
 it('shows truthful totals, date order and item artwork before collapsed analysis',()=>{
   const plan=sampleSpendingCheckup(sampleItems(fixtures[0].today),fixtures[0].today);
   const html=renderToStaticMarkup(createElement(SpendingCheckupView,{plan,demo:true}));
   expect(html).toContain('Your household ahead');expect(html).toContain('Cost breakdown');
   expect(html).toContain('subscription-brands/netflix.webp');expect(html).toContain('utilities/meralco.webp');
   expect(html.indexOf('id="checkup-expenses"')).toBeLessThan(html.indexOf('Cost breakdown'));
   expect(html).not.toMatch(/<details[^>]*open/);
   expect(html).not.toMatch(/confirmed amount|amount confirmed|not confirmed|not yet confirmed|Confirm a saved amount/i);
   for(const row of plan.rows)expect(html.toLowerCase()).toContain(`datetime="${row.due_on}"`);
 });
 it('prioritises unknown amounts and guards the linked occurrence',()=>{
   const plan=sampleSpendingCheckup(items(fixtures[2]),fixtures[2].today);
   const html=renderToStaticMarkup(createElement(SpendingCheckupView,{plan}));
   expect(html).toContain('Saved amounts total zero');expect(html).toContain('2 upcoming expenses need an amount');
   expect(html).toContain('Add the missing amounts');expect(html).toContain('action=amount');
   expect(html).toContain('occurrence='+plan.rows[0].occurrence_id);
   expect(html).toContain('Amount to add');expect(html).not.toContain('null of recorded costs');
 });
 it('does not infer an account-wide next item or quiet period from a filtered page',()=>{
   const plan=sampleSpendingCheckup(items(fixtures[3]),fixtures[3].today,{category:'vehicles'});
   const html=renderToStaticMarkup(createElement(SpendingCheckupView,{plan}));
   expect(html).toMatch(/<details[^>]*open/);expect(html).not.toContain('action=amount');
   expect(html).not.toContain('No upcoming expenses saved before');expect(html).not.toContain('No more upcoming expenses saved through');
   expect(html).toContain('₱1,000');
 });
 it('treats every non-estimated entered amount as ordinary, including legacy amounts',()=>{
   const today=fixtures[0].today;
   const plan=sampleSpendingCheckup(items({today,expenses:[{offset:0,amount:10000,certainty:'unverified'},{offset:1,amount:20000,certainty:'confirmed'}]}),today);
   const html=renderToStaticMarkup(createElement(SpendingCheckupView,{plan}));
   expect(html).toContain('₱300');expect(html).toContain('Prepare for your next expense');
   expect(html).not.toMatch(/confirmed|unverified|confirm a saved amount|Estimated costs included/i);
   expect(html).not.toContain('action=amount');
 });
 it('never presents projected dates as editable occurrences or a partial page as complete',()=>{
   const plan=sampleSpendingCheckup(items(fixtures[1]),fixtures[1].today);
   plan.rows=plan.rows.filter(row=>row.projected);
   const html=renderToStaticMarkup(createElement(SpendingCheckupView,{plan}));
   expect(html).toContain('Review saved schedule');expect(html).not.toContain('action=amount');
   const records=items({...fixtures[0],expenses:Array.from({length:29},()=>({offset:0,amount:100,certainty:'confirmed'}))});
   const full=sampleSpendingCheckup(records,fixtures[0].today);
   const paged=renderToStaticMarkup(createElement(SpendingCheckupView,{plan:full}));
   expect(paged).toContain('More expenses');expect(paged).not.toContain('No more upcoming expenses saved through');
 });
});

describe('Payday checkup',()=>{
 it('explains why change content is absent without confusing unknown history with first use',()=>{
  const base=sampleSpendingCheckup([],'2026-10-23');
  const first=renderToStaticMarkup(createElement(CheckupChangesView,{plan:{...base,comparison:{status:'first_use'}}}));
  expect(first).toContain('There isn’t a saved checkup to compare with yet.');expect(first).toContain('Open your plan to save');
  const missing=renderToStaticMarkup(createElement(CheckupChangesView,{plan:base}));
  expect(missing).toContain('We don’t have comparison information for this view yet.');expect(missing).not.toContain('There isn’t a saved checkup');
  const outside=renderToStaticMarkup(createElement(CheckupChangesView,{plan:{...base,comparison:{status:'outside_coverage'}}}));
  expect(outside).toContain('so a fair comparison isn’t available yet');
  const available={status:'available' as const,reviewed_on:'2026-10-22',previous_minor:'0',current_minor:'0',previous_missing:0,current_missing:0,previous_known:0,current_known:0,change_count:0,page:0,has_more:false,rows:[]};
  const unchanged=renderToStaticMarkup(createElement(CheckupChangesView,{plan:{...base,comparison:available}}));
  expect(unchanged).toContain('There’s no change list because');expect(unchanged).toContain('these same dates');
  const end=renderToStaticMarkup(createElement(CheckupChangesView,{plan:{...base,comparison:{...available,change_count:30,page:2}}}));
  expect(end).toContain('This page starts after the last change');expect(end).toContain('Previous changes');
 });
 it('excludes payday and preserves zero, unknown, exact sums and truncated weeks',()=>{
  const today='2026-12-28',records=items({today,expenses:[{offset:0,amount:0,certainty:'confirmed'},{offset:7,amount:189900,certainty:'unverified'},{offset:7,amount:null},{offset:8,amount:350000,certainty:'estimated'}]});
  const plan=sampleSpendingCheckup(records,today,{payday:addDays(today,8),mode:'payday'});
  expect(plan.ends_on).toBe('2027-01-04');expect(plan.total).toBe(3);expect(paymentTotal(plan)).toBe('189900');expect(plan.unset_count).toBe(1);
  expect(plan.weeks).toHaveLength(2);expect(plan.weeks.at(-1)?.ends_on).toBe(plan.ends_on);expect(plan.after_payday_count).toBe(1);
  expect(plan.rows.every(row=>row.due_on<addDays(today,8))).toBe(true);
  expect(paymentTotal(sampleSpendingCheckup(records,today,{payday:addDays(today,8),mode:'30'}))).toBe('539900');
 });
 it('uses the default window for passed or unsupported dates without assuming another payday',()=>{
  const today='2028-02-28';
  expect(checkupRange(today,'2028-03-01','payday')).toEqual({mode:'payday',ends_on:'2028-02-29'});
  for(const payday of [undefined,today,addDays(today,-1),addDays(today,366)])expect(checkupRange(today,payday,'payday')).toEqual({mode:'30',ends_on:addDays(today,30)});
  expect(checkupRange(today,addDays(today,365),'payday').ends_on).toBe(addDays(today,364));
 });
 it('keeps the chosen range through filters and change pages, and keeps sample dates out of private URLs',()=>{
  const plan={mode:'payday' as const,saved_payday:'2026-10-30'};
  expect(checkupHref('/demo',plan,{view:'changes',changePage:'2'})).toBe('/demo/checkup?mode=payday&payday=2026-10-30&view=changes&changePage=2');
  expect(checkupHref('',plan,{category:'bills'})).toBe('/checkup?mode=payday&category=bills');
 });
 it('makes the fictional comparison reconcile and labels it explicitly',()=>{
  const today='2026-10-22',records=sampleItems(today),filter={payday:addDays(today,8),mode:'payday'},comparison=sampleCheckupComparison(records,today,filter);
  expect(comparison.status).toBe('available');if(comparison.status!=='available')return;
  expect(comparison.previous_minor).toBe('489900');expect(comparison.current_minor).toBe('539900');expect(comparison.rows[0].product_name).toContain('Toyota');
  expect(comparison.previous_missing).toBe(1);expect(comparison.rows[0].before_minor).toBe('300000');expect(comparison.rows[0].after_minor).toBe('350000');
  const plan={...sampleSpendingCheckup(records,today,filter),comparison};
  const html=renderToStaticMarkup(createElement(SpendingCheckupView,{plan,demo:true}));expect(html).toContain('Illustrative comparison');expect(html).toContain('₱500 more in known costs');
  expect(html).not.toMatch(/unconfirmed|confirmed amounts|not yet confirmed/);
 });
});
