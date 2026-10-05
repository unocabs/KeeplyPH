import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

export async function testDueDateAlerts({admin,actor,user,newItem,registerPush,test,dueDateMigrationSeed:seed}) {
  const offsets=[14,7,1,0].map(value=>({unit:'days',value}));
  const add=(day,n)=>new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
  const jobs=async (id,table)=> (await admin.query(`select * from private.${table} where date_id=$1 order by scheduled_at`,[id])).rows;
  async function fixture({recurring=false,enabled=true}={}) {
    const u=await user();
    const today=(await admin.query("select (now() at time zone 'Asia/Manila')::date::text as local_today")).rows[0].local_today;
    const value={kind:'other',label:'Payment',due_on:add(today,2),reminders_enabled:enabled,interval_months:null,offsets,recurrence_months:recurring?1:null};
    const item=await newItem(u,'other',value);
    await registerPush(u);
    const d=(await admin.query('select * from public.important_dates where item_id=$1',[item])).rows[0];
    const o=(await admin.query("select * from public.date_occurrences where date_id=$1 and status='open'",[d.id])).rows[0];
    return {u,today,item,d,o,value};
  }
  const edit=(f,overrides={},revision=f.d.revision)=>actor(f.u,'select public.save_important_date($1,$2,$3,$4)',[f.d.id,f.item,revision,{...f.value,...overrides}]);

  await test('Due-date migration preserves advance alerts, accepted jobs, recurrence and active snooze',async()=>{
    assert.deepEqual(seed.after.date,seed.date);
    assert.deepEqual(seed.after.occurrence,seed.occurrence);
    assert.deepEqual(seed.after.accepted,seed.accepted);
    assert.deepEqual(seed.after.offsets.filter(o=>!(o.unit==='days'&&o.value===0)),seed.offsets);
    assert.equal(seed.after.offsets.filter(o=>o.unit==='days'&&o.value===0).length,1);
    assert.deepEqual(seed.after.recurring,seed.recurring);
    const checks=(await admin.query(await readFile('supabase/check-due-date-alert-prerequisites.sql','utf8'))).rows;
    assert.equal(checks.length,24);checks.forEach(check=>assert.match(check.status,/PRESENT/,check.migration));
  });
  await test('New warranties include three advance timings and one due-date alert by default',async()=>{
    const u=await user(),id=await newItem(u,'receipt');
    await actor(u,'select public.save_purchase($1,2,$2,$3)',[id,{product_name:'Warranty',notes:''},{expires_on:'2032-03-31',reminders_enabled:true}]);
    assert.deepEqual((await admin.query('select value from public.reminder_offsets where date_id=(select id from public.important_dates where item_id=$1) order by value',[id])).rows.map(r=>r.value),[0,1,7,30]);
  });
  await test('Due-date email and push use account-local 9 AM and one shared slot without duplicate jobs',async()=>{
    const f=await fixture();await admin.query('select private.schedule_date($1)',[f.d.id]);await admin.query('select private.schedule_date($1)',[f.d.id]);
    for(const table of ['notification_jobs','push_jobs']) {
      const rows=(await jobs(f.d.id,table)).filter(j=>j.offset_unit==='days'&&j.offset_value===0&&j.status==='pending');
      assert.equal(rows.length,1);assert.equal(rows[0].scheduled_at.toISOString(),f.value.due_on+'T01:00:00.000Z');
    }
    assert.equal((await actor(f.u,'select public.account_usage() s')).rows[0].s.reminders,1);
    // All selected early alerts are past; the queue preview should show the due date.
    await edit(f,{offsets:[14,7,3,0].map(value=>({unit:'days',value}))});
    assert.equal((await actor(f.u,'select public.reminder_preview($1) s',[f.item])).rows[0].s[0].next_scheduled_on,f.value.due_on);
    await actor(f.u,"select public.update_preferences('Tester','America/New_York',true)");
    const due=(await jobs(f.d.id,'notification_jobs')).find(j=>j.offset_value===0);
    assert.equal(due.scheduled_at.getTime(),(await admin.query("select ($1::date+time '09:00') at time zone 'America/New_York' t",[f.value.due_on])).rows[0].t.getTime());
  });
  await test('Opting out cancels due-date jobs, preserves advance alerts and stays off through later saves',async()=>{
    const f=await fixture(),advance=offsets.filter(o=>o.value!==0);
    await edit(f,{offsets:advance});
    await edit(f,{offsets:advance},f.d.revision+1);
    for(const table of ['notification_jobs','push_jobs']) {
      assert.equal((await jobs(f.d.id,table)).find(j=>j.offset_value===0).status,'cancelled');
      assert.ok((await jobs(f.d.id,table)).some(j=>j.offset_value===1&&j.status==='pending'));
    }
    assert.equal((await admin.query('select count(*)::int n from public.reminder_offsets where date_id=$1',[f.d.id])).rows[0].n,3);
    await assert.rejects(edit(f,{offsets},f.d.revision),/CONFLICT/);
    const stranger=await user();await assert.rejects(actor(stranger,'select public.save_important_date($1,$2,0,$3)',[f.d.id,f.item,f.value]),/NOT_FOUND/);
  });
  await test('Date opt-out, lost coverage, disabled channels, archive and completion suppress due-date delivery',async()=>{
    for(const action of ['date','coverage','channels','archive','complete']) {
      const f=await fixture();
      if(action==='date')await edit(f,{reminders_enabled:false});
      if(action==='coverage')await actor(f.u,'select public.set_item_coverage($1,2,false,null,null)',[f.item]);
      if(action==='channels'){
        await actor(f.u,'select public.update_email_preferences(false,false)');
        await admin.query('update public.profiles set push_reminders_enabled=false where id=$1',[f.u]);
      }
      if(action==='archive')await actor(f.u,'select public.archive_item($1,2,true)',[f.item]);
      if(action==='complete')await actor(f.u,'select public.complete_date($1,$2,$3,null)',[f.d.id,f.d.revision,f.today]);
      for(const table of ['notification_jobs','push_jobs'])assert.equal((await jobs(f.d.id,table)).filter(j=>j.offset_value===0&&j.status==='pending').length,0,action+' '+table);
    }
    const disabled=await fixture({enabled:false});assert.equal((await jobs(disabled.d.id,'notification_jobs')).length,0);
  });
  await test('Snoozing to the due date suppresses that day’s regular job and creates only one follow-up',async()=>{
    const f=await fixture();await actor(f.u,"select public.snooze_date($1,$2,$3,'custom',$4)",[f.d.id,f.o.id,f.d.revision,f.value.due_on]);
    for(const table of ['notification_jobs','push_jobs']){
      const rows=await jobs(f.d.id,table);assert.equal(rows.find(j=>j.offset_unit==='days'&&j.offset_value===0).status,'cancelled');
      assert.equal(rows.filter(j=>j.offset_unit==='snooze'&&j.status==='pending').length,1);
    }
    await actor(f.u,"select public.snooze_date($1,$2,$3,'cancel',null)",[f.d.id,f.o.id,f.d.revision+1]);
    for(const table of ['notification_jobs','push_jobs'])assert.equal((await jobs(f.d.id,table)).filter(j=>j.offset_unit==='days'&&j.offset_value===0&&j.status==='pending').length,1);
  });
  await test('Recurring completion schedules the next due-date alert without marking it completed',async()=>{
    const f=await fixture({recurring:true});await actor(f.u,'select public.complete_date($1,$2,$3,null)',[f.d.id,f.d.revision,f.today]);
    const next=(await admin.query("select id,due_on::text due from public.date_occurrences where date_id=$1 and status='open'",[f.d.id])).rows[0];
    assert.notEqual(next.id,f.o.id);
    for(const table of ['notification_jobs','push_jobs']){
      const rows=(await jobs(f.d.id,table)).filter(j=>j.offset_value===0&&j.status==='pending');assert.equal(rows.length,1);assert.equal(rows[0].occurrence_id,next.id);
    }
  });
  await test('Server enforces three advance alerts plus due-day, and requires a timing for enabled alerts',async()=>{
    const f=await fixture();
    await assert.rejects(edit(f,{offsets:[1,3,7,14].map(value=>({unit:'days',value}))}),/INVALID_INPUT/);
    await assert.rejects(edit(f,{offsets:[]}),/INVALID_INPUT/);
    await edit(f,{reminders_enabled:false,offsets:[]});
    assert.equal((await admin.query('select count(*)::int n from public.reminder_offsets where date_id=$1',[f.d.id])).rows[0].n,0);
  });
}
