import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
export async function testUtilities({ admin, actor, user, test }) {
 const date={kind:'other',label:'Bill payment',due_on:'2032-01-31',reminders_enabled:false,interval_months:null,offsets:[{unit:'days',value:7}],recurrence_months:1};
 const detail=async(owner,id)=>(await actor(owner,'select public.item_detail($1) as item',[id])).rows[0].item;
 const create=async(owner,preset,provider,name=null)=>{
  const id=randomUUID();await actor(owner,"select public.create_item_draft($1,'other')",[id]);
  await actor(owner,'select public.save_utility_item_with_date($1,1,$2,$3,$4,$5,$6,$7)',[id,'My bill','',date,preset,provider,name]);return id;
 };
 await test('Utility providers survive rename/older clients and appear in all item reads',async()=>{
  const owner=await user(),id=await create(owner,'internet-bill','pldt');
  await actor(owner,"select public.save_utility_item_with_date($1,2,'Home internet','',null,null,null,null)",[id]);
  let item=await detail(owner,id);assert.equal(item.utility_id,'pldt');assert.equal(item.revision,3);assert.equal(item.dates.length,1);
  await actor(owner,"select public.save_item_with_date($1,3,'Older client','',null,null)",[id]);
  for(const rpc of ['list_items','dashboard_items','dashboard_timeline_items']){
   const items=(await actor(owner,`select public.${rpc}() as items`)).rows[0].items;assert.equal(items.find(i=>i.id===id).utility_id,'pldt');
  }
  await actor(owner,"select public.save_utility_item_with_date($1,4,'Cleared','',null,null,'','')",[id]);
  item=await detail(owner,id);assert.equal(item.utility_id,null);assert.equal(item.utility_name,null);
 });
 await test('Provider compatibility preserves supported types, scopes billers, and clears identities across categories',async()=>{
  const owner=await user(),id=await create(owner,'internet-bill','sky');
  await actor(owner,"select public.save_utility_item_with_date($1,2,'Travel','',null,'other-bill',null)",[id]);assert.equal((await detail(owner,id)).utility_id,'sky');
  await actor(owner,"select public.save_utility_item_with_date($1,3,'Health','',null,'mobile-bill','smart')",[id]);
  await actor(owner,"select public.save_utility_item_with_date($1,4,'Home','',null,'water-bill',null)",[id]);assert.equal((await detail(owner,id)).utility_id,null);
  await actor(owner,"select public.save_utility_item_with_date($1,5,'Home','',null,null,'maynilad')",[id]);
  await actor(owner,"select public.save_loan_item_with_date($1,6,'Home loan','',null,'home-loan','bpi')",[id]);
  let item=await detail(owner,id);assert.equal(item.utility_id,null);assert.equal(item.lender_id,'bpi');
  await actor(owner,"select public.save_utility_item_with_date($1,7,'Internet','',null,'internet-bill','globe')",[id]);
  item=await detail(owner,id);assert.equal(item.utility_id,'globe');assert.equal(item.lender_id,null);
  await actor(owner,"select public.save_subscription_item_with_date($1,8,'Streaming','',null,'streaming','netflix')",[id]);assert.equal((await detail(owner,id)).utility_id,null);
 });
 await test('Custom utility names trim, preserve on omission, update and clear independently',async()=>{
  const owner=await user(),id=await create(owner,'rent','other','  My cooperative  ');
  assert.equal((await detail(owner,id)).utility_name,'My cooperative');
  const association=await create(owner,'association-dues','other','Our condominium corporation');assert.equal((await detail(owner,association)).utility_name,'Our condominium corporation');
  await actor(owner,"select public.save_utility_item_with_date($1,2,'Renamed','',null,null,null,null)",[id]);assert.equal((await detail(owner,id)).utility_name,'My cooperative');
  await actor(owner,"select public.save_utility_item_with_date($1,3,'Renamed','',null,null,'other','New provider')",[id]);assert.equal((await detail(owner,id)).utility_name,'New provider');
  await actor(owner,"select public.save_utility_item_with_date($1,4,'Renamed','',null,null,'other','')",[id]);assert.equal((await detail(owner,id)).utility_name,null);
  await actor(owner,"select public.save_utility_item_with_date($1,5,'Renamed','',null,'mobile-bill','smart',null)",[id]);assert.equal((await detail(owner,id)).utility_id,'smart');
 });
 await test('Utility saves enforce ownership, revisions, provider scope and atomic rollback',async()=>{
  const owner=await user(),outsider=await user(),id=await create(owner,'internet-bill','pldt');
  await assert.rejects(actor(outsider,"select public.save_utility_item_with_date($1,2,'Bad','',null,null,'dito')",[id]),/NOT_FOUND/);
  await assert.rejects(actor(owner,"select public.save_utility_item_with_date($1,1,'Stale','',null,null,'dito')",[id]),/CONFLICT/);
  for(const [preset,provider,name] of [['internet-bill','smart',null],['water-bill','pldt',null],['streaming','dito',null],['internet-bill','unknown',null],['internet-bill','other','x'.repeat(161)],['internet-bill','dito','Custom name']]){
   await assert.rejects(actor(owner,"select public.save_utility_item_with_date($1,2,'Bad','',null,$2,$3,$4)",[id,preset,provider,name]),/INVALID_INPUT/);
  }
  await assert.rejects(actor(owner,"select public.save_utility_item_with_date($1,2,'Bad','',$2,null,'dito')",[id,{...date,due_on:'invalid'}]));
  await assert.rejects(actor(owner,"update public.items set utility_id='dito' where id=$1",[id]),/permission denied/);
  await assert.rejects(actor(null,"select public.save_utility_item_with_date($1,2,'Anon','',null,null,'dito')",[id],'anon'),/permission denied/);
  const item=await detail(owner,id);assert.equal(item.utility_id,'pldt');assert.equal(item.revision,2);assert.equal(item.product_name,'My bill');assert.equal(item.dates.length,1);
 });
 await test('Every catalog provider has matching database eligibility and prerequisite markers',async()=>{
  const catalog=await readFile('src/features/items/utilities.ts','utf8');
  const entries=[...catalog.matchAll(/id: '([^']+)', label: '[^']+', logo: '[^']+', categories: \[([^\]]+)\]/g)];
  assert.equal(entries.length,30);
  for(const entry of entries)for(const preset of ['electric-bill','water-bill','internet-bill','mobile-bill','rent','association-dues','other-bill']){
   const allowed=(await admin.query('select private.utility_allowed($1,$2) as allowed',[preset,entry[1]])).rows[0].allowed;
   assert.equal(allowed,entry[2].includes("'"+preset+"'"),entry[1]+':'+preset);
  }
  const checks=(await admin.query(await readFile('supabase/check-utility-biller-prerequisites.sql','utf8'))).rows;
  assert.equal(checks.length,28);for(const check of checks)assert.match(check.status,/PRESENT/,check.migration);
 });
}
