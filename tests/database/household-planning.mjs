import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';

const projection = rows => rows.map(row => ({
 due_on:row.due_on,amount_minor:row.amount_minor==null?null:Number(row.amount_minor),certainty:row.certainty,projected:row.projected,
}));
const sum = rows => rows.reduce((total,row)=>total+BigInt(row.amount_minor??0),0n).toString();

export async function seedHouseholdPlanning({admin,user}) {
 const prerequisites=(await admin.query(await readFile('supabase/check-household-planning-prerequisites.sql','utf8'))).rows;
 assert.equal(prerequisites.length,37);
 assert(prerequisites.slice(0,-1).every(row=>row.status.startsWith('PRESENT')));
 assert(prerequisites.at(-1).status.startsWith('MISSING'));
 const fixtures=JSON.parse(await readFile('tests/fixtures/household-planning.json','utf8'));
 const seeds=[];
 for(const fixture of fixtures) {
  const owner=await user(),item=randomUUID(),date=randomUUID(),occurrence=randomUUID();
  const identity={template_key:'other',reminder_preset:'electric-bill',state:'saved',archived_at:null,price_minor:null,...fixture.item};
  const schedule={kind:'other',label:'Payment',payment_amount_minor:10000,payment_amount_certainty:'estimated',recurrence_months:null,recurrence_anchor:fixture.today,recurrence_ends_on:null,recurrence_policy:'fixed',...fixture.schedule};
  const current={due_on:fixture.today,expected_amount_minor:null,amount_certainty:null,status:'open',completed_on:null,...fixture.current};
  await admin.query('insert into public.items(id,user_id,state,product_name,template_key,reminder_preset,archived_at,price_minor) values($1,$2,$3,$4,$5,$6,$7,$8)',[item,owner,identity.state,fixture.name,identity.template_key,identity.reminder_preset,identity.archived_at,identity.price_minor]);
  await admin.query('insert into public.important_dates(id,item_id,user_id,kind,label,payment_amount_minor,payment_amount_certainty,recurrence_months,recurrence_anchor,recurrence_ends_on,recurrence_policy) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[date,item,owner,schedule.kind,schedule.label,schedule.payment_amount_minor,schedule.payment_amount_certainty,schedule.recurrence_months,schedule.recurrence_months?schedule.recurrence_anchor:null,schedule.recurrence_ends_on,schedule.recurrence_policy]);
  await admin.query('insert into public.date_occurrences(id,date_id,user_id,cycle,due_on,expected_amount_minor,amount_certainty,status,completed_on) values($1,$2,$3,1,$4,$5,$6,$7,$8)',[occurrence,date,owner,current.due_on,current.expected_amount_minor,current.amount_certainty,current.status,current.completed_on]);
  if(fixture.paid_amount_minor!=null)await admin.query("update public.item_activities set activity_type='payment',amount_minor=$2,source='recorded' where occurrence_id=$1",[occurrence,fixture.paid_amount_minor]);
  for(const [index,entry] of (fixture.history||[]).entries())await admin.query('insert into public.date_occurrences(date_id,user_id,cycle,due_on,status,completed_on) values($1,$2,$3,$4,$5,$6)',[date,owner,index+2,entry.due_on,entry.status,entry.status==='completed'?entry.due_on:null]);
  const read=async(name,days)=> (await admin.query(`select r.*,r.due_on::text as due_on from private.${name}($1,$2${days==null?'':',$3'}) r order by r.due_on,r.date_id`,days==null?[owner,fixture.today]:[owner,fixture.today,days])).rows;
  seeds.push({fixture,owner,item,date,occurrence,read,
   beforePlanner:await read('household_planner_rows',fixture.days),beforePayments:await read('payment_rows'),
   beforeItem:(await admin.query('select to_jsonb(i) data from public.items i where id=$1',[item])).rows[0].data,
   beforeDates:(await admin.query('select to_jsonb(d) data from public.important_dates d where id=$1',[date])).rows[0].data,
   beforeHistory:(await admin.query('select to_jsonb(o) data from public.date_occurrences o where date_id=$1 order by cycle',[date])).rows,
   beforeActivities:(await admin.query('select to_jsonb(a) data from public.item_activities a where item_id=$1 order by id',[item])).rows,
  });
 }
 return seeds;
}

export async function testHouseholdPlanning({admin,actor,user,test},seeds) {
 for(const seed of seeds)await test('Shared SQL/sample fixture: '+seed.fixture.name,async()=>{
  const {fixture,read}=seed,rows=await read('household_planning_rows',fixture.days);
  assert.deepEqual(projection(rows),fixture.expected);
  for(const row of rows) {
   assert.equal(row.reporting_category,fixture.reporting_category||'bills');
   assert.equal(row.cost_expected,fixture.cost_expected??true);
   assert.equal(row.occurrence_id,row.projected?null:seed.occurrence);
  }
  assert.equal(new Set(rows.map(row=>row.date_id+':'+row.due_on)).size,rows.length);
  const normalize=entries=>entries.map(row=>'cost_expected' in row?{...row,cost_expected:Boolean(row.cost_expected)}:row);
  assert.deepEqual(await read('household_planner_rows',fixture.days),normalize(seed.beforePlanner));
  assert.deepEqual(await read('payment_rows'),seed.beforePayments);
  const short=await read('household_planning_rows',30),payments=await read('payment_rows');
  assert.deepEqual(projection(payments),projection(short.filter(row=>row.cost_expected)));
  assert.equal(sum(payments),sum(short));
  assert.deepEqual((await admin.query('select to_jsonb(i) data from public.items i where id=$1',[seed.item])).rows[0].data,seed.beforeItem);
  assert.deepEqual((await admin.query('select to_jsonb(d) data from public.important_dates d where id=$1',[seed.date])).rows[0].data,seed.beforeDates);
  assert.deepEqual((await admin.query('select to_jsonb(o) data from public.date_occurrences o where date_id=$1 order by cycle',[seed.date])).rows,seed.beforeHistory);
  assert.deepEqual((await admin.query('select to_jsonb(a) data from public.item_activities a where item_id=$1 order by id',[seed.item])).rows,seed.beforeActivities);
 });

 await test('Shared planning helpers remain private and public guards retain account isolation',async()=>{
  const owner=seeds[0].owner,outside=await user();
  for(const role of ['anon','authenticated','service_role'])for(const name of ['household_planning_rows','household_planner_rows'])await assert.rejects(actor(owner,`select private.${name}($1,$2,365)`,[owner,'2028-01-31'],role),/permission denied/);
  await assert.rejects(actor(owner,'select private.payment_rows($1,$2)',[owner,'2028-01-31']),/permission denied/);
  await assert.rejects(actor(owner,'select public.household_planner(90)'),/PREMIUM_REQUIRED/);
  assert.equal((await actor(outside,'select public.household_payment_plan() data')).rows[0].data.total,0);
  assert.equal((await actor(outside,'select public.household_planner(30) data')).rows[0].data.total,0);
  for(const role of ['anon','service_role'])await assert.rejects(actor(null,'select public.household_payment_plan()',[],role),/permission denied/);
 });

 await test('Shared planning respects the profile timezone, pagination and payment/completion separation',async()=>{
  const owner=await user();await admin.query("update public.profiles set timezone='Pacific/Kiritimati' where id=$1",[owner]);
  const today=(await admin.query("select (now() at time zone timezone)::date::text t from public.profiles where id=$1",[owner])).rows[0].t;
  const items=[];
  for(let n=0;n<28;n++) {
   const item=randomUUID(),date=randomUUID();items.push({item,date});
   await admin.query("insert into public.items(id,user_id,state,product_name,template_key,reminder_preset) values($1,$2,'saved','Bill','other','electric-bill')",[item,owner]);
   await admin.query("insert into public.important_dates(id,item_id,user_id,kind,label,payment_amount_minor,payment_amount_certainty) values($1,$2,$3,'other','Payment',$4,'estimated')",[date,item,owner,n===0?null:n===1?0:100]);
   await admin.query('insert into public.date_occurrences(date_id,user_id,cycle,due_on) values($1,$2,1,$3)',[date,owner,today]);
  }
  const payments=async(before=null,id=null)=>(await actor(owner,'select public.household_payment_plan($1,$2) data',[before,id])).rows[0].data;
  const planner=async()=>(await actor(owner,'select public.household_planner(30) data')).rows[0].data;
  const first=await payments(),plan=await planner();
  assert.equal(first.today,today);assert.equal(plan.today,today);assert.equal(first.total,28);assert.equal(first.rows.length,25);
  assert.equal(first.estimated_minor,'2600');assert.equal(first.unset_count,1);assert.equal(plan.total_minor,first.estimated_minor);
  const last=first.rows.at(-1),next=await payments(last.due_on,last.date_id);
  assert.equal(next.rows.length,3);assert.equal(next.estimated_minor,first.estimated_minor);
  assert.equal(new Set([...first.rows,...next.rows].map(row=>row.date_id+':'+row.due_on)).size,28);
  const d=items[2],o=(await admin.query("select id from public.date_occurrences where date_id=$1 and status='open'",[d.date])).rows[0];
  await actor(owner,'select public.complete_occurrence($1,$2,1,$3,null,\'fixed\')',[randomUUID(),o.id,{activity_type:'completion',title:'Task finished without a recorded payment',completed_on:today,amount_minor:null,notes:'',document_ids:[]}]);
  assert.equal((await payments()).estimated_minor,'2500');assert.equal((await planner()).total_minor,'2500');
  assert.equal((await admin.query("select count(*)::int n from public.item_activities where user_id=$1 and activity_type='payment'",[owner])).rows[0].n,0);
 });

 await test('Shared planning prerequisite check identifies the complete ordered schema',async()=>{
  const rows=(await admin.query(await readFile('supabase/check-household-planning-prerequisites.sql','utf8'))).rows;
  assert.equal(rows.length,37);assert(rows.every(row=>row.status.startsWith('PRESENT')));
 });
}
