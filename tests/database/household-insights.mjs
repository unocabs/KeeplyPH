import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
export async function testHouseholdInsights({admin,actor,user,test}) {
  const today=(await admin.query("select (now() at time zone 'Asia/Manila')::date::text t")).rows[0].t;
  const day=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
  async function create(owner,template='other',preset='electric-bill',data=null,name='Insight fixture',notes='') {
    const id=randomUUID();await actor(owner,'select public.create_item_draft($1,$2)',[id,template]);
    await actor(owner,'select public.save_item_with_date($1,1,$2,$3,$4,$5)',[id,name,notes,data,preset]);
    return id;
  }
  const dateInput=(due=today,amount=null,extra={})=>({kind:'other',label:'Payment',due_on:due,reminders_enabled:false,offsets:[],interval_months:null,payment_amount_minor:amount,...extra});
  const detail=async(owner,id)=>(await actor(owner,'select public.item_detail($1) data',[id])).rows[0].data;
  const insights=async owner=>(await actor(owner,'select public.household_insights() data')).rows[0].data;
  const plan=async owner=>(await actor(owner,'select public.household_payment_plan() data')).rows[0].data;
  await test('Insights are empty-safe, owner scoped, and inaccessible to anonymous/service direct callers',async()=>{
    const owner=await user();const data=await insights(owner);
    assert.equal(data.readiness.total,0);assert.equal(data.readiness.ready,0);assert.equal(data.payments.confirmed_minor,'0');assert.deepEqual(data.payments.rows,[]);
    for(const role of ['anon','service_role'])await assert.rejects(actor(null,'select public.household_insights()',[],role),/permission denied/);
    await assert.rejects(actor(owner,'select private.payment_rows($1,$2)',[owner,today]),/permission denied/);
  });
  await test('Readiness states persist, suppress suggestions honestly, and can be reset',async()=>{
    const owner=await user(),id=await create(owner);let item=await detail(owner,id);
    assert.deepEqual(item.readiness_checks,[{key:'important_date',state:'missing'}]);
    for(const state of ['unknown','dismissed','not_applicable','missing']) {
      await actor(owner,"select public.set_readiness_preference($1,$2,'important_date',$3)",[id,item.revision,state]);item=await detail(owner,id);
      assert.equal(item.readiness_checks[0].state,state);const summary=await insights(owner);
      assert.equal(summary.readiness.ready,state==='not_applicable'?1:0);
      assert.equal(summary.readiness.rows.length,state==='missing'?1:0);
      const incomplete=(await actor(owner,"select public.list_items(p_filter=>'incomplete') data")).rows[0].data;
      assert.equal(incomplete.length,state==='not_applicable'?0:1);
    }
    await actor(owner,'select public.save_important_date($1,$2,0,$3)',[randomUUID(),id,dateInput()]);
    assert.equal((await detail(owner,id)).readiness_checks[0].state,'complete');
  });
  await test('Readiness writes reject cross-account, stale, irrelevant and direct changes atomically',async()=>{
    const owner=await user(),outside=await user(),id=await create(owner),item=await detail(owner,id);
    await assert.rejects(actor(outside,"select public.set_readiness_preference($1,$2,'important_date','unknown')",[id,item.revision]),/NOT_FOUND/);
    await assert.rejects(actor(owner,"select public.set_readiness_preference($1,1,'important_date','unknown')",[id]),/CONFLICT/);
    await assert.rejects(actor(owner,"select public.set_readiness_preference($1,null,'important_date','unknown')",[id]),/CONFLICT/);
    await assert.rejects(actor(owner,"select public.set_readiness_preference($1,$2,'warranty','unknown')",[id,item.revision]),/INVALID_INPUT/);
    await assert.rejects(actor(owner,"insert into public.item_readiness_preferences values($1,$2,'important_date','unknown',now())",[id,owner]),/permission denied/);
    assert.equal((await actor(outside,'select * from public.item_readiness_preferences')).rowCount,0);
    assert.equal((await detail(owner,id)).revision,item.revision);
    await actor(owner,'select public.archive_item($1,$2,true)',[id,item.revision]);
    await assert.rejects(actor(owner,"select public.set_readiness_preference($1,$2,'important_date','unknown')",[id,item.revision+1]),/ITEM_ARCHIVED/);
  });
  await test('Category readiness uses saved dates and real service history without requiring files',async()=>{
    const owner=await user(),car=await create(owner,'car',null,{...dateInput(),kind:'registration'});
    let item=await detail(owner,car);assert.deepEqual(item.readiness_checks,[{key:'registration',state:'complete'},{key:'service_history',state:'missing'}]);
    const activity=randomUUID();await actor(owner,'select public.save_item_activity($1,$2,0,$3,null)',[activity,car,{activity_type:'service',title:'Oil change',completed_on:today,amount_minor:null,notes:'',document_ids:[]}]);
    assert.equal((await detail(owner,car)).readiness_checks[1].state,'complete');
    await actor(owner,"select public.void_item_activity($1,1,'Wrong vehicle')",[activity]);assert.equal((await detail(owner,car)).readiness_checks[1].state,'missing');
    const purchase=await create(owner,'receipt',null);
    await admin.query("update public.items set category='appliances',purchased_on=$2 where id=$1",[purchase,today]);
    assert.deepEqual((await detail(owner,purchase)).readiness_checks,[{key:'purchase_date',state:'complete'},{key:'warranty',state:'missing'}]);
    await admin.query("update public.items set category='clothing' where id=$1",[purchase]);assert.equal((await detail(owner,purchase)).readiness_checks.length,1);
  });
  await test('Legacy amounts remain unverified; zero, estimates, confirmations and unset stay separate',async()=>{
    const owner=await user(),legacy=await create(owner,'other','electric-bill',dateInput(today,10000)),estimated=await create(owner,'other','internet-bill',dateInput(today,20000,{payment_amount_certainty:'estimated'}));
    let result=await plan(owner);assert.equal(result.unverified_minor,'10000');assert.equal(result.estimated_minor,'20000');assert.equal(result.confirmed_minor,'0');
    const d=(await detail(owner,legacy)).dates[0];const o=d.occurrences.find(o=>o.status==='open');
    await actor(owner,"select public.set_occurrence_amount($1,$2,0,'confirmed')",[o.id,d.revision]);
    result=await plan(owner);assert.equal(result.confirmed_count,1);assert.equal(result.confirmed_minor,'0');assert.equal(result.unverified_count,0);
    await actor(owner,"select public.set_occurrence_amount($1,$2,null,'unset')",[o.id,d.revision+1]);
    result=await plan(owner);assert.equal(result.unset_count,1);assert.equal(result.estimated_minor,'20000');
    await actor(owner,"select public.set_occurrence_amount($1,$2,null,'inherit')",[o.id,d.revision+2]);
    assert.equal((await plan(owner)).unverified_minor,'10000');
    await assert.rejects(actor(owner,'select public.save_important_date($1,$2,$3,$4)',[(await detail(owner,estimated)).dates[0].id,estimated,2,dateInput(today,20000,{payment_amount_certainty:'confirmed'})]),/INVALID_INPUT/);
  });
  await test('Occurrence amount writes isolate owners and reject stale, invalid, closed and archived updates',async()=>{
    const owner=await user(),outside=await user(),id=await create(owner,'other','rent',dateInput()),d=(await detail(owner,id)).dates[0],o=d.occurrences[0];
    await assert.rejects(actor(outside,"select public.set_occurrence_amount($1,$2,1,'confirmed')",[o.id,d.revision]),/NOT_FOUND/);
    await assert.rejects(actor(owner,"select public.set_occurrence_amount($1,null,1,'confirmed')",[o.id]),/CONFLICT/);
    for(const [amount,certainty] of [[-1,'confirmed'],[null,'estimated'],[1,'unset'],[1,'wrong'],[100000000000,'estimated']])await assert.rejects(actor(owner,'select public.set_occurrence_amount($1,$2,$3,$4)',[o.id,d.revision,amount,certainty]),/INVALID_INPUT/);
    await actor(owner,"select public.set_occurrence_amount($1,$2,10000,'confirmed')",[o.id,d.revision]);
    await assert.rejects(actor(owner,"select public.set_occurrence_amount($1,$2,20000,'estimated')",[o.id,d.revision]),/CONFLICT/);
    await actor(owner,'select public.complete_date($1,$2,$3,null)',[d.id,d.revision+1,today]);
    await assert.rejects(actor(owner,"select public.set_occurrence_amount($1,$2,1,'confirmed')",[o.id,d.revision+2]),/ALREADY_COMPLETED/);
    assert.equal((await plan(owner)).total,0);
  });
  await test('Month-end projections preserve anchors and ends without propagating current confirmation',async()=>{
    const owner=await user(),id=await create(owner,'other','rent',dateInput('2028-01-31',20000,{payment_amount_certainty:'estimated',recurrence_months:1,recurrence_ends_on:'2028-02-29'}));
    const d=(await detail(owner,id)).dates[0];await actor(owner,"select public.set_occurrence_amount($1,$2,22000,'confirmed')",[d.occurrences[0].id,d.revision]);
    const rows=(await admin.query("select * from private.payment_rows($1,'2028-01-31')",[owner])).rows;
    assert.equal(rows.length,2);assert.equal(rows[0].certainty,'confirmed');assert.equal(rows[1].certainty,'estimated');assert.equal(Number(rows[1].amount_minor),20000);assert.equal(rows[1].occurrence_id,null);
    await admin.query("update public.important_dates set recurrence_ends_on='2028-02-28' where id=$1",[d.id]);assert.equal((await admin.query("select * from private.payment_rows($1,'2028-01-31')",[owner])).rowCount,1);
    const service=await create(owner,'aircon',null,dateInput('2028-01-31',10000,{kind:'service',recurrence_months:1})),serviceDate=(await detail(owner,service)).dates[0];
    await admin.query("update public.important_dates set recurrence_policy='from_completion' where id=$1",[serviceDate.id]);
    assert.equal((await admin.query("select * from private.payment_rows($1,'2028-01-31') where date_id=$2",[owner,serviceDate.id])).rowCount,1);
  });
  await test('Overdue fixed payments project within the horizon but overdue confirmations are excluded',async()=>{
    const owner=await user(),id=await create(owner,'other','rent',dateInput('2028-01-01',10000,{payment_amount_certainty:'estimated',recurrence_months:1}));
    const d=(await detail(owner,id)).dates[0];await actor(owner,"select public.set_occurrence_amount($1,$2,30000,'confirmed')",[d.occurrences[0].id,d.revision]);
    const rows=(await admin.query("select to_jsonb(x) x from private.payment_rows($1,'2028-02-01') x",[owner])).rows.map(r=>r.x);
    assert.deepEqual(rows.map(r=>r.due_on),['2028-02-01','2028-03-01']);assert(rows.every(r=>r.projected&&r.certainty==='estimated'&&r.amount_minor===10000));
  });
  await test('Insurance policy reviews are excluded, premium payment dates included, and boundary dates respected',async()=>{
    const owner=await user();await create(owner,'other','life-insurance',dateInput(today,null,{label:'Policy renewal / review'}));
    await create(owner,'other','life-insurance',dateInput(day(today,30),null,{label:'Life Insurance premium payment'}));
    await create(owner,'other','electric-bill',dateInput(day(today,31),10000));
    const result=await plan(owner);assert.equal(result.total,1);assert.equal(result.rows[0].due_on,day(today,30));assert.equal(result.unset_count,1);
  });
  await test('Account totals and keyset payment pages include older records beyond dashboard previews',async()=>{
    const owner=await user(),outside=await user();
    for(let n=0;n<28;n++) {if(n%8===0)await admin.query('delete from private.rate_limit_buckets where user_id=$1',[owner]);await create(owner,'other','rent',dateInput(today,100,{payment_amount_certainty:'estimated'}),'Payment '+n);}
    const first=await plan(owner);assert.equal(first.total,28);assert.equal(first.estimated_minor,'2800');assert.equal(first.rows.length,25);assert.equal(first.has_more,true);
    const last=first.rows.at(-1),next=(await actor(owner,'select public.household_payment_plan($1,$2) data',[last.due_on,last.date_id])).rows[0].data;
    assert.equal(next.rows.length,3);assert.equal(next.total,28);assert.equal(new Set([...first.rows,...next.rows].map(r=>r.date_id+':'+r.due_on)).size,28);
    const overview=await insights(owner);assert.equal(overview.readiness.total,28);assert.equal(overview.readiness.ready,28);assert.equal(overview.week.payment_count,28);
    assert.equal((await plan(outside)).total,0);
    await assert.rejects(actor(owner,'select public.household_payment_plan($1,null)',[today]),/INVALID_INPUT/);
  });
  await test('Search includes notes, all date cycles and active history before pagination, with literal input',async()=>{
    const owner=await user(),outside=await user(),id=await create(owner,'other','rent',dateInput(today),'Plain household record','Hidden note needle');
    const d=(await detail(owner,id)).dates[0];await admin.query("update public.important_dates set notes='Date note needle' where id=$1",[d.id]);
    const activity=randomUUID();await actor(owner,'select public.save_item_activity($1,$2,0,$3,null)',[activity,id,{activity_type:'note',title:'History needle',completed_on:today,notes:'Historical note needle',amount_minor:null,document_ids:[]}]);
    const search=async(owner,q)=>(await actor(owner,'select public.list_items(p_query=>$1) data',[q])).rows[0].data;
    for(const q of ['hidden note needle','DATE NOTE NEEDLE','history needle','Historical note needle',today])assert((await search(owner,q)).some(i=>i.id===id));
    assert.equal((await search(owner,'%')).length,0);assert.equal((await search(owner,'_')).length,0);assert.equal((await search(outside,'Hidden note needle')).length,0);
    await actor(owner,"select public.void_item_activity($1,1,'Wrong item')",[activity]);assert.equal((await search(owner,'History needle')).length,0);
    await admin.query("update public.items set created_at='2000-01-01' where id=$1",[id]);
    for(let n=0;n<26;n++){if(n%8===0)await admin.query('delete from private.rate_limit_buckets where user_id=$1',[owner]);await create(owner,'other','rent',null,'Recent '+n);}
    assert.equal((await search(owner,'Hidden note needle'))[0].id,id);
  });
  await test('Only authorised ready file names are searchable, with no file contents exposed',async()=>{
    const owner=await user(),outside=await user(),id=await create(owner,'receipt',null),doc=randomUUID();
    await actor(owner,'select public.reserve_document($1,$2,$3,$4,100)',[doc,id,'receipt','Filename needle.pdf']);
    const search=async u=>(await actor(u,"select public.list_items(p_query=>'Filename needle.pdf') data")).rows[0].data;
    assert.equal((await search(owner)).length,0);
    await admin.query("update public.documents set state='ready',mime_type='application/pdf',size_bytes=100,checksum=repeat('a',64) where id=$1",[doc]);
    assert.equal((await search(owner))[0].id,id);assert.equal((await search(outside)).length,0);
    await admin.query("update public.documents set state='failed' where id=$1",[doc]);assert.equal((await search(owner)).length,0);
  });
  await test('Weekly brief follows account-local days and uses saved service facts',async()=>{
    const owner=await user(),id=await create(owner,'aircon',null,{...dateInput(day(today,6)),kind:'service',payment_amount_minor:null});
    const summary=await insights(owner);assert.equal(summary.today,today);assert.equal(summary.week.ends_on,day(today,6));assert.equal(summary.week.services[0].item_id,id);assert.equal(summary.week.payment_count,0);
    await admin.query("update public.profiles set timezone='Pacific/Kiritimati' where id=$1",[owner]);
    const local=(await admin.query("select (now() at time zone 'Pacific/Kiritimati')::date::text t")).rows[0].t;
    assert.equal((await insights(owner)).today,local);
    await admin.query('delete from public.items where id=$1',[id]);assert.equal((await insights(owner)).week.services.length,0);
  });
  await test('Insights prerequisite check identifies all 34 ordered schema markers',async()=>{
    const rows=(await admin.query(await readFile('supabase/check-household-insights-prerequisites.sql','utf8'))).rows;
    assert.equal(rows.length,34);assert(rows.every(row=>row.status.startsWith('PRESENT')));
  });
}
