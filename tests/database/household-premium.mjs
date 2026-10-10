import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';

export async function testHouseholdPremium({admin,actor,user,test}) {
 const today=(await admin.query("select (now() at time zone 'Asia/Manila')::date::text t")).rows[0].t;
 const day=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
 const service=(sql,args=[])=>actor(null,sql,args,'service_role');
 const gift=async owner=>(await actor(owner,'select public.activate_installation_premium(true) data')).rows[0].data;
 const usage=async owner=>(await actor(owner,'select public.account_usage() data')).rows[0].data;
 const planner=async(owner,days=30,month=null,before=null,id=null)=>(await actor(owner,'select public.household_planner($1,$2,$3,$4) data',[days,month,before,id])).rows[0].data;
 async function create(owner,due=today,extra={},template='other',preset='electric-bill') {
  const id=randomUUID();await actor(owner,'select public.create_item_draft($1,$2)',[id,template]);
  await actor(owner,'select public.save_item_with_date($1,1,$2,\'\',$3,$4)',[id,'Household '+id,{kind:'other',label:'Payment',due_on:due,reminders_enabled:false,offsets:[],interval_months:null,payment_amount_minor:10000,payment_amount_certainty:'estimated',...extra},preset]);
  return id;
 }
 async function order(owner,product='premium_30') {
  const id=randomUUID();await service('select public.create_premium_order($1,$2,$3,false)',[owner,id,product]);
  await service('select public.attach_checkout($1,$2,$3)',[id,'cs_'+id,'https://checkout.paymongo.com/'+id]);return id;
 }
 const pay=(id,amount=5900,event='evt_'+id)=>service("select public.credit_payment($1,$2,$3,$4,$5,'PHP',false)",[event,id,'cs_'+id,'pay_'+id,amount]);
 await test('Installation gift is authenticated, once per account, concurrent safe and independent of push permission',async()=>{
  const owner=await user(),outside=await user();
  await assert.rejects(actor(owner,'select public.activate_installation_premium(false)'),/INSTALLATION_REQUIRED/);
  await assert.rejects(actor(null,'select public.activate_installation_premium(true)',[],'anon'),/permission denied/);
  assert.equal((await usage(owner)).household_premium,false);
  await assert.rejects(planner(owner,365),/PREMIUM_REQUIRED/);
  const results=await Promise.all([gift(owner),gift(owner),gift(owner)]);
  assert.equal(new Set(results.map(r=>r.id)).size,1);
  assert.equal(results.filter(r=>r.activated).length,1);assert.equal((await gift(owner)).activated,false);
  const r=results[0];assert.equal(new Date(r.ends_at)-new Date(r.starts_at),30*86400000);assert.equal(r.celebrate,true);
  assert.equal((await usage(owner)).household_premium,true);assert.equal((await usage(owner)).installation_premium_claimed,true);
  assert.equal((await admin.query('select count(*)::int n from private.push_subscriptions where user_id=$1',[owner])).rows[0].n,0);
  await actor(outside,'select public.acknowledge_installation_premium($1)',[r.id]);assert.equal((await gift(owner)).celebrate,true);
  await actor(owner,'select public.acknowledge_installation_premium($1)',[r.id]);assert.equal((await gift(owner)).celebrate,false);
  await admin.query("update private.household_premium_periods set starts_at=now()-interval '31 days',ends_at=now()-interval '1 day' where user_id=$1",[owner]);
  assert.equal((await gift(owner)).id,r.id);assert.equal((await usage(owner)).household_premium,false);
  await assert.rejects(planner(owner,90),/PREMIUM_REQUIRED/);assert.equal((await planner(owner)).days,30);
 });
 await test('Old installation claimants qualify, existing permanent and unexpired purchases retain Premium',async()=>{
  const owner=await user();await admin.query('insert into private.install_reward_claims(user_id) values($1)',[owner]);
  assert.equal((await gift(owner)).celebrate,true);
  const permanent=await user(),temporary=await user(),legacy=await user();
  await admin.query('insert into private.reminder_packs(user_id,live,permanent,slot_count) values($1,false,true,5)',[permanent]);
  await admin.query("insert into private.reminder_packs(user_id,live,paid_until,slot_count) values($1,false,now()+interval '10 days',5)",[temporary]);
  await admin.query("insert into public.account_entitlements(user_id,premium_until) values($1,now()+interval '20 days') on conflict(user_id) do update set premium_until=excluded.premium_until",[legacy]);
  for(const u of [permanent,temporary,legacy])assert.equal((await usage(u)).household_premium,true);
  const end=(await usage(temporary)).household_premium_until;
  assert.equal(new Date((await gift(temporary)).starts_at).getTime(),new Date(end).getTime());
 });
 await test('Paid Premium rejects spoofed prices, isolates modes and credits replays exactly once',async()=>{
  const owner=await user(),id=await order(owner);
  await assert.rejects(service('select public.create_premium_order($1,$2,\'slots_30\',false)',[owner,randomUUID()]),/INVALID_INPUT/);
  await assert.rejects(service('select public.create_premium_order($1,$2,\'premium_year\',false)',[owner,randomUUID()]),/CHECKOUT_PENDING/);
  await assert.rejects(actor(owner,'select public.create_premium_order($1,$2,\'premium_30\',false)',[owner,randomUUID()]),/permission denied/);
  assert.equal((await actor(owner,'select public.get_billing_orders() data')).rows[0].data[0].can_resume,true);
  await assert.rejects(pay(id,1),/PAYMENT_MISMATCH/);
  await pay(id);await Promise.all([pay(id),pay(id,5900,'different_event_'+id)]);
  assert.equal((await admin.query('select count(*)::int n from private.household_premium_periods where order_id=$1',[id])).rows[0].n,1);
  assert.equal((await usage(owner)).household_premium,true);
  await admin.query('update private.billing_settings set live=true');assert.equal((await usage(owner)).household_premium,false);
  await admin.query('update private.billing_settings set live=false');
  const before=(await usage(owner)).household_premium_until,g=await gift(owner);
  assert.equal(new Date(g.starts_at).getTime(),new Date(before).getTime());
  const annual=await order(owner,'premium_year');await pay(annual,49900);
  const periods=(await admin.query('select * from private.household_premium_periods where user_id=$1 order by starts_at',[owner])).rows;
  assert.equal(periods[1].starts_at.getTime(),periods[0].ends_at.getTime());assert.equal(periods[2].starts_at.getTime(),periods[1].ends_at.getTime());
  await service('select public.revoke_refunded_order($1)',['pay_'+id]);
  const shifted=(await admin.query("select * from private.household_premium_periods where user_id=$1 and origin='installation'",[owner])).rows[0];
  assert.equal(shifted.ends_at-shifted.starts_at,30*86400000);assert(shifted.starts_at<periods[1].starts_at);
  const once=(await usage(owner)).household_premium_until;await service('select public.revoke_refunded_order($1)',['pay_'+id]);assert.equal((await usage(owner)).household_premium_until,once);
 });
 await test('Refunding a historical temporary purchase preserves the full later installation gift',async()=>{
  const owner=await user(),id=randomUUID();
  await admin.query("insert into private.billing_orders(id,user_id,product,amount_minor,slot_count,live) values($1,$2,'slots_30',2900,5,false)",[id,owner]);
  await service('select public.attach_checkout($1,$2,$3)',[id,'cs_'+id,'https://checkout.paymongo.com/'+id]);await pay(id,2900);
  const g=await gift(owner);await service('select public.revoke_refunded_order($1)',['pay_'+id]);
  const shifted=(await admin.query("select * from private.household_premium_periods where user_id=$1 and origin='installation'",[owner])).rows[0];
  assert.equal(shifted.ends_at-shifted.starts_at,30*86400000);assert(shifted.starts_at<new Date(g.starts_at));
  assert(Math.abs(shifted.starts_at-Date.now())<3000);assert.equal((await usage(owner)).household_premium,true);
 });
 await test('All selected alerts are available beyond the old three-item limit and survive Premium expiry',async()=>{
  const owner=await user();for(let i=0;i<6;i++)await create(owner,day(today,10),{reminders_enabled:true,offsets:[{unit:'days',value:1}]});
  assert.equal((await usage(owner)).reminders,6);assert.equal((await usage(owner)).uncovered,0);
  await gift(owner);await admin.query("update private.household_premium_periods set starts_at=now()-interval '31 days',ends_at=now()-interval '1 day' where user_id=$1",[owner]);
  assert.equal((await usage(owner)).reminders,6);assert.equal((await usage(owner)).household_premium,false);
 });
 await test('New warranty defaults use one timing while existing custom offsets are preserved',async()=>{
  const owner=await user(),id=randomUUID();await actor(owner,'select public.create_purchase_draft($1)',[id]);
  const save=revision=>actor(owner,'select public.save_purchase($1,$2,$3,$4)',[id,revision,{product_name:'Appliance'},{expires_on:day(today,40),reminders_enabled:true}]);
  await save(1);const d=(await admin.query('select id from public.important_dates where item_id=$1',[id])).rows[0].id;
  assert.deepEqual((await admin.query('select unit,value from public.reminder_offsets where date_id=$1',[d])).rows,[{unit:'days',value:30}]);
  await admin.query('insert into public.reminder_offsets(date_id,unit,value) values($1,\'days\',7)',[d]);
  await save(2);assert.equal((await admin.query('select * from public.reminder_offsets where date_id=$1',[d])).rowCount,2);
 });
 await test('Year planner projects fixed month-end schedules, respects ends and keeps current confirmations scoped',async()=>{
  const owner=await user(),outside=await user();await gift(owner);
  const id=await create(owner,'2028-01-31',{recurrence_months:1,recurrence_ends_on:'2028-03-31'}),d=(await actor(owner,'select public.item_detail($1) data',[id])).rows[0].data.dates[0];
  await actor(owner,"select public.set_occurrence_amount($1,$2,22000,'confirmed')",[d.occurrences[0].id,d.revision]);
  const rows=(await admin.query("select *,due_on::text planned_on from private.household_planner_rows($1,'2028-01-31',365) order by due_on",[owner])).rows;
  assert.deepEqual(rows.map(r=>r.planned_on),['2028-01-31','2028-02-29','2028-03-31']);
  assert.equal(rows[0].certainty,'confirmed');assert.equal(rows[1].certainty,'estimated');assert.equal(rows[1].amount_minor,'10000');assert.equal(rows[1].occurrence_id,null);
  await admin.query("update public.important_dates set kind='service',recurrence_policy='from_completion' where id=$1",[d.id]);
  assert.equal((await admin.query("select * from private.household_planner_rows($1,'2028-01-31',365)",[owner])).rowCount,1);
  assert.equal((await planner(outside)).total,0);
  for(const role of ['anon','service_role'])await assert.rejects(actor(null,'select public.household_planner(365)',[],role),/permission denied/);
  await assert.rejects(actor(owner,"select private.household_planner_rows($1,$2,365)",[owner,today]),/permission denied/);
 });
 await test('Planner totals span all records and keyset pages, with missing and zero amounts honest',async()=>{
  const owner=await user();await gift(owner);
  for(let n=0;n<28;n++){if(n%8===0)await admin.query('delete from private.rate_limit_buckets where user_id=$1',[owner]);await create(owner,day(today,45),{payment_amount_minor:n===0?null:n===1?0:100});}
  const first=await planner(owner,365);assert.equal(first.total,28);assert.equal(first.rows.length,25);assert.equal(first.total_minor,'2600');assert.equal(first.has_more,true);
  assert.equal(first.months.reduce((sum,m)=>sum+m.unset_count,0),1);
  const last=first.rows.at(-1),next=await planner(owner,365,null,last.due_on,last.date_id);assert.equal(next.rows.length,3);assert.equal(next.total_minor,'2600');
  const month=first.months.find(m=>m.date_count===28).month;assert.equal((await planner(owner,365,month)).rows.length,25);
  assert.equal((await planner(owner,30)).total,0);
  for(const args of [[366,null,null,null],[365,'2028-01-02',null,null],[365,null,today,null]])await assert.rejects(planner(owner,...args),/INVALID_INPUT/);
 });
 // Isolate notification fixtures from the historical regression suite above.
 await admin.query("update private.notification_jobs set status='cancelled' where status in ('pending','retry','sending')");
 async function dueJobs(owner,count=2) {
  const items=[];
  // Generate a future job even when today's normal delivery hour has passed.
  for(let n=0;n<count;n++)items.push(await create(owner,day(today,2),{reminders_enabled:true,offsets:[{unit:'days',value:1}]}));
  await admin.query("update private.notification_jobs j set scheduled_at=now()-interval '1 second',next_attempt_at=now()-interval '1 second' from public.important_dates d where d.id=j.date_id and d.user_id=$1 and j.status='pending'",[owner]);
  return items;
 }
 const claim=async()=>(await service('select public.claim_household_emails(2) data')).rows[0].data;
 const prepare=async(b,payload)=> (await service('select public.prepare_household_email($1,$2,$3) data',[b.id,b.lease_token,payload||{from:'Keeply',to:b.email,subject:'Household',html:'<p>Household</p>',text:'Household'}])).rows[0].data;
 const finish=(b,status,id=null)=>service('select public.finish_household_email($1,$2,$3,$4)',[b.id,b.lease_token,status,id]);
 await test('Household emails group every eligible date once per local day and fan out delivery events',async()=>{
  await admin.query('delete from private.email_daily_quota');const owner=await user();await dueJobs(owner,3);
  const batches=await claim();assert.equal(batches.length,1);const b=batches[0];assert.equal(b.rows.length,3);
  assert.deepEqual(await claim(),[]);assert(await prepare(b));
  await service("select public.record_email_event('grouped_early','email.delivered')");await finish(b,'accepted','grouped_early');
  assert.equal((await admin.query("select * from private.notification_jobs where provider_email_id='grouped_early' and status='delivered'")).rowCount,3);
  await dueJobs(owner,1);assert.deepEqual(await claim(),[]);
  await service("select public.record_email_event('grouped_early','email.bounced')");
  assert.equal((await admin.query('select email_delivery_blocked from public.profiles where id=$1',[owner])).rows[0].email_delivery_blocked,true);
  assert.equal((await admin.query("select * from private.notification_jobs where provider_email_id='grouped_early' and status='failed'")).rowCount,3);
 });
 await test('Completing, editing or disabling records before preparation cancels stale content and rebuilds safely',async()=>{
  const owner=await user(),items=await dueJobs(owner,2),b=(await claim())[0];
  const d=(await actor(owner,'select public.item_detail($1) data',[items[0]])).rows[0].data.dates[0];
  await actor(owner,'select public.complete_date($1,$2,$3,null)',[d.id,d.revision,today]);
  assert.equal(await prepare(b),null);const next=(await claim())[0];assert.equal(next.rows.length,1);assert.equal(next.rows[0].item_id,items[1]);
  await admin.query("update public.items set product_name='Edited name' where id=$1",[items[1]]);assert.equal(await prepare(next),null);
  const edited=(await claim())[0];assert.equal(edited.rows[0].product_name,'Edited name');
  await actor(owner,'select public.update_email_preferences(false,false)');assert.equal(await prepare(edited),null);assert.deepEqual(await claim(),[]);
 });
 await test('An email-address change rebuilds safely and cutover does not add another same-day email',async()=>{
  const owner=await user();await dueJobs(owner,2);const b=(await claim())[0];
  await admin.query("update auth.users set email='new-address@example.test' where id=$1",[owner]);assert.equal(await prepare(b),null);
  const next=(await claim())[0];assert.equal(next.email,'new-address@example.test');await finish(next,'unknown');
  const historical=await user();await dueJobs(historical,2);
  await admin.query("update private.notification_jobs set status='accepted',provider_email_id='individual_cutover',first_attempt_at=now(),accepted_at=now() where id=(select j.id from private.notification_jobs j join public.important_dates d on d.id=j.date_id where d.user_id=$1 order by j.id limit 1)",[historical]);
  assert.deepEqual(await claim(),[]);
 });
 await test('Rate-limit retries reuse frozen content; ambiguous outcomes block duplicate daily sends',async()=>{
  const owner=await user();await dueJobs(owner,2);const b=(await claim())[0],payload=await prepare(b);
  await finish(b,'retry');await admin.query("update private.household_email_batches set next_attempt_at=now()-interval '1 second' where id=$1",[b.id]);
  const retry=(await claim())[0];assert.equal(retry.id,b.id);assert.deepEqual(retry.payload,payload);assert.deepEqual(await prepare(retry),payload);
  await finish(retry,'unknown');assert.deepEqual(await claim(),[]);
  const owner2=await user();await dueJobs(owner2);const unprepared=(await claim())[0];
  await admin.query("update private.household_email_batches set lease_until=now()-interval '1 second' where id=$1",[unprepared.id]);const recovered=(await claim())[0];assert.notEqual(recovered.id,unprepared.id);
  await prepare(recovered);await admin.query("update private.household_email_batches set lease_until=now()-interval '1 second' where id=$1",[recovered.id]);assert.deepEqual(await claim(),[]);
  assert.equal((await admin.query('select status from private.household_email_batches where id=$1',[recovered.id])).rows[0].status,'unknown');
 });
 await test('Household email budget charges batches, leaves quiet days empty and restricts worker RPCs',async()=>{
  const owner=await user();await dueJobs(owner,4);
  await admin.query("update private.email_daily_quota set reserved=90 where day=(now() at time zone 'UTC')::date");assert.deepEqual(await claim(),[]);
  await admin.query("update private.email_daily_quota set reserved=89 where day=(now() at time zone 'UTC')::date");const b=(await claim())[0];assert.equal(b.rows.length,4);
  assert.equal((await admin.query("select reserved from private.email_daily_quota where day=(now() at time zone 'UTC')::date")).rows[0].reserved,90);
  for(const role of ['anon','authenticated'])await assert.rejects(actor(owner,'select public.claim_household_emails(2)',[],role),/permission denied/);
  await assert.rejects(actor(owner,'select * from private.household_email_batches'),/permission denied/);
  assert.deepEqual((await service('select public.claim_renewal_jobs(2) data')).rows[0].data,[]);
 });
 await test('Maintenance expires grouped email content and account deletion removes private grants and batches',async()=>{
  await admin.query("update private.household_email_batches set created_at=now()-interval '3 days' where status not in ('sending','retry')");
  await service('select public.run_maintenance()');
  assert.equal((await admin.query("select count(*)::int n from private.household_email_batches where created_at<now()-interval '2 days' and status not in ('sending','retry') and (frozen_payload is not null or snapshot<>'[]'::jsonb)")).rows[0].n,0);
  await admin.query("update private.household_email_batches set created_at=now()-interval '91 days' where status not in ('sending','retry')");await service('select public.run_maintenance()');
  assert.equal((await admin.query("select count(*)::int n from private.household_email_batches where created_at<now()-interval '90 days'")).rows[0].n,0);
  const owner=await user();await gift(owner);await admin.query('delete from public.profiles where id=$1',[owner]);
  assert.equal((await admin.query('select count(*)::int n from private.household_premium_periods where user_id=$1',[owner])).rows[0].n,0);
 });
 await test('Premium prerequisite check reports all 36 schema markers',async()=>{
  const rows=(await admin.query(await readFile('supabase/check-household-premium-prerequisites.sql','utf8'))).rows;
  assert.equal(rows.length,36);assert(rows.every(row=>row.status.startsWith('PRESENT')));
 });
}
