import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export async function testHouseholdCore({admin,actor,user,test}) {
  await test('All item templates can save a name first and add an optional date later',async()=>{
    const owner=await user();
    for(const template of ['receipt','car','motorcycle','licence','passport','aircon','other']) {
      const id=randomUUID();await actor(owner,'select public.create_item_draft($1,$2)',[id,template]);
      await actor(owner,'select public.save_item_with_date($1,1,$2,$3,null)',[id,'Name first','']);
      const saved=(await actor(owner,'select public.item_detail($1) as item',[id])).rows[0].item;
      assert.equal(saved.state,'saved');assert.equal(saved.dates.length,0);assert.equal(saved.coverage,'off');
      const kind=template==='receipt'?'warranty':['licence','passport'].includes(template)?'expiration':template==='aircon'?'service':template==='other'?'other':'registration';
      await actor(owner,'select public.save_important_date($1,$2,0,$3)',[randomUUID(),id,{kind,label:'Added later',due_on:'2032-01-31',reminders_enabled:false,offsets:[],interval_months:null}]);
      assert.equal((await actor(owner,'select public.item_detail($1) as item',[id])).rows[0].item.dates.length,1);
    }
    assert.equal((await actor(owner,'select public.account_usage() as usage')).rows[0].usage.reminders,0);
  });
  await test('Name-first provider records preserve category, provider and owner boundaries',async()=>{
    const owner=await user(),other=await user(),id=randomUUID();
    await actor(owner,"select public.create_item_draft($1,'other')",[id]);
    await actor(owner,'select public.save_utility_item_with_date($1,1,$2,$3,null,$4,$5,null)',[id,'Household electricity','Keep the account reference offline','electric-bill','meralco']);
    const item=(await actor(owner,'select public.item_detail($1) as item',[id])).rows[0].item;
    assert.equal(item.reminder_preset,'electric-bill');assert.equal(item.utility_id,'meralco');assert.equal(item.dates.length,0);
    await assert.rejects(actor(other,'select public.save_item_with_date($1,2,$2,$3,null)',[id,'Stolen','']),/NOT_FOUND/);
    await assert.rejects(actor(owner,'select private.save_item_with_date_base($1,2,$2,$3,null)',[id,'Bypass','']),/permission denied/);
    const bad=randomUUID();await actor(owner,"select public.create_item_draft($1,'passport')",[bad]);
    await assert.rejects(actor(owner,'select public.save_item_with_date($1,1,$2,$3,null)',[bad,'','']),/INVALID_INPUT/);
    assert.equal((await admin.query('select state from public.items where id=$1',[bad])).rows[0].state,'draft');
  });
  await test('Dashboard includes old overdue items beyond recent records and preserves account totals',async()=>{
    const owner=await user(),other=await user(),old=[];
    for(let n=0;n<5;n++) {
      const id=randomUUID();old.push(id);await actor(owner,"select public.create_item_draft($1,'car')",[id]);
      await actor(owner,'select public.save_item_with_date($1,1,$2,$3,$4)',[id,'Old deadline '+n,'',{kind:'registration',label:'Registration',due_on:'2020-01-0'+(n+1),reminders_enabled:false,offsets:[],interval_months:null}]);
      await admin.query("update public.items set created_at='2020-01-01' where id=$1",[id]);
    }
    await admin.query('delete from private.rate_limit_buckets where user_id=$1',[owner]);
    for(let n=0;n<8;n++) { const id=randomUUID();await actor(owner,"select public.create_item_draft($1,'car')",[id]);await actor(owner,'select public.save_item_with_date($1,1,$2,$3,null)',[id,'Recent '+n,'']); }
    for(const rpc of ['dashboard_items','dashboard_timeline_items']) {
      const rows=(await actor(owner,`select public.${rpc}() as items`)).rows[0].items;
      for(const id of old.slice(0,3))assert(rows.some(item=>item.id===id));
      assert.equal((await actor(other,`select public.${rpc}() as items`)).rows[0].items.length,0);
    }
    assert.equal((await actor(owner,'select public.account_usage() as usage')).rows[0].usage.overdue,5);
    await actor(owner,'select public.archive_item($1,2,true)',[old[0]]);
    assert.equal((await actor(owner,'select public.account_usage() as usage')).rows[0].usage.overdue,4);
    assert(!(await actor(owner,'select public.dashboard_items() as items')).rows[0].items.some(item=>item.id===old[0]));
  });
  await test('Core prerequisite check recognizes all ordered migration markers',async()=>{
    const rows=(await admin.query(await readFile('supabase/check-household-core-prerequisites.sql','utf8'))).rows;
    assert.equal(rows.length,33);assert(rows.every(row=>row.status.startsWith('PRESENT')));
  });
}
