import {describe,it,expect} from 'vitest';
import fixtures from '../fixtures/household-outlook.json';
import {sampleItems} from '@/lib/demo';
import {addDays,type AmountCertainty} from '@/features/items/planning';
import {samplePlannerRows,samplePlanner,type PlannerHorizon,type PlannerRow} from '@/features/premium/planner';
import {sampleOutlook,outlookHighest,outlookDifference,partialMonth} from '@/features/premium/outlook';
import {samplePaymentPlan,paymentTotal} from '@/features/items/insights';

interface Expense {offset:number;amount:number|null;certainty?:string;schedule_amount?:number;recurrence_months?:number;cost_expected?:boolean;kind?:string}
function records(fixture:{today:string;expenses:Expense[]}) {
 return fixture.expenses.map((expense,index)=>{
  const item=structuredClone(sampleItems(fixture.today).find(item=>item.reminder_preset==='electric-bill')!);
  item.id=`00000000-0000-4000-8000-${String(index).padStart(12,'0')}`;item.product_name='Outlook expense '+index;item.reminder_preset=expense.cost_expected===false?null:'electric-bill';
  const date=item.dates[0],occurrence=date.occurrences.find(row=>row.status==='open')!;item.dates=[date];date.id=item.id;
  date.kind=(expense.kind??(expense.cost_expected===false?'expiration':'other')) as typeof date.kind;date.label='Cost '+index;
  date.payment_amount_minor=expense.schedule_amount??expense.amount;date.payment_amount_certainty=expense.certainty==='unverified'?'unverified':'estimated';
  date.recurrence_months=expense.recurrence_months??null;date.recurrence_anchor=fixture.today;date.recurrence_ends_on=null;date.recurrence_policy='fixed';
  occurrence.due_on=addDays(fixture.today,expense.offset);occurrence.amount_certainty=(expense.certainty??(expense.amount==null?'unset':'estimated')) as AmountCertainty;occurrence.expected_amount_minor=expense.amount;date.occurrences=[occurrence];return item;
 });
}
describe('Household Outlook',()=>{
 for(const fixture of fixtures)it(fixture.name,()=>{
  const items=records(fixture),days=fixture.days as PlannerHorizon,rows=samplePlannerRows(items,fixture.today,days),plan=sampleOutlook(rows,fixture.today,days);
  expect(plan.total_minor).toBe(fixture.total_minor);expect(plan.positive_source_count).toBe(fixture.positive_sources);
  if(fixture.month_totals)expect(plan.months.map(month=>month.total_minor)).toEqual(fixture.month_totals);
  expect(plan.months.reduce((sum,month)=>sum+BigInt(month.total_minor),0n).toString()).toBe(plan.total_minor);
  expect(plan.total_minor).toBe(samplePlanner(items,fixture.today,days).total_minor);
  expect(sampleOutlook(rows,fixture.today,30).total_minor).toBe(paymentTotal(samplePaymentPlan(items,fixture.today)));
  const highest=outlookHighest(plan);if(fixture.highest)expect(highest).toMatchObject({month:{month:fixture.highest.month},ties:fixture.highest.ties,only_month:fixture.highest.only_month});else expect(highest).toBeNull();
 });
 it('shows exact covered dates and separates missing amounts, known zero and nonfinancial dates',()=>{
  const fixture=fixtures[1],plan=sampleOutlook(samplePlannerRows(records(fixture),fixture.today,90),fixture.today,90);
  expect(plan.costs).toMatchObject({total:2,known_count:1,unset_count:1,total_minor:'0'});
  expect(plan.months[0]).toMatchObject({starts_on:'2028-01-31',ends_on:'2028-01-31'});expect(partialMonth(plan.months[0])).toBe(true);
  expect(plan.months[1]).toMatchObject({starts_on:'2028-02-01',ends_on:'2028-02-29'});expect(partialMonth(plan.months[1])).toBe(false);
  expect(outlookDifference(plan.months[0],plan.months[1])).toBeNull();expect(plan.months[2].costs.total).toBe(0);expect(plan.months[2].date_count).toBe(1);
 });
 it('finds contributors beyond the first page and keeps aggregates unchanged by filters and cursors',()=>{
  const today='2028-01-31',source=samplePlannerRows(sampleItems(today),today,90)[0];
  const rows:PlannerRow[]=Array.from({length:29},(_,i)=>({...source,date_id:String(i).padStart(36,'0'),item_id:String(i),due_on:'2028-02-29',amount_minor:i===28?900000:10000,certainty:'estimated',cost_expected:true}));
  const plan=sampleOutlook(rows,today,90),last=plan.rows.at(-1)!;expect(plan.rows).toHaveLength(25);expect(plan.months[1].contributors[0].item_id).toBe('28');
  const page=sampleOutlook(rows,today,90,'2028-02-01',last.due_on,last.date_id);expect(page.rows).toHaveLength(4);expect(page.months).toEqual(plan.months);expect(page.costs).toEqual(plan.costs);
  expect(new Set([...plan.rows,...page.rows].map(row=>row.date_id))).toHaveProperty('size',29);
  expect(sampleOutlook(rows,today,90,'2000-01-01').month).toBeNull();
 });
 it('compares exact large totals, labels zero as known and refuses an empty comparison',()=>{
  const today='2028-01-31',source=samplePlannerRows(sampleItems(today),today,90)[0];
  const plan=sampleOutlook([{...source,due_on:today,amount_minor:Number.MAX_SAFE_INTEGER},{...source,due_on:'2028-02-01',amount_minor:0,certainty:'confirmed'}],today,90);
  expect(outlookDifference(plan.months[0],plan.months[1])).toBe(-9007199254740991n);expect(outlookDifference(plan.months[1],plan.months[0])).toBe(9007199254740991n);
  expect(outlookDifference(plan.months[0],plan.months[0])).toBeNull();expect(outlookDifference(plan.months[1],plan.months[2])).toBeNull();
 });
});
