import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
export async function testLenders({ admin, actor, user, test }) {
 const date = {kind:'other',label:'Monthly payment',due_on:'2032-01-31',reminders_enabled:false,interval_months:null,offsets:[{unit:'days',value:7}],recurrence_months:1};
 const create = async (owner, preset, lender, extra={}) => {
  const id=randomUUID(); await actor(owner,"select public.create_item_draft($1,'other')",[id]);
  await actor(owner,'select public.save_loan_item_with_date($1,1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,'My loan','',date,preset,lender,extra.name??null,extra.car??null,extra.motorcycle??null]);return id;
 };
 const detail = async (owner,id) => (await actor(owner,'select public.item_detail($1) as item',[id])).rows[0].item;
 await test('Lenders save independently from names, survive edits, clear explicitly, and appear in all overview reads',async()=>{
  const owner=await user(),id=await create(owner,'car-loan','bpi',{car:'kia'});
  let item=await detail(owner,id);assert.equal(item.lender_id,'bpi');assert.equal(item.car_brand,'kia');assert.equal(item.dates.length,1);
  await actor(owner,"select public.save_loan_item_with_date($1,2,'New name','',null,null,null,null,null,null)",[id]);
  item=await detail(owner,id);assert.equal(item.lender_id,'bpi');assert.equal(item.car_brand,'kia');assert.equal(item.revision,3);
  await actor(owner,"select public.save_item_with_date($1,3,'Older client','',null,null,null)",[id]);
  item=await detail(owner,id);assert.equal(item.lender_id,'bpi');assert.equal(item.car_brand,'kia');
  for(const rpc of ['list_items','dashboard_items','dashboard_timeline_items']){
   const items=(await actor(owner,`select public.${rpc}() as items`)).rows[0].items;assert.equal(items.find(i=>i.id===id).lender_id,'bpi');
  }
  await actor(owner,"select public.save_loan_item_with_date($1,4,'Renamed','',null,null,'',null,null,null)",[id]);
  item=await detail(owner,id);assert.equal(item.lender_id,null);assert.equal(item.car_brand,'kia');
 });
 await test('Lender category changes preserve compatible banks and clear incompatible specialist or non-loan identities',async()=>{
  const owner=await user(),id=await create(owner,'personal-loan','bpi');
  await actor(owner,"select public.save_loan_item_with_date($1,2,'Home','',null,'home-loan',null)",[id]);assert.equal((await detail(owner,id)).lender_id,'bpi');
  await actor(owner,"select public.save_loan_item_with_date($1,3,'Home','',null,null,'pag-ibig')",[id]);
  await actor(owner,"select public.save_loan_item_with_date($1,4,'Business','',null,'business-loan',null)",[id]);assert.equal((await detail(owner,id)).lender_id,null);
  await actor(owner,"select public.save_loan_item_with_date($1,5,'Business','',null,null,'bdo')",[id]);
  await actor(owner,"select public.save_subscription_item_with_date($1,6,'Netflix','',null,'streaming','netflix')",[id]);
  const item=await detail(owner,id);assert.equal(item.lender_id,null);assert.equal(item.lender_name,null);assert.equal(item.subscription_brand,'netflix');
 });
 await test('Custom lenders preserve, update and clear their names and motorcycle identity survives lender edits',async()=>{
  const owner=await user(),id=await create(owner,'motorcycle-loan','other',{name:'  My cooperative  ',motorcycle:'honda'});
  let item=await detail(owner,id);assert.equal(item.lender_name,'My cooperative');assert.equal(item.motorcycle_brand,'honda');
  await actor(owner,"select public.save_loan_item_with_date($1,2,'Renamed','',null,null,null,null,null,null)",[id]);assert.equal((await detail(owner,id)).lender_name,'My cooperative');
  await actor(owner,"select public.save_loan_item_with_date($1,3,'Renamed','',null,null,'other','Updated cooperative')",[id]);assert.equal((await detail(owner,id)).lender_name,'Updated cooperative');
  await actor(owner,"select public.save_loan_item_with_date($1,4,'Renamed','',null,null,'sumisho','')",[id]);item=await detail(owner,id);assert.equal(item.lender_name,null);assert.equal(item.motorcycle_brand,'honda');
  await actor(owner,"select public.save_motorcycle_item_with_date($1,5,'Older motorcycle client','',null,null,'yamaha')",[id]);item=await detail(owner,id);assert.equal(item.lender_id,'sumisho');assert.equal(item.motorcycle_brand,'yamaha');
 });
 await test('Lender writes enforce categories, ownership, revisions, atomic rollback and restricted privileges',async()=>{
  const owner=await user(),outsider=await user(),id=await create(owner,'personal-loan','bpi');
  await assert.rejects(actor(outsider,"select public.save_loan_item_with_date($1,2,'Bad','',null,null,'bdo')",[id]),/NOT_FOUND/);
  await assert.rejects(actor(owner,"select public.save_loan_item_with_date($1,1,'Stale','',null,null,'bdo')",[id]),/CONFLICT/);
  for(const [preset,lender,name,car,motorcycle] of [
   ['personal-loan','unknown',null,null,null],['personal-loan','sumisho',null,null,null],['streaming','bpi',null,null,null],
   ['personal-loan','bpi','Bad name',null,null],['personal-loan','other','x'.repeat(161),null,null],
   ['personal-loan','bpi',null,'kia',null],['motorcycle-loan','bpi',null,'kia','honda'],
  ]) await assert.rejects(actor(owner,'select public.save_loan_item_with_date($1,2,$2,$3,null,$4,$5,$6,$7,$8)',[id,'Bad','',preset,lender,name,car,motorcycle]),/INVALID_INPUT/);
  await assert.rejects(actor(owner,"select public.save_loan_item_with_date($1,2,'Bad','',$2,null,'bdo')",[id,{...date,due_on:'not-a-date'}]));
  await assert.rejects(actor(owner,"update public.items set lender_id='bdo' where id=$1",[id]),/permission denied/);
  await assert.rejects(actor(null,"select public.save_loan_item_with_date($1,2,'Anonymous','',null,null,'bdo')",[id],'anon'),/permission denied/);
  const item=await detail(owner,id);assert.equal(item.lender_id,'bpi');assert.equal(item.revision,2);assert.equal(item.product_name,'My loan');assert.equal(item.dates.length,1);
 });
 await test('Read-only lender prerequisites recognize all applied migrations',async()=>{
  const checks=(await admin.query(await readFile('supabase/check-loan-lender-prerequisites.sql','utf8'))).rows;
  assert.equal(checks.length,26);for(const check of checks)assert.match(check.status,/PRESENT/,check.migration);
 });
}
