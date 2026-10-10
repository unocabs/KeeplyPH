import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';

export async function testSpendingCheckup({admin,actor,user,test}) {
 const fixtures=JSON.parse(await readFile('tests/fixtures/spending-checkup.json','utf8'));
 const day=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
 const total=plan=>(BigInt(plan.confirmed_minor)+BigInt(plan.estimated_minor)+BigInt(plan.unverified_minor)).toString();
 const check=async(owner,week=null,category=null,before=null,id=null)=>(await actor(owner,'select public.household_spending_checkup($1,$2,$3,$4) data',[week,category,before,id])).rows[0].data;
 async function seed(owner,today,expenses) {
   const saved=[];
   for(const [index,expense] of expenses.entries()) {
     const item=randomUUID(),date=randomUUID(),occurrence=randomUUID(),due=day(today,expense.offset),template=expense.template??'other',preset=expense.template?null:'electric-bill';
     await admin.query("insert into public.items(id,user_id,state,product_name,template_key,reminder_preset) values($1,$2,'saved',$3,$4,$5)",[item,owner,'Checkup expense '+index,template,preset]);
     await admin.query('insert into public.important_dates(id,item_id,user_id,kind,label,payment_amount_minor,payment_amount_certainty,recurrence_months,recurrence_anchor,recurrence_policy) values($1,$2,$3,$4,\'Payment\',$5,$6,$7,$8,\'fixed\')',[date,item,owner,expense.kind??'other',expense.schedule_amount??expense.amount,expense.certainty==='unverified'?'unverified':'estimated',expense.recurrence_months??null,expense.recurrence_months?today:null]);
     await admin.query("insert into public.date_occurrences(id,date_id,user_id,cycle,due_on,expected_amount_minor,amount_certainty) values($1,$2,$3,1,$4,$5,$6)",[occurrence,date,owner,due,expense.amount,expense.certainty??(expense.amount==null?'unset':'estimated')]);
     saved.push({item,date,occurrence});
   }
   return saved;
 }
 for(const fixture of fixtures)await test('Spending Checkup shared fixture: '+fixture.name,async()=>{
   const owner=await user();await seed(owner,fixture.today,fixture.expenses);
   const read=async(week=null,category=null)=>(await admin.query('select private.household_spending_checkup($1,$2,$3,$4,null,null) data',[owner,fixture.today,week,category])).rows[0].data;
   const plan=await read();
   assert.equal(total(plan),fixture.total_minor);assert.deepEqual(plan.weeks.map(week=>week.total_minor),fixture.week_totals);
   assert.equal(plan.categories.reduce((sum,category)=>sum+BigInt(category.total_minor),0n).toString(),fixture.total_minor);
   assert.equal(plan.weeks.reduce((sum,week)=>sum+week.total,0),plan.total);
   assert.equal(plan.categories.reduce((sum,category)=>sum+category.total,0),plan.total);
   for(const category of plan.categories) {
     const filtered=await read(null,category.category);
     assert.equal(filtered.filtered_total,category.total);assert(filtered.rows.every(row=>row.reporting_category===category.category));
     assert.deepEqual(filtered.weeks,plan.weeks);assert.deepEqual(filtered.categories,plan.categories);assert.equal(total(filtered),total(plan));
   }
   if(fixture.name.includes('one repeating')) {assert.equal(plan.source_count,1);assert.equal(plan.positive_source_count,1);assert.equal(plan.total,2);}
   if(fixture.name.includes('zero stay')) {assert.equal(plan.confirmed_count,1);assert.equal(plan.unset_count,2);assert.equal(plan.categories.find(category=>category.category==='vehicles').known_count,0);}
   if(fixture.name.includes('canonical')) {
     assert.equal(plan.total,7);assert.equal(plan.categories.find(category=>category.category==='vehicles').total_minor,'20000');
     assert.equal(plan.weeks.at(-1).ends_on,day(fixture.today,30));
     const period=await read(day(fixture.today,28));assert.equal(period.filtered_total,2);assert.deepEqual(period.rows.map(row=>row.due_on),[day(fixture.today,28),day(fixture.today,30)]);
   }
 });
 await test('Spending Checkup is Premium-only, owner-scoped and private helpers cannot be called',async()=>{
   const owner=await user(),outside=await user();
   for(const role of ['anon','service_role'])await assert.rejects(actor(null,'select public.household_spending_checkup()',[],role),/permission denied/);
   for(const role of ['anon','authenticated','service_role'])await assert.rejects(actor(owner,"select private.household_spending_checkup($1,current_date,null,null,null,null)",[outside],role),/permission denied/);
   await assert.rejects(check(owner),/PREMIUM_REQUIRED/);
   await actor(owner,'select public.activate_installation_premium(true)');
   const today=(await check(owner)).today;await seed(owner,today,[{offset:0,amount:10000,certainty:'confirmed'}]);
   assert.equal(total(await check(owner)),'10000');
   await actor(outside,'select public.activate_installation_premium(true)');assert.equal((await check(outside)).total,0);
   for(const args of [[day(today,1),null,null,null],[day(today,-7),null,null,null],[null,'made-up',null,null],[null,null,today,null]])await assert.rejects(check(owner,...args),/INVALID_INPUT/);
   await admin.query("update private.household_premium_periods set starts_at=now()-interval '31 days',ends_at=now()-interval '1 day' where user_id=$1",[owner]);
   await assert.rejects(check(owner),/PREMIUM_REQUIRED/);
   const free=(await actor(owner,'select public.household_payment_plan() data')).rows[0].data;assert.equal(free.total,1);assert.equal(total(free),'10000');
 });
 await test('Spending Checkup totals and categories cover all pages in the account timezone',async()=>{
   const owner=await user();await admin.query("update public.profiles set timezone='Pacific/Kiritimati' where id=$1",[owner]);await actor(owner,'select public.activate_installation_premium(true)');
   const today=(await admin.query("select (now() at time zone 'Pacific/Kiritimati')::date::text t")).rows[0].t;
   const saved=await seed(owner,today,Array.from({length:29},(_,index)=>({offset:index===28?28:0,amount:index===0?null:index===1?0:index===28?900000:100,certainty:index===0?'unset':'estimated',...(index===28?{template:'car',kind:'service'}:{})})));
   const before=(await admin.query('select to_jsonb(o) data from public.date_occurrences o where user_id=$1 order by id',[owner])).rows;
   const plan=await check(owner);assert.equal(plan.today,today);assert.equal(plan.ends_on,day(today,30));assert.equal(plan.total,29);assert.equal(plan.rows.length,25);assert.equal(plan.unset_count,1);assert.equal(total(plan),'902600');assert.equal(plan.source_count,29);
   const last=plan.rows.at(-1),page=await check(owner,null,null,last.due_on,last.date_id);assert.equal(page.rows.length,4);assert.equal(page.has_more,false);
   assert.deepEqual(page.weeks,plan.weeks);assert.deepEqual(page.categories,plan.categories);assert.equal(total(page),total(plan));
   assert.equal(new Set([...plan.rows,...page.rows].map(row=>row.date_id+':'+row.due_on)).size,29);
   const selected=await check(owner,day(today,28),'vehicles');assert.equal(selected.filtered_total,1);assert.equal(selected.rows[0].item_id,saved.at(-1).item);assert.deepEqual(selected.weeks,plan.weeks);
   const empty=await check(owner,null,'maintenance');assert.equal(empty.filtered_total,0);assert.deepEqual(empty.rows,[]);assert.equal(total(empty),total(plan));
   assert.deepEqual((await admin.query('select to_jsonb(o) data from public.date_occurrences o where user_id=$1 order by id',[owner])).rows,before);
   const free=(await actor(owner,'select public.household_payment_plan() data')).rows[0].data;assert.equal(total(free),total(plan));
   const row=saved.at(-1);await actor(owner,'select public.complete_occurrence($1,$2,1,$3,null,\'fixed\')',[randomUUID(),row.occurrence,{activity_type:'service',title:'Completed service, payment not recorded',completed_on:today,amount_minor:12300,notes:'',document_ids:[]}]);
   assert.equal(total(await check(owner)),'2600');assert.equal((await admin.query("select count(*)::int n from public.item_activities where user_id=$1 and activity_type='payment'",[owner])).rows[0].n,0);
 });
 await test('Spending Checkup read-only prerequisites identify the full release schema',async()=>{
   const rows=(await admin.query(await readFile('supabase/check-household-spending-checkup-prerequisites.sql','utf8'))).rows;
   assert.equal(rows.length,38);assert(rows.every(row=>row.status.startsWith('PRESENT')));
 });
}
