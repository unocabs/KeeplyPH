import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';

export async function testHouseholdOutlook({admin,actor,user,test}) {
 const fixtures=JSON.parse(await readFile('tests/fixtures/household-outlook.json','utf8'));
 const day=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
 const read=async(owner,days=90,month=null,before=null,id=null)=>(await actor(owner,'select public.household_outlook($1,$2,$3,$4) data',[days,month,before,id])).rows[0].data;
 async function seed(owner,today,expenses) {
  const saved=[],prefix=randomUUID().slice(0,24);
  for(const [index,expense] of expenses.entries()) {
   const item=randomUUID(),date=prefix+String(index).padStart(12,'0'),occurrence=randomUUID();
   await admin.query("insert into public.items(id,user_id,state,product_name,template_key,reminder_preset) values($1,$2,'saved',$3,'other',$4)",[item,owner,'Outlook expense '+index,expense.cost_expected===false?null:'electric-bill']);
   await admin.query("insert into public.important_dates(id,item_id,user_id,kind,label,payment_amount_minor,payment_amount_certainty,recurrence_months,recurrence_anchor,recurrence_policy) values($1,$2,$3,$4,$5,$6,$7,$8,$9,'fixed')",[date,item,owner,expense.kind??(expense.cost_expected===false?'expiration':'other'),'Cost '+index,expense.schedule_amount??expense.amount,expense.certainty==='unverified'?'unverified':'estimated',expense.recurrence_months??null,expense.recurrence_months?today:null]);
   await admin.query('insert into public.date_occurrences(id,date_id,user_id,cycle,due_on,expected_amount_minor,amount_certainty) values($1,$2,$3,1,$4,$5,$6)',[occurrence,date,owner,day(today,expense.offset),expense.amount,expense.certainty??(expense.amount==null?'unset':'estimated')]);
   saved.push({item,date,occurrence});
  }
  return saved;
 }
 for(const fixture of fixtures)await test('Household Outlook shared fixture: '+fixture.name,async()=>{
  const owner=await user(),saved=await seed(owner,fixture.today,fixture.expenses);
  const plan=(await admin.query('select private.household_outlook($1,$2,$3,null,null,null) data',[owner,fixture.today,fixture.days])).rows[0].data;
  assert.equal(plan.total_minor,fixture.total_minor);assert.equal(plan.positive_source_count,fixture.positive_sources);
  if(fixture.month_totals)assert.deepEqual(plan.months.map(month=>month.total_minor),fixture.month_totals);
  assert.equal(plan.months.reduce((sum,month)=>sum+BigInt(month.total_minor),0n).toString(),plan.total_minor);
  assert.equal(plan.months.reduce((sum,month)=>sum+month.date_count,0),plan.total);
  assert.equal(plan.months.reduce((sum,month)=>sum+month.costs.unset_count,0),plan.costs.unset_count);
  const projected=(await admin.query('select coalesce(sum(amount_minor),0)::text total from private.household_planning_rows($1,$2,$3)',[owner,fixture.today,fixture.days])).rows[0].total;
  assert.equal(plan.total_minor,projected);
  const short=(await admin.query('select private.household_outlook($1,$2,30,null,null,null) data',[owner,fixture.today])).rows[0].data;
  const free=(await admin.query('select coalesce(sum(amount_minor),0)::text total from private.payment_rows($1,$2)',[owner,fixture.today])).rows[0].total;
  assert.equal(short.total_minor,free);
  for(const month of plan.months) {
   const selected=(await admin.query('select private.household_outlook($1,$2,$3,$4,null,null) data',[owner,fixture.today,fixture.days,month.month])).rows[0].data;
   assert.equal(selected.filtered_total,month.date_count);assert.deepEqual(selected.months,plan.months);assert.equal(selected.total_minor,plan.total_minor);
   assert(month.contributors.length<=3);assert(month.contributors.every(row=>BigInt(row.costs.total_minor)>0n));
  }
  if(fixture.name.includes('zero and')) {assert.equal(plan.costs.total,2);assert.equal(plan.costs.known_count,1);assert.equal(plan.costs.unset_count,1);assert.equal(plan.months[2].costs.total,0);assert.equal(plan.months[2].date_count,1);}
  if(fixture.name.includes('repeating')) {assert.equal(plan.months[0].costs.estimated_minor,'0');assert.equal(plan.months[1].costs.estimated_minor,'10000');}
  if(fixture.name.includes('renewal'))assert.deepEqual(plan.months[1].contributors.map(row=>row.date_id),[saved[1].date,saved[2].date,saved[0].date]);
 });
 await test('Household Outlook is Premium-only at every horizon, owner-scoped and denies private helper access',async()=>{
  const owner=await user(),outside=await user();
  for(const days of [30,90,365])await assert.rejects(read(owner,days),/PREMIUM_REQUIRED/);
  for(const role of ['anon','service_role'])await assert.rejects(actor(null,'select public.household_outlook()',[],role),/permission denied/);
  for(const role of ['anon','authenticated','service_role'])await assert.rejects(actor(owner,'select private.household_outlook($1,current_date,365,null,null,null)',[outside],role),/permission denied/);
  await actor(owner,'select public.activate_installation_premium(true)');const today=(await read(owner)).today;
  await seed(owner,today,[{offset:0,amount:10000}]);assert.equal((await read(owner)).total_minor,'10000');
  await actor(outside,'select public.activate_installation_premium(true)');assert.equal((await read(outside)).total,0);
  for(const args of [[31],[null],[90,'2000-01-01'],[90,'2000-01-02'],[90,null,today,null]])await assert.rejects(read(owner,...args),/INVALID_INPUT/);
  await admin.query("update private.household_premium_periods set starts_at=now()-interval '31 days',ends_at=now()-interval '1 day' where user_id=$1",[owner]);
  await assert.rejects(read(owner),/PREMIUM_REQUIRED/);const free=(await actor(owner,'select public.household_planner(30) data')).rows[0].data;assert.equal(free.total_minor,'10000');assert.equal(free.costs,undefined);
 });
 await test('Household Outlook computes contributors and costs before pagination in the account timezone',async()=>{
  const owner=await user();await admin.query("update public.profiles set timezone='Pacific/Kiritimati' where id=$1",[owner]);await actor(owner,'select public.activate_installation_premium(true)');
  const today=(await admin.query("select (now() at time zone 'Pacific/Kiritimati')::date::text t")).rows[0].t;
  const next=(await admin.query("select (date_trunc('month',$1::date)+interval '1 month')::date::text t",[today])).rows[0].t;
  const offset=Math.round((Date.parse(next)-Date.parse(today))/86400000);
  const saved=await seed(owner,today,Array.from({length:29},(_,i)=>({offset:offset+(i===28?1:0),amount:i===0?null:i===1?0:i===28?900000:10000,certainty:i===0?'unset':'estimated'})));
  const before=(await admin.query('select to_jsonb(o) data from public.date_occurrences o where user_id=$1 order by id',[owner])).rows;
  const plan=await read(owner);assert.equal(plan.today,today);assert.equal(plan.total_minor,'1160000');assert.equal(plan.rows.length,25);assert.equal(plan.has_more,true);
  const month=plan.months.find(month=>month.month===next);assert.equal(month.costs.total,29);assert.equal(month.contributors[0].item_id,saved[28].item);assert.equal(month.contributors[0].costs.total_minor,'900000');
  const last=plan.rows.at(-1),page=await read(owner,90,next,last.due_on,last.date_id);assert.equal(page.rows.length,4);assert.equal(page.has_more,false);assert.deepEqual(page.months,plan.months);assert.deepEqual(page.costs,plan.costs);
  assert.equal(new Set([...plan.rows,...page.rows].map(row=>row.date_id+':'+row.due_on)).size,29);
  const empty=await read(owner,90,today.slice(0,7)+'-01');assert.equal(empty.filtered_total,0);assert.deepEqual(empty.rows,[]);assert.equal(empty.total_minor,plan.total_minor);
  assert.deepEqual((await admin.query('select to_jsonb(o) data from public.date_occurrences o where user_id=$1 order by id',[owner])).rows,before);
  // Completing a service removes its future cost without inventing a payment.
  await admin.query("update public.important_dates set kind='service' where id=$1",[saved[28].date]);
  await actor(owner,"select public.complete_occurrence($1,$2,1,$3,null,'fixed')",[randomUUID(),saved[28].occurrence,{activity_type:'service',title:'Done without recorded payment',completed_on:today,amount_minor:50000,notes:'',document_ids:[]}]);
  assert.equal((await read(owner)).total_minor,'260000');assert.equal((await admin.query("select count(*)::int n from public.item_activities where user_id=$1 and activity_type='payment'",[owner])).rows[0].n,0);
 });
 await test('Household Outlook prerequisites identify all 39 release markers',async()=>{
  const rows=(await admin.query(await readFile('supabase/check-household-outlook-prerequisites.sql','utf8'))).rows;assert.equal(rows.length,39);assert(rows.every(row=>row.status.startsWith('PRESENT')));
 });
}
