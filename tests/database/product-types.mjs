import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
export async function testProductTypes({admin,actor,user,test}) {
 const catalog=JSON.parse((await readFile('src/features/purchases/product-types.ts','utf8')).split('export const productTypes = ')[1].split(' as const;')[0]);
 const draft=async owner=>{const id=randomUUID();await actor(owner,'select public.create_purchase_draft($1)',[id]);return id;};
 const save=(owner,id,revision,data,warranty=null)=>actor(owner,'select public.save_purchase($1,$2,$3,$4)',[id,revision,{product_name:'My purchase',...data},warranty]);
 const detail=async(owner,id)=>(await actor(owner,'select public.item_detail($1) as item',[id])).rows[0].item;
 await test('All purchase types persist through the compatibility view and reminder reads',async()=>{
  for(const type of catalog)for(const category of type.categories){const owner=await user(),id=await draft(owner);await save(owner,id,1,{category,product_type:type.id},{expires_on:'2032-01-15',reminders_enabled:false});const item=await detail(owner,id);assert.equal(item.product_type,type.id);assert.equal(item.category,category);const p=(await actor(owner,'select * from public.purchases where id=$1',[id])).rows[0];assert.equal(p.product_type,type.id);for(const rpc of ['list_items','dashboard_items','dashboard_timeline_items']){const items=(await actor(owner,`select public.${rpc}() as items`)).rows[0].items;assert.equal(items.find(i=>i.id===id)?.product_type,type.id);}}
 });
 await test('Purchase types preserve explicit choices, legacy omission and supported category switches',async()=>{
  const owner=await user(),id=await draft(owner);await save(owner,id,1,{category:'electronics',product_type:'earbuds'});await save(owner,id,2,{product_name:'Renamed laptop',category:'electronics'});assert.equal((await detail(owner,id)).product_type,'earbuds');await save(owner,id,3,{category:'electronics',product_type:''});assert.equal((await detail(owner,id)).product_type,null);await save(owner,id,4,{category:'electronics',product_type:'category'});assert.equal((await detail(owner,id)).product_type,'category');await save(owner,id,5,{category:'electronics',product_type:'tv'});await save(owner,id,6,{category:'appliances'});assert.equal((await detail(owner,id)).product_type,'tv');await save(owner,id,7,{category:'clothing'});assert.equal((await detail(owner,id)).product_type,null);
 });
 await test('Purchase type saves enforce ownership, revisions, category scope and atomic warranty rollback',async()=>{
  const owner=await user(),other=await user(),id=await draft(owner);await save(owner,id,1,{category:'electronics',product_type:'headphones'},{expires_on:'2032-01-15',reminders_enabled:true});
  await assert.rejects(save(other,id,2,{category:'electronics',product_type:'camera'}),/NOT_FOUND/);await assert.rejects(save(owner,id,1,{category:'electronics',product_type:'camera'}),/CONFLICT/);
  for(const [category,type]of [['appliances','headphones'],['electronics','unknown'],['clothing','tv'],['home','camera'],['','camera']])await assert.rejects(save(owner,id,2,{category,product_type:type}),/INVALID_INPUT/);
  await assert.rejects(save(owner,id,2,{category:'electronics',product_type:'camera'},{expires_on:'bad date',reminders_enabled:true}));await assert.rejects(actor(null,'select public.save_purchase($1,2,$2)',[id,{product_name:'Bad',category:'electronics',product_type:'camera'}],'anon'),/permission denied/);await assert.rejects(actor(owner,"update public.items set product_type='camera' where id=$1",[id]),/permission denied/);
  const item=await detail(owner,id);assert.equal(item.product_type,'headphones');assert.equal(item.product_name,'My purchase');assert.equal(item.revision,2);assert.equal(item.dates.length,1);assert(item.dates[0].offsets.some(offset=>offset.value===0));assert.equal((await actor(other,'select * from public.purchases where id=$1',[id])).rows.length,0);
  const non=await draft(owner);await admin.query("update public.items set template_key='other' where id=$1",[non]);await assert.rejects(admin.query("update public.items set product_type='category' where id=$1",[non]),/valid_product_type/);
  const checks=(await admin.query(await readFile('supabase/check-product-type-prerequisites.sql','utf8'))).rows;assert.equal(checks.length,30);for(const c of checks)assert.match(c.status,/PRESENT/,c.migration);
 });
}
