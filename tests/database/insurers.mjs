import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
export async function testInsurers({ admin, actor, user, test }) {
 const date={kind:'other',label:'Premium payment',due_on:'2032-01-31',reminders_enabled:false,interval_months:null,offsets:[{unit:'days',value:7}],recurrence_months:1};
 const detail=async(owner,id)=>(await actor(owner,'select public.item_detail($1) as item',[id])).rows[0].item;
 const create=async(owner,preset,provider,name=null)=>{
  const id=randomUUID();await actor(owner,"select public.create_item_draft($1,'other')",[id]);
  await actor(owner,'select public.save_insurance_item_with_date($1,1,$2,$3,$4,$5,$6,$7)',[id,'My policy','',date,preset,provider,name]);return id;
 };
 await test('Insurance providers survive rename/older clients and appear in all item reads',async()=>{
  const owner=await user(),id=await create(owner,'life-insurance','sun-life');
  await actor(owner,"select public.save_insurance_item_with_date($1,2,'Family protection','',null,null,null,null)",[id]);
  let item=await detail(owner,id);assert.equal(item.insurer_id,'sun-life');assert.equal(item.revision,3);assert.equal(item.dates.length,1);
  await actor(owner,"select public.save_item_with_date($1,3,'Older client','',null,null)",[id]);
  for(const rpc of ['list_items','dashboard_items','dashboard_timeline_items']){
   const items=(await actor(owner,`select public.${rpc}() as items`)).rows[0].items;assert.equal(items.find(i=>i.id===id).insurer_id,'sun-life');
  }
  await actor(owner,"select public.save_insurance_item_with_date($1,4,'Cleared','',null,null,'','')",[id]);
  item=await detail(owner,id);assert.equal(item.insurer_id,null);assert.equal(item.insurer_name,null);
 });
 await test('Provider compatibility preserves supported types, scopes HMOs, and clears identities across categories',async()=>{
  const owner=await user(),id=await create(owner,'life-insurance','axa');
  await actor(owner,"select public.save_insurance_item_with_date($1,2,'Travel','',null,'travel-insurance',null)",[id]);assert.equal((await detail(owner,id)).insurer_id,'axa');
  await actor(owner,"select public.save_insurance_item_with_date($1,3,'Health','',null,'health-insurance','maxicare')",[id]);
  await actor(owner,"select public.save_insurance_item_with_date($1,4,'Home','',null,'home-insurance',null)",[id]);assert.equal((await detail(owner,id)).insurer_id,null);
  await actor(owner,"select public.save_insurance_item_with_date($1,5,'Home','',null,null,'bpi-ms')",[id]);
  await actor(owner,"select public.save_loan_item_with_date($1,6,'Home loan','',null,'home-loan','bpi')",[id]);
  let item=await detail(owner,id);assert.equal(item.insurer_id,null);assert.equal(item.lender_id,'bpi');
  await actor(owner,"select public.save_insurance_item_with_date($1,7,'Life','',null,'life-insurance','bpi-aia')",[id]);
  item=await detail(owner,id);assert.equal(item.insurer_id,'bpi-aia');assert.equal(item.lender_id,null);
  await actor(owner,"select public.save_subscription_item_with_date($1,8,'Streaming','',null,'streaming','netflix')",[id]);assert.equal((await detail(owner,id)).insurer_id,null);
 });
 await test('Custom insurer names trim, preserve on omission, update and clear independently',async()=>{
  const owner=await user(),id=await create(owner,'other-insurance','other','  My cooperative  ');
  assert.equal((await detail(owner,id)).insurer_name,'My cooperative');
  await actor(owner,"select public.save_insurance_item_with_date($1,2,'Renamed','',null,null,null,null)",[id]);assert.equal((await detail(owner,id)).insurer_name,'My cooperative');
  await actor(owner,"select public.save_insurance_item_with_date($1,3,'Renamed','',null,null,'other','New provider')",[id]);assert.equal((await detail(owner,id)).insurer_name,'New provider');
  await actor(owner,"select public.save_insurance_item_with_date($1,4,'Renamed','',null,null,'other','')",[id]);assert.equal((await detail(owner,id)).insurer_name,null);
  await actor(owner,"select public.save_insurance_item_with_date($1,5,'Renamed','',null,null,'medicard',null)",[id]);assert.equal((await detail(owner,id)).insurer_id,'medicard');
 });
 await test('Insurance saves enforce ownership, revisions, provider scope and atomic rollback',async()=>{
  const owner=await user(),outsider=await user(),id=await create(owner,'life-insurance','sun-life');
  await assert.rejects(actor(outsider,"select public.save_insurance_item_with_date($1,2,'Bad','',null,null,'aia')",[id]),/NOT_FOUND/);
  await assert.rejects(actor(owner,"select public.save_insurance_item_with_date($1,1,'Stale','',null,null,'aia')",[id]),/CONFLICT/);
  for(const [preset,provider,name] of [['life-insurance','maxicare',null],['home-insurance','sun-life',null],['streaming','aia',null],['life-insurance','unknown',null],['life-insurance','other','x'.repeat(161)],['life-insurance','aia','Custom name']]){
   await assert.rejects(actor(owner,"select public.save_insurance_item_with_date($1,2,'Bad','',null,$2,$3,$4)",[id,preset,provider,name]),/INVALID_INPUT/);
  }
  await assert.rejects(actor(owner,"select public.save_insurance_item_with_date($1,2,'Bad','',$2,null,'aia')",[id,{...date,due_on:'invalid'}]));
  await assert.rejects(actor(owner,"update public.items set insurer_id='aia' where id=$1",[id]),/permission denied/);
  await assert.rejects(actor(null,"select public.save_insurance_item_with_date($1,2,'Anon','',null,null,'aia')",[id],'anon'),/permission denied/);
  const item=await detail(owner,id);assert.equal(item.insurer_id,'sun-life');assert.equal(item.revision,2);assert.equal(item.product_name,'My policy');assert.equal(item.dates.length,1);
 });
 await test('Every catalog provider has matching database eligibility and prerequisite markers',async()=>{
  const catalog=await readFile('src/features/items/insurers.ts','utf8');
  const ids=[...catalog.matchAll(/id: '([^']+)'/g)].map(match=>match[1]);
  for(const id of ids)for(const preset of ['life-insurance','health-insurance','vehicle-insurance','home-insurance','travel-insurance','other-insurance']){
   const allowed=(await admin.query('select private.insurer_allowed($1,$2) as allowed',[preset,id])).rows[0].allowed;
   if(preset==='other-insurance')assert.equal(allowed,true,id);
   if(['maxicare','medicard'].includes(id))assert.equal(allowed,['health-insurance','other-insurance'].includes(preset),id);
  }
  const checks=(await admin.query(await readFile('supabase/check-insurance-provider-prerequisites.sql','utf8'))).rows;
  assert.equal(checks.length,27);for(const check of checks)assert.match(check.status,/PRESENT/,check.migration);
 });
}
