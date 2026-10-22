import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
export async function testPremiumCheckup({admin,actor,user,test}) {
 const day=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
 const rpc=async(owner,mode='saved',page=0)=>(await actor(owner,'select public.household_checkup_plan($1,null,null,null,null,$2) data',[mode,page])).rows[0].data;
 const capture=owner=>actor(owner,'select public.capture_household_checkup()');
 const payday=(owner,date)=>actor(owner,'select public.set_household_checkup_payday($1)',[date]);
 async function seed(owner,today,offset,amount,certainty='confirmed') {
  const item=randomUUID(),date=randomUUID(),occurrence=randomUUID();
  await admin.query("insert into public.items(id,user_id,state,product_name,template_key,reminder_preset) values($1,$2,'saved','Private test expense','other','electric-bill')",[item,owner]);
  await admin.query("insert into public.important_dates(id,item_id,user_id,kind,label) values($1,$2,$3,'other','Payment')",[date,item,owner]);
  await admin.query("insert into public.date_occurrences(id,date_id,user_id,cycle,due_on,expected_amount_minor,amount_certainty) values($1,$2,$3,1,$4,$5,$6)",[occurrence,date,owner,day(today,offset),amount,amount==null?'unset':certainty]);
  return {item,date,occurrence};
 }
 await test('Premium checkup authorises every RPC, isolates households, and reads never capture history',async()=>{
  const owner=await user(),other=await user();
  for(const call of [()=>rpc(owner),()=>capture(owner),()=>payday(owner,'2030-01-01')])await assert.rejects(call,/PREMIUM_REQUIRED/);
  for(const role of ['anon','service_role'])for(const sql of ['select public.household_checkup_plan()','select public.capture_household_checkup()',"select public.set_household_checkup_payday('2030-01-01')"])await assert.rejects(actor(owner,sql,[],role),/permission denied/);
  for(const role of ['anon','authenticated','service_role'])for(const sql of ['select * from private.household_checkup_reviews','select * from private.household_checkup_preferences',"select private.checkup_changes($1,current_date,current_date+30,0)","select private.checkup_range($1,current_date,current_date+30,null,null,null,null)"])await assert.rejects(actor(owner,sql,sql.includes('$1')?[other]:[],role),/permission denied/);
  await actor(owner,'select public.activate_installation_premium(true)');await actor(other,'select public.activate_installation_premium(true)');
  const today=(await rpc(owner)).today;await seed(owner,today,1,10000);await payday(owner,day(today,8));
  assert.equal((await rpc(owner)).total,1);assert.equal((await rpc(other)).total,0);assert.equal((await rpc(other)).saved_payday,null);
  assert.equal((await admin.query('select count(*)::int n from private.household_checkup_reviews where user_id=$1',[owner])).rows[0].n,0);
  await Promise.all([capture(owner),capture(owner),capture(owner)]);
  const snapshots=(await admin.query('select * from private.household_checkup_reviews where user_id=$1',[owner])).rows;
  assert.equal(snapshots.length,1);assert.deepEqual(Object.keys(snapshots[0].rows[0]).sort(),['amount_minor','date_id','due_on','estimated','item_id']);
  assert.equal((await rpc(other)).comparison.status,'first_use');assert.equal((await rpc(owner)).comparison.change_count,0);
  await admin.query("update private.household_premium_periods set starts_at=now()-interval '31 days',ends_at=now()-interval '1 day' where user_id=$1",[owner]);
  await assert.rejects(capture(owner),/PREMIUM_REQUIRED/);await assert.rejects(payday(owner,day(today,9)),/PREMIUM_REQUIRED/);await assert.rejects(rpc(owner),/PREMIUM_REQUIRED/);
  assert.equal((await actor(owner,'select public.household_payment_plan() data')).rows[0].data.total,1);
  await admin.query('delete from auth.users where id=$1',[owner]);
  for(const table of ['household_checkup_reviews','household_checkup_preferences'])assert.equal((await admin.query(`select count(*)::int n from private.${table} where user_id=$1`,[owner])).rows[0].n,0);
 });
 await test('Payday uses the account timezone, excludes payday, persists, cancels no dates and expires honestly',async()=>{
  const owner=await user();await admin.query("update public.profiles set timezone='Pacific/Kiritimati' where id=$1",[owner]);await actor(owner,'select public.activate_installation_premium(true)');
  const today=(await rpc(owner)).today;assert.equal(today,(await admin.query("select (now() at time zone 'Pacific/Kiritimati')::date::text t")).rows[0].t);
  await seed(owner,today,0,0);await seed(owner,today,7,189900);await seed(owner,today,8,350000,'estimated');await seed(owner,today,10,null);
  for(const date of [null,today,day(today,-1),day(today,366)])await assert.rejects(payday(owner,date),/INVALID_INPUT/);
  const before=(await admin.query('select to_jsonb(o) data from public.date_occurrences o where user_id=$1 order by id',[owner])).rows;
  await payday(owner,day(today,8));const plan=await rpc(owner);assert.equal(plan.mode,'payday');assert.equal(plan.ends_on,day(today,7));assert.equal(plan.total,2);assert.equal(plan.confirmed_minor,'189900');assert.equal(plan.after_payday_count,2);assert.equal(plan.weeks.length,2);assert.equal(plan.weeks.at(-1).ends_on,plan.ends_on);
  const thirty=await rpc(owner,'30');assert.equal(thirty.total,4);assert.equal(thirty.saved_payday,day(today,8));assert.equal(thirty.unset_count,1);
  assert.deepEqual((await admin.query('select to_jsonb(o) data from public.date_occurrences o where user_id=$1 order by id',[owner])).rows,before);
  await payday(owner,day(today,365));assert.equal((await rpc(owner)).weeks.length,53);assert.equal((await rpc(owner)).ends_on,day(today,364));
  await admin.query('update private.household_checkup_preferences set payday=$2 where user_id=$1',[owner,today]);assert.equal((await rpc(owner)).mode,'30');assert.equal((await rpc(owner)).expired_payday,true);
  for(const [mode,page] of [[null,0],['bogus',0],['30',-1],['30',100001]])await assert.rejects(rpc(owner,mode,page),/INVALID_INPUT/);
 });
 await test('Same-date comparisons reconcile edits, estimates, zero, missing, additions and removals without confirmation labels',async()=>{
  const owner=await user();await actor(owner,'select public.activate_installation_premium(true)');const today=(await rpc(owner)).today;
  const cost=await seed(owner,today,3,300000,'estimated'),missing=await seed(owner,today,5,null),ordinary=await seed(owner,today,6,0),removed=await seed(owner,today,7,10000);
  await seed(owner,today,40,999999);await capture(owner);
  await admin.query('update public.date_occurrences set expected_amount_minor=350000 where id=$1',[cost.occurrence]);
  await admin.query("update public.date_occurrences set expected_amount_minor=0,amount_certainty='confirmed' where id=$1",[missing.occurrence]);
  await admin.query("update public.date_occurrences set amount_certainty='unverified' where id=$1",[ordinary.occurrence]);
  await admin.query('delete from public.items where id=$1',[removed.item]);await seed(owner,today,9,null);
  const plan=await rpc(owner),c=plan.comparison;
  assert.equal(c.previous_minor,'310000');assert.equal(c.current_minor,'350000');assert.equal(c.previous_missing,1);assert.equal(c.current_missing,1);assert.equal(c.change_count,4);
  assert(!c.rows.some(row=>row.item_id===ordinary.item));assert(c.rows.some(row=>row.reason==='amount_added'&&row.before_minor===null&&row.after_minor==='0'));
  const deletion=c.rows.find(row=>row.reason==='removed');assert.equal(deletion.product_name,'Removed household expense');assert.equal(deletion.record_available,false);
  await capture(owner);assert.equal((await rpc(owner)).comparison.previous_minor,'310000');
  // A date aging out is excluded from BOTH totals; the historical full total is never reused.
  await admin.query("update private.household_checkup_reviews set rows=rows||jsonb_build_array(jsonb_build_object('item_id',$2::uuid,'date_id',$3::uuid,'due_on',$4::date,'amount_minor',1000000,'estimated',false)) where user_id=$1",[owner,randomUUID(),randomUUID(),day(today,-1)]);
  assert.equal((await rpc(owner)).comparison.previous_minor,'310000');assert.equal((await rpc(owner)).comparison.change_count,4);
  await payday(owner,day(today,4));const scoped=await rpc(owner);assert.equal(scoped.comparison.previous_minor,'300000');assert.equal(scoped.comparison.current_minor,'350000');assert.equal(scoped.comparison.change_count,1);
 });
 await test('Daily baseline is stable across days, coverage gaps and retention recover without fabricated comparisons',async()=>{
  const owner=await user();await actor(owner,'select public.activate_installation_premium(true)');const today=(await rpc(owner)).today;await seed(owner,today,1,100);
  await capture(owner);await admin.query('update private.household_checkup_reviews set reviewed_on=$2,ends_on=$3 where user_id=$1',[owner,day(today,-2),day(today,10)]);
  assert.equal((await rpc(owner)).comparison.status,'outside_coverage');await capture(owner);assert.equal((await rpc(owner)).comparison.status,'available');assert.equal((await rpc(owner)).comparison.reviewed_on,today);
  await admin.query('update private.household_checkup_reviews set ends_on=$2 where user_id=$1',[owner,day(today,365)]);
  assert.equal((await rpc(owner)).comparison.reviewed_on,day(today,-2));
  await admin.query("update private.household_checkup_reviews set captured_at=now()-interval '37 days' where user_id=$1",[owner]);await admin.query('select private.compact_analytics()');
  assert.equal((await rpc(owner)).comparison.status,'first_use');
 });
 await test('Full totals and changes reconcile across independent filters and change pages',async()=>{
  const owner=await user();await actor(owner,'select public.activate_installation_premium(true)');const today=(await rpc(owner)).today;
  const saved=[];for(let i=0;i<29;i++)saved.push(await seed(owner,today,i%10,100,'estimated'));
  await capture(owner);await admin.query('update public.date_occurrences set expected_amount_minor=200 where user_id=$1',[owner]);
  const first=await rpc(owner),second=await rpc(owner,'30',1);assert.equal(first.comparison.change_count,29);assert.equal(first.comparison.rows.length,25);assert.equal(first.comparison.has_more,true);assert.equal(second.comparison.rows.length,4);assert.equal(second.comparison.has_more,false);
  assert.equal(first.comparison.current_minor,'5800');assert.equal(second.comparison.current_minor,'5800');assert.equal(second.comparison.previous_minor,'2900');
  assert.equal(new Set([...first.comparison.rows,...second.comparison.rows].map(row=>row.date_id+row.due_on)).size,29);
  const filtered=(await actor(owner,"select public.household_checkup_plan('30',$1,'bills',null,null,0) data",[day(today,7)])).rows[0].data;
  assert.equal(filtered.comparison.change_count,29);assert.equal(filtered.comparison.current_minor,'5800');assert.equal(filtered.confirmed_minor,first.confirmed_minor);
  const rows=(await admin.query(await readFile('supabase/check-premium-checkup-prerequisites.sql','utf8'))).rows;assert.equal(rows.length,41);assert(rows.every(row=>row.status.startsWith('PRESENT')));
 });
}
