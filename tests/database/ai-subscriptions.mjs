import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
export async function testAiSubscriptions({admin,actor,user,test}) {
 const brands=['chatgpt','claude','gemini','perplexity','grok','poe','github-copilot','cursor','devin','midjourney','leonardo-ai','runway','elevenlabs','suno'];
 const date={kind:'other',label:'AI Subscription payment',due_on:'2032-01-31',reminders_enabled:false,interval_months:null,offsets:[{unit:'days',value:7}],recurrence_months:1,recurrence_ends_on:'2032-12-31',payment_amount_minor:120000};
 const detail=async(owner,id)=>(await actor(owner,'select public.item_detail($1) as item',[id])).rows[0].item;
 const create=async(owner,brand)=>{const id=randomUUID();await actor(owner,"select public.create_item_draft($1,'other')",[id]);await actor(owner,"select public.save_subscription_item_with_date($1,1,'My AI plan','',$2,'ai-subscription',$3)",[id,date,brand]);return id;};
 await test('Every AI service saves with recurring payment data and appears under subscriptions',async()=>{
  for(const brand of brands){const owner=await user();const id=await create(owner,brand),item=await detail(owner,id);assert.equal(item.subscription_brand,brand);assert.equal(item.reminder_preset,'ai-subscription');assert.equal(item.dates[0].recurrence_months,1);assert.equal(item.dates[0].payment_amount_minor,120000);
   const list=(await actor(owner,"select public.list_items('all','','category:subscriptions') as items")).rows[0].items;assert(list.some(i=>i.id===id));
  }
  assert.equal((await admin.query("select private.reminder_category('other','ai-subscription') as category")).rows[0].category,'subscriptions');
  assert.equal((await admin.query("select private.reminder_idea_category('other','ai-subscription') as category")).rows[0].category,'subscriptions');
 });
 await test('AI identities survive independent renaming, legacy edits and omission, and explicitly clear',async()=>{
  const owner=await user(),id=await create(owner,'chatgpt');
  await actor(owner,"select public.save_subscription_item_with_date($1,2,'ChatGPT Plus','',null,null)",[id]);assert.equal((await detail(owner,id)).subscription_brand,'chatgpt');
  await actor(owner,"select public.save_item_with_date($1,3,'Older client','',null,null)",[id]);
  for(const rpc of ['list_items','dashboard_items','dashboard_timeline_items']){const list=(await actor(owner,`select public.${rpc}() as items`)).rows[0].items;assert.equal(list.find(i=>i.id===id).subscription_brand,'chatgpt');}
  await actor(owner,"select public.save_subscription_item_with_date($1,4,'Cleared','',null,null,'')",[id]);assert.equal((await detail(owner,id)).subscription_brand,null);
  await actor(owner,"select public.save_subscription_item_with_date($1,5,'My custom AI service','',null,null,'other')",[id]);assert.equal((await detail(owner,id)).subscription_brand,'other');
 });
 await test('Changing AI category clears identity and preserves other provider flows',async()=>{
  const owner=await user(),id=await create(owner,'claude');
  await actor(owner,"select public.save_subscription_item_with_date($1,2,'Netflix','',null,'streaming','netflix')",[id]);assert.equal((await detail(owner,id)).subscription_brand,'netflix');
  await actor(owner,"select public.save_subscription_item_with_date($1,3,'Cursor','',null,'ai-subscription','cursor')",[id]);
  await actor(owner,"select public.save_utility_item_with_date($1,4,'Electricity','',null,'electric-bill','meralco')",[id]);let item=await detail(owner,id);assert.equal(item.subscription_brand,null);assert.equal(item.utility_id,'meralco');
  await actor(owner,"select public.save_subscription_item_with_date($1,5,'Gemini','',null,'ai-subscription','gemini')",[id]);item=await detail(owner,id);assert.equal(item.utility_id,null);assert.equal(item.subscription_brand,'gemini');
  await actor(owner,"select public.save_item_with_date($1,6,'Gym','',null,'gym')",[id]);assert.equal((await detail(owner,id)).subscription_brand,null);
 });
 await test('AI saves enforce scope, ownership, optimistic revisions, rollback and privileges',async()=>{
  const owner=await user(),outsider=await user(),id=await create(owner,'chatgpt');
  await assert.rejects(actor(outsider,"select public.save_subscription_item_with_date($1,2,'Bad','',null,null,'claude')",[id]),/NOT_FOUND/);
  await assert.rejects(actor(owner,"select public.save_subscription_item_with_date($1,1,'Stale','',null,null,'claude')",[id]),/CONFLICT/);
  for(const [preset,brand] of [['ai-subscription','netflix'],['streaming','chatgpt'],['gym','claude'],['ai-subscription','unknown'],['software','chatgpt']])await assert.rejects(actor(owner,"select public.save_subscription_item_with_date($1,2,'Bad','',null,$2,$3)",[id,preset,brand]),/INVALID_INPUT/);
  await assert.rejects(actor(owner,"select public.save_subscription_item_with_date($1,2,'Bad','',$2,null,'claude')",[id,{...date,due_on:'invalid'}]));
  await assert.rejects(actor(null,"select public.save_subscription_item_with_date($1,2,'Anon','',null,null,'claude')",[id],'anon'),/permission denied/);
  await assert.rejects(actor(owner,"update public.items set subscription_brand='claude' where id=$1",[id]),/permission denied/);
  const item=await detail(owner,id);assert.equal(item.subscription_brand,'chatgpt');assert.equal(item.revision,2);assert.equal(item.product_name,'My AI plan');assert.equal(item.dates.length,1);
  const checks=(await admin.query(await readFile('supabase/check-ai-subscription-prerequisites.sql','utf8'))).rows;assert.equal(checks.length,29);for(const c of checks)assert.match(c.status,/PRESENT/,c.migration);
 });
}
