import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {sampleItems} from '@/lib/demo';
import {plannerMonths,samplePlanner,samplePlannerRows} from '@/features/premium/planner';
import {householdEmail} from '@/lib/household-email';
import {PremiumPlans} from '@/components/premium-plans';
import {safeAuthIntent} from '@/lib/auth-intent';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({rpc:vi.fn(),fetch:vi.fn()}));
vi.mock('@/lib/supabase/admin',()=>({adminClient:()=>({rpc:mocks.rpc})}));
import {deliverHouseholdEmails} from '@/lib/household-email-worker';
const id='11111111-1111-4111-8111-111111111111',lease='22222222-2222-4222-8222-222222222222';
const row={job_id:id,item_id:id,date_id:id,product_name:'<Household & bill>',label:'Payment',due_on:'2026-10-10',amount_minor:0,certainty:'estimated',scheduled_on:'2026-10-09'};
const payload=householdEmail({from:'Keeply <test@example.test>',to:'owner@example.test',url:'https://keeplyph.com',rows:[row]});
beforeEach(()=>{
 vi.clearAllMocks();vi.useFakeTimers();vi.stubGlobal('fetch',mocks.fetch);
 vi.stubEnv('EMAIL_FROM','Keeply <test@example.test>');vi.stubEnv('RESEND_API_KEY','test-key');vi.stubEnv('APP_URL','https://keeplyph.com');
 mocks.rpc.mockImplementation(async(name)=>({data:name==='claim_household_emails'?[{id,lease_token:lease,email:payload.to,rows:[row],payload:null}]:name==='prepare_household_email'?payload:null,error:null}));
 mocks.fetch.mockResolvedValue(new Response(JSON.stringify({id:'email-id'}),{status:200}));
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.unstubAllEnvs();});
async function deliver(){const promise=deliverHouseholdEmails(Date.now());await vi.runAllTimersAsync();return promise;}
describe('household Premium planning',()=>{
 it('projects a full year, respects loan ends, and includes obligations without costs',()=>{
  const today='2028-01-31',items=sampleItems(today),plan=samplePlanner(items,today,365),short=samplePlanner(items,today,30);
  expect(plan.total).toBeGreaterThan(short.total);expect(plan.months).toHaveLength(13);
  expect(plan.rows.some(r=>r.cost_expected&&r.amount_minor===null)).toBe(true);
  const rows=samplePlannerRows(items,today,365),loan=rows.filter(r=>r.item_id===items[0].id);
  expect(loan.at(-1)!.due_on).toBe(items[0].dates[0].recurrence_ends_on);
  expect(rows.some(r=>r.kind==='expiration')).toBe(true);
  const months=plannerMonths(rows,today,plan.ends_on);
  expect(months.reduce((sum,m)=>sum+BigInt(m.total_minor),0n).toString()).toBe(plan.total_minor);
 });
 it('keeps totals exact and shows missing costs without treating dates as a complete budget',()=>{
  const sample=samplePlannerRows(sampleItems('2026-10-10'),'2026-10-10',30)[0];
  const rows=Array.from({length:3},()=>({...sample,amount_minor:Number.MAX_SAFE_INTEGER,certainty:'estimated' as const}));
  expect(plannerMonths(rows,'2026-10-10','2026-10-31')[0].total_minor).toBe('27021597764222973');
 });
 it('preserves month-end anchors, excludes completed projections and avoids invented completion-based service dates',()=>{
  const item=sampleItems('2028-01-31')[0],date=item.dates[0],current=date.occurrences.find(o=>o.status==='open')!;
  current.due_on='2028-01-31';date.recurrence_anchor=current.due_on;date.recurrence_ends_on='2028-03-31';
  date.occurrences.push({...current,id:lease,due_on:'2028-02-29',status:'completed'});
  expect(samplePlannerRows([item],'2028-01-31',365).map(r=>r.due_on)).toEqual(['2028-01-31','2028-03-31']);
  date.recurrence_policy='from_completion';expect(samplePlannerRows([item],'2028-01-31',365)).toHaveLength(1);
 });
 it('preserves safe Premium and planner intent through login',()=>{
  expect(safeAuthIntent('/planner?days=365&user=other')).toBe('/planner?days=365');
  expect(safeAuthIntent('/settings/billing?product=premium_year&amount=1')).toBe('/settings/billing?product=premium_year');
 });
 it('allows resuming the same pending checkout without opening a competing plan',()=>{
  const html=renderToStaticMarkup(createElement(PremiumPlans,{action:vi.fn(),awaitingProduct:'premium_30'}));
  expect(html).toContain('Resume existing checkout');expect(html).toMatch(/disabled=""[^>]*>Choose one year/);
  expect(html).not.toContain('name="slots"');
 });
});
describe('household email',()=>{
 it('escapes entered names, preserves zero and labels estimates, with a clear overflow count',()=>{
  const email=householdEmail({from:payload.from,to:payload.to,url:'https://keeplyph.com',rows:Array.from({length:23},()=>row)});
  expect(email.html).toContain('&lt;Household &amp; bill&gt;');expect(email.html).not.toContain('<Household & bill>');
  expect(email.text).toContain('₱0 (estimate)');expect(email.text).toContain('Plus 3 more dates');expect(email.subject).toContain('23 dates');
 });
 it('prepares one message and records one provider acceptance for the whole batch',async()=>{
  expect(await deliver()).toBe(1);
  expect(mocks.fetch).toHaveBeenCalledTimes(1);expect(mocks.fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe('keeply-household/'+id);
  expect(mocks.rpc).toHaveBeenCalledWith('finish_household_email',{p_id:id,p_lease:lease,p_status:'accepted',p_provider_id:'email-id'});
 });
 it.each([[429,'retry'],[400,'failed'],[500,'unknown']] as const)('handles provider %i as %s',async(status,outcome)=>{
  mocks.fetch.mockResolvedValue(new Response('',{status}));expect(await deliver()).toBe(0);
  expect(mocks.rpc).toHaveBeenCalledWith('finish_household_email',expect.objectContaining({p_status:outcome,p_provider_id:null}));
 });
 it('treats timeouts and malformed success as ambiguous to avoid duplicate emails',async()=>{
  mocks.fetch.mockRejectedValueOnce(new Error('timeout'));await deliver();
  expect(mocks.rpc).toHaveBeenCalledWith('finish_household_email',expect.objectContaining({p_status:'unknown'}));
  mocks.fetch.mockResolvedValue(new Response('{}',{status:200}));await deliver();
  expect(mocks.rpc).toHaveBeenLastCalledWith('finish_household_email',expect.objectContaining({p_status:'unknown'}));
 });
 it('does not contact the provider when completion or preference changes cancel preparation',async()=>{
  mocks.rpc.mockImplementation(async name=>({data:name==='claim_household_emails'?[{id,lease_token:lease,email:payload.to,rows:[row],payload:null}]:null,error:null}));
  expect(await deliver()).toBe(0);expect(mocks.fetch).not.toHaveBeenCalled();
 });
});
