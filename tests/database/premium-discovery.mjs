import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
export async function testPremiumDiscovery({admin,actor,user,test}) {
 const service=(sql,args=[])=>actor(null,sql,args,'service_role');
 const context=async(owner,experiment=true)=>(await actor(owner,'select public.premium_measurement_context($1) data',[experiment])).rows[0].data;
 const usage=async owner=>(await actor(owner,'select public.account_usage() data')).rows[0].data;
 const event=(owner,id=randomUUID(),name='premium_preview_viewed',surface='dashboard',horizon=null,insight=null,experiment=true)=>actor(owner,'select public.record_premium_event($1,$2,$3,$4,$5,$6)',[id,name,surface,horizon,insight,experiment]);
 const optin=owner=>actor(owner,'select public.update_analytics_preference(true)');
 const rows=async owner=>(await admin.query('select * from private.premium_events where user_id=$1 order by occurred_at,id',[owner])).rows;
 async function purchase(owner,product='premium_30') {
  const id=randomUUID();await service('select public.create_premium_order($1,$2,$3,false)',[owner,id,product]);
  await service('select public.attach_checkout($1,$2,$3)',[id,'cs_'+id,'https://checkout.paymongo.com/'+id]);
  return {id,pay:()=>service("select public.credit_payment($1,$2,$3,$4,$5,'PHP',false)",['evt_'+id,id,'cs_'+id,'pay_'+id,product==='premium_year'?49900:5900])};
 }
 await test('Premium measurement requires consent and stable assignment is optional, private and concurrent-safe',async()=>{
  const owner=await user();assert.deepEqual(await context(owner),{enabled:false,variant:'contextual'});
  await event(owner);assert.equal((await rows(owner)).length,0);
  await optin(owner);assert.deepEqual(await context(owner,false),{enabled:true,variant:'contextual'});
  assert.equal((await admin.query('select * from private.premium_experiment_assignments where user_id=$1',[owner])).rowCount,0);
  const assigned=await Promise.all([context(owner),context(owner),context(owner)]);
  assert(assigned.every(value=>value.enabled&&value.variant===assigned[0].variant));
  assert.equal((await admin.query('select * from private.premium_experiment_assignments where user_id=$1',[owner])).rowCount,1);
  for(const role of ['anon','authenticated','service_role']) {
   await assert.rejects(actor(owner,'select * from private.premium_events',[],role),/permission denied/);
   await assert.rejects(actor(owner,'select * from private.premium_experiment_assignments',[],role),/permission denied/);
   await assert.rejects(actor(owner,'select * from private.premium_conversion_report',[],role),/permission denied/);
   await assert.rejects(actor(owner,'select private.compact_analytics_before_premium_discovery()',[],role),/permission denied/);
  }
  for(const role of ['anon','service_role'])await assert.rejects(actor(null,'select public.premium_measurement_context(true)',[],role),/permission denied/);
 });
 await test('Premium events deduplicate concurrent retries, isolate accounts and never accept financial payloads',async()=>{
  const owner=await user(),other=await user(),id=randomUUID();await optin(owner);await optin(other);const assigned=await context(owner);
  await Promise.all([event(owner,id),event(owner,id),event(owner,id)]);assert.equal((await rows(owner)).length,1);
  assert.equal((await rows(owner))[0].variant,assigned.variant);await event(other,id);assert.equal((await rows(other)).length,0);
  await event(owner,randomUUID(),'premium_sample_opened','dashboard',null,null,false);assert.equal((await rows(owner))[1].variant,null);
  for(const args of [[null], [randomUUID(),'premium_purchase_verified'],[randomUUID(),'installation_trial_activated'],[randomUUID(),'premium_preview_viewed','My bill'],[randomUUID(),'checkup_opened','checkup',100],[randomUUID(),'checkup_insight_inspected','checkup',30,'My insurance']])await assert.rejects(event(owner,...args),/INVALID_INPUT/);
  await event(owner,randomUUID(),'checkup_opened','checkup',30);await event(owner,randomUUID(),'extended_planner_used','outlook',365);
  assert.equal((await rows(owner)).length,2);
  const columns=(await admin.query("select column_name from information_schema.columns where table_schema='private' and table_name='premium_events' order by ordinal_position")).rows.map(row=>row.column_name);
  assert.deepEqual(columns,['id','user_id','event','surface','horizon','insight','variant','occurred_at']);
  await admin.query("update private.rate_limit_buckets set count=120 where user_id=$1 and action='premium_metrics'",[owner]);
  await assert.rejects(event(owner),/RATE_LIMITED/);
 });
 await test('Trial and verified-purchase events come from authoritative grants and reports exclude refunds and other billing modes',async()=>{
  const owner=await user();await optin(owner);const assigned=await context(owner);await event(owner);
  const gift=(await actor(owner,'select public.activate_installation_premium(true) data')).rows[0].data;
  await actor(owner,'select public.activate_installation_premium(true)');await actor(owner,'select public.acknowledge_installation_premium($1)',[gift.id]);
  assert.equal((await rows(owner)).filter(row=>row.event==='installation_trial_activated').length,1);
  await event(owner,randomUUID(),'checkup_opened','checkup',30);
  const first=await purchase(owner);assert.equal((await rows(owner)).filter(row=>row.event==='premium_purchase_verified').length,0);
  assert(Number((await admin.query('select checkout_accounts from private.premium_conversion_report where variant=$1',[assigned.variant])).rows[0].checkout_accounts)>=1);
  await first.pay();await first.pay();const second=await purchase(owner,'premium_year');await second.pay();
  assert.equal((await rows(owner)).filter(row=>row.event==='premium_purchase_verified').length,2);
  let report=(await admin.query('select * from private.premium_conversion_report where variant=$1',[assigned.variant])).rows[0];
  assert(Number(report.verified_buyers)>=1);assert(Number(report.repeat_buyers)>=1);assert(Number(report.trial_to_paid_accounts)>=1);
  const before=Number(report.repeat_buyers);await service('select public.revoke_refunded_order($1)',['pay_'+second.id]);
  report=(await admin.query('select * from private.premium_conversion_report where variant=$1',[assigned.variant])).rows[0];assert.equal(Number(report.repeat_buyers),before-1);
  const buyers=Number(report.verified_buyers);await admin.query('update private.billing_settings set live=true');
  report=(await admin.query('select * from private.premium_conversion_report where variant=$1',[assigned.variant])).rows[0];assert.equal(Number(report.verified_buyers),buyers-1);
  await admin.query('update private.billing_settings set live=false');
 });
 await test('Opt-out immediately removes events and assignments, serializes against writes and prevents grant measurement',async()=>{
  const owner=await user();await optin(owner);await context(owner);await event(owner);
  await Promise.all([event(owner),actor(owner,'select public.update_analytics_preference(false)')]);
  assert.equal((await rows(owner)).length,0);assert.equal((await admin.query('select * from private.premium_experiment_assignments where user_id=$1',[owner])).rowCount,0);
  await event(owner);await actor(owner,'select public.activate_installation_premium(true)');assert.equal((await rows(owner)).length,0);
  await optin(owner);await actor(owner,'select public.activate_installation_premium(true)');assert.equal((await rows(owner)).length,0);
 });
 await test('Baseline checkout and conversion reporting works with the experiment disabled',async()=>{
  const owner=await user();await optin(owner);assert.equal((await context(owner,false)).variant,'contextual');
  await event(owner,randomUUID(),'premium_preview_viewed','dashboard',null,null,false);
  const order=await purchase(owner);
  const report=async()=>(await admin.query('select * from private.premium_conversion_report where variant is null')).rows[0];
  const pending=await report();assert(Number(pending.checkout_accounts)>=1);const buyers=Number(pending.verified_buyers);
  await order.pay();assert.equal(Number((await report()).verified_buyers),buyers+1);
  assert.equal((await admin.query('select * from private.premium_experiment_assignments where user_id=$1',[owner])).rowCount,0);
 });
 await test('Premium measurement retention runs through existing maintenance and deletion removes linked assignments',async()=>{
  const owner=await user();await optin(owner);await context(owner);await event(owner);const current=randomUUID();await event(owner,current);
  await admin.query("update private.premium_events set occurred_at=now()-interval '91 days' where user_id=$1 and id<>$2",[owner,current]);
  await service('select public.run_maintenance()');assert.equal((await rows(owner)).length,1);assert.equal((await rows(owner))[0].id,current);
  await admin.query('delete from public.profiles where id=$1',[owner]);assert.equal((await rows(owner)).length,0);assert.equal((await admin.query('select * from private.premium_experiment_assignments where user_id=$1',[owner])).rowCount,0);
 });
 await test('Trial expiry is distinct from active, paid, permanent and queued Premium access',async()=>{
  const owner=await user();assert.equal((await usage(owner)).installation_premium_expired,false);await actor(owner,'select public.activate_installation_premium(true)');
  assert.equal((await usage(owner)).installation_premium_expired,false);assert((await usage(owner)).installation_premium_ends_at);
  await admin.query("update private.household_premium_periods set starts_at=now()-interval '31 days',ends_at=now()-interval '1 day' where user_id=$1",[owner]);
  assert.equal((await usage(owner)).installation_premium_expired,true);
  const paid=await purchase(owner);await paid.pay();assert.equal((await usage(owner)).installation_premium_expired,false);
  await admin.query("update private.household_premium_periods set starts_at=now()-interval '61 days',ends_at=now()-interval '2 hours' where user_id=$1 and origin='payment'",[owner]);
  assert.equal((await usage(owner)).installation_premium_expired,false);
  await admin.query('insert into private.reminder_packs(user_id,live,permanent,slot_count) values($1,false,true,5)',[owner]);assert.equal((await usage(owner)).household_premium,true);assert.equal((await usage(owner)).installation_premium_expired,false);
  const queued=await user(),order=await purchase(queued);await order.pay();const gift=(await actor(queued,'select public.activate_installation_premium(true) data')).rows[0].data;
  assert(new Date(gift.starts_at)>new Date());assert.equal((await usage(queued)).installation_premium_expired,false);
 });
 await test('Premium discovery prerequisites identify all 40 release markers',async()=>{
  const checks=(await admin.query(await readFile('supabase/check-premium-discovery-prerequisites.sql','utf8'))).rows;assert.equal(checks.length,40);assert(checks.every(row=>row.status.startsWith('PRESENT')));
 });
}
