// Isolated PostgreSQL integration harness. Never connects to an existing database.
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
const folder = await mkdtemp(join(tmpdir(), 'keeply-db-'));
const bin = process.env.PG_TEST_BIN || '/opt/homebrew/opt/postgresql@14/bin';
const port = 20000 + process.pid % 30000;
const config = { host: folder, port, user: 'keeply_test', database: 'postgres' };
let admin, started = false, passed = 0;
function command(name, args) {
  const result = spawnSync(join(bin, name), args, { encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error(name + ': ' + (result.error?.message || result.stderr || result.stdout));
}
async function actor(user, sql, args = [], role = 'authenticated') {
  const client = new pg.Client(config); await client.connect();
  try {
    await client.query('begin');
    await client.query('set local role ' + role);
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [user || '']);
    const result = await client.query(sql, args);
    await client.query('commit'); return result;
  } catch (e) { await client.query('rollback'); throw e; }
  finally { await client.end(); }
}
async function user() {
  const id = randomUUID();
  await admin.query("insert into auth.users(id,email,email_confirmed_at,last_sign_in_at) values($1,$2,now(),now())", [id, id + '@example.test']);
  return id;
}
async function draft(u) { const id = randomUUID(); await actor(u, 'select public.create_purchase_draft($1)', [id]); return id; }
async function save(u, id, warranty = null, revision = 1) {
  return actor(u, 'select public.save_purchase($1,$2,$3,$4)', [id, revision, { product_name: 'Test purchase', price_minor: 15900 }, warranty]);
}
async function test(name, fn) { await fn(); passed++; console.log('✓ ' + name); }
try {
  command('initdb', ['-D', join(folder, 'data'), '-U', 'keeply_test', '--auth=trust', '--no-locale', '-E', 'UTF8']);
  command('pg_ctl', ['-D', join(folder, 'data'), '-l', join(folder, 'server.log'), '-o', "-k " + folder + " -p " + port + " -c listen_addresses='' -c unix_socket_permissions=0700", '-w', 'start']); started = true;
  admin = new pg.Client(config); await admin.connect();
  await admin.query("create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema storage; grant usage on schema auth,storage,public to anon,authenticated,service_role; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,last_sign_in_at timestamptz,raw_user_meta_data jsonb default '{}'::jsonb); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security; grant select on storage.objects to authenticated;");
  let migrationSeed;
  for (const name of (await readdir('supabase/migrations')).filter(n => n.endsWith('.sql')).sort()) {
    if(name==='202609230005_items.sql') {
      const u=await user(), id=await draft(u); await save(u,id,{expires_on:'2032-03-31',reminders_enabled:true});
      const old=(await admin.query('select id from public.warranties where purchase_id=$1',[id])).rows[0];
      const job=(await admin.query("update private.notification_jobs set status='accepted',provider_email_id='migration_email',first_attempt_at=now(),frozen_payload='{\"to\":\"test@example.test\"}'::jsonb where warranty_id=$1 and offset_days=30 returning id,frozen_payload",[old.id])).rows[0];
      migrationSeed={u,id,warranty:old.id,job};
    }
    await admin.query(await readFile(join('supabase/migrations', name), 'utf8'));
    console.log('Applied ' + name);
  }
  await test('Cutover preserves purchase/warranty UUIDs and accepted job identity/payload',async()=>{
    const row=(await actor(migrationSeed.u,'select * from public.items where id=$1',[migrationSeed.id])).rows[0];
    assert.equal(row.template_key,'receipt');
    const job=(await admin.query('select * from private.notification_jobs where id=$1',[migrationSeed.job.id])).rows[0];
    assert.equal(job.date_id,migrationSeed.warranty);assert.equal(job.status,'accepted');assert.deepEqual(job.frozen_payload,migrationSeed.job.frozen_payload);
    assert.equal((await actor(migrationSeed.u,'select * from public.warranties')).rows[0].id,migrationSeed.warranty);
  });
  await test('Active reminder count excludes archives and drafts and spans list pages', async () => {
    const owner = await user(), outsider = await user();
    // More than a page of reminders; account totals must not use the list length.
    await admin.query("insert into public.items(user_id,state,product_name) select $1,'saved','Active ' || n from generate_series(1,28) n", [owner]);
    await admin.query("insert into public.items(user_id,state,product_name,archived_at) values($1,'saved','Archived',now()),($1,'draft','Unfinished',null),($2,'saved','Other account',null)", [owner, outsider]);
    const count = (await actor(owner, "select count(*)::integer as total from public.items where user_id=$1 and state='saved' and archived_at is null", [owner])).rows[0].total;
    const page = (await actor(owner, "select public.list_items('all') as reminders")).rows[0].reminders;
    assert.equal(count, 28);
    assert.equal(page.length, 25);
    assert.ok(page.every(i => i.state === 'saved' && !i.archived_at && i.user_id === owner));
    const visible = (await actor(owner, "select count(*)::integer as total from public.items where state='saved' and archived_at is null")).rows[0].total;
    assert.equal(visible, 28, 'RLS excludes other accounts');
  });
  const alice = await user(), bob = await user();
  const purchase = await draft(alice);
  await save(alice, purchase);
  await test('RLS hides another account’s purchases and profiles', async () => {
    assert.equal((await actor(bob, 'select * from public.purchases')).rowCount, 0);
    assert.equal((await actor(bob, 'select * from public.profiles')).rowCount, 1);
    await assert.rejects(actor(null, 'select * from public.purchases', [], 'anon'), /permission denied/);
    await assert.rejects(actor(bob, 'select public.delete_purchase($1)', [purchase]), /NOT_FOUND/);
    await assert.rejects(save(bob, purchase), /NOT_FOUND/);
  });
  await test('Direct mutations and service-only RPCs cannot bypass quotas', async () => {
    await assert.rejects(actor(alice, "update public.purchases set product_name='tampered'"), /permission denied/);
    await assert.rejects(actor(alice, 'select public.claim_notification_jobs(1,90)'), /permission denied/);
    await assert.rejects(actor(alice, "update public.account_entitlements set premium_until=now()+interval '1 year'"), /permission denied/);
    await assert.rejects(actor(alice, 'select * from private.billing_orders'), /permission denied/);
  });
  await test('Revision conflicts preserve the latest purchase', async () => {
    await assert.rejects(save(alice, purchase, null, 1), /CONFLICT/);
    await save(alice, purchase, null, 2);
    assert.equal((await actor(alice, 'select revision from public.purchases where id=$1', [purchase])).rows[0].revision, 3);
  });
  await test('Concurrent valid saves are unlimited', async () => {
    const u = await user();
    // Seed 9 saved purchases; run two real owner-scoped saves racing for one slot.
    await admin.query("insert into public.items(user_id,state,product_name) select $1,'saved','seed' from generate_series(1,9)", [u]);
    const a = await draft(u), b = await draft(u);
    const results = await Promise.allSettled([save(u, a), save(u, b)]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 2);
    assert.equal((await actor(u, 'select count(*)::int n from public.purchases where state=$1', ['saved'])).rows[0].n, 11);
  });
  const tomorrow = (await admin.query("select ((now() at time zone 'Asia/Manila')::date+31)::text d")).rows[0].d;
  await test('Concurrent saves preserve all dates while allocating only available item slots', async () => {
    const u = await user(), ids = [];
    for (let i = 0; i < 4; i++) { const id = await draft(u); await save(u, id); ids.push(id); }
    const w = { expires_on: tomorrow, reminders_enabled: true };
    await save(u, ids[0], w, 2); await save(u, ids[1], w, 2);
    const results = await Promise.allSettled([save(u, ids[2], w, 2), save(u, ids[3], w, 2)]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 2);
    assert.equal((await actor(u,'select public.account_usage() usage')).rows[0].usage.reminders,3);
    assert.equal((await actor(u,'select count(*)::int n from public.important_dates where reminders_enabled')).rows[0].n,4);
  });
  let doc;
  await test('Private documents require ownership and completed validation', async () => {
    doc = randomUUID();
    await actor(alice, "select public.reserve_document($1,$2,'receipt','receipt.png',10485760)", [doc, purchase]);
    const d = (await admin.query('select * from public.documents where id=$1', [doc])).rows[0];
    await admin.query('insert into storage.objects(bucket_id,name) values($1,$2)', ['purchase-documents', d.object_key]);
    assert.equal((await actor(alice, 'select * from storage.objects')).rowCount, 0);
    await assert.rejects(actor(bob, "select public.reserve_document($1,$2,'receipt','x.png',1024)", [randomUUID(), purchase]), /NOT_FOUND/);
    await assert.rejects(actor(alice, 'select public.finalize_document($1,$2,100,$3,$4)', [doc, alice, 'image/webp', 'a'.repeat(64)]), /permission denied/);
    await actor(null, 'select public.finalize_document($1,$2,100,$3,$4)', [doc, alice, 'image/webp', 'a'.repeat(64)], 'service_role');
    assert.equal((await actor(alice, 'select * from storage.objects')).rowCount, 1);
    assert.equal((await actor(bob, 'select * from storage.objects')).rowCount, 0);
  });
  await test('Concurrent reservations cannot exceed the document count', async () => {
    const results = await Promise.allSettled(Array.from({ length: 7 }, () => actor(alice, "select public.reserve_document($1,$2,'receipt','receipt.png',10485760)", [randomUUID(), purchase])));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 5);
    assert.equal((await actor(alice, 'select count(*)::int n from public.documents where purchase_id=$1', [purchase])).rows[0].n, 6);
  });
  await test('Global storage reservations are enforced across purchases', async () => {
    const u = await user(), ids = [await draft(u), await draft(u)];
    for (let i = 0; i < 9; i++) await actor(u, "select public.reserve_document($1,$2,'receipt','r.pdf',10485760)", [randomUUID(), ids[i % 2]]);
    await admin.query("delete from private.rate_limit_buckets where user_id=$1 and action='upload'", [u]);
    const results = await Promise.allSettled(ids.map(id => actor(u, "select public.reserve_document($1,$2,'receipt','r.pdf',10485760)", [randomUUID(), id])));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.match(results.find(r => r.status === 'rejected').reason.message, /STORAGE_LIMIT/);
  });
  await test('Payment replays credit one year exactly once', async () => {
    const order = randomUUID();
    await admin.query('insert into private.billing_orders(id,user_id) values($1,$2)', [order,alice]);
    await actor(null, "select public.attach_checkout($1,'cs_test','https://checkout.paymongo.com/test')", [order], 'service_role');
    await assert.rejects(actor(null, "select public.credit_payment('evt_bad',$1,'cs_test','pay_test',1,'PHP',false)", [order], 'service_role'), /PAYMENT_MISMATCH/);
    const credit = event => actor(null, "select public.credit_payment($1,$2,'cs_test','pay_test',36000,'PHP',false)", [event, order], 'service_role');
    await credit('evt_one');
    const until = (await admin.query('select premium_until from public.account_entitlements where user_id=$1', [alice])).rows[0].premium_until;
    await Promise.all([credit('evt_one'), credit('evt_duplicate')]);
    assert.equal((await admin.query('select premium_until from public.account_entitlements where user_id=$1', [alice])).rows[0].premium_until.getTime(), until.getTime());
  });
  await test('Reminder scheduling is idempotent, leased, and bounded daily', async () => {
    const u = await user(), p = await draft(u);
    await save(u, p, { expires_on: tomorrow, reminders_enabled: true });
    await save(u, p, { expires_on: tomorrow, reminders_enabled: true }, 2);
    const w = (await admin.query('select id from public.important_dates where item_id=$1', [p])).rows[0].id;
    assert.equal((await admin.query('select count(*)::int n from private.notification_jobs where date_id=$1', [w])).rows[0].n, 3);
    await admin.query("update private.notification_jobs set scheduled_at=now()-interval '1 minute',next_attempt_at=now()-interval '1 minute' where date_id=$1 and offset_value=30", [w]);
    const first = (await actor(null, 'select public.claim_notification_jobs(5,1) jobs', [], 'service_role')).rows[0].jobs;
    assert.equal(first.length, 1);
    assert.equal((await actor(null, 'select public.claim_notification_jobs(5,1) jobs', [], 'service_role')).rows[0].jobs.length, 0);
    const j = first[0], payload = { from: 'Keeply', to: j.email, subject: 'Reminder', html: 'Hello' };
    assert.equal((await actor(null, 'select public.prepare_notification($1,$2,$3) payload', [j.id, randomUUID(), payload], 'service_role')).rows[0].payload, null);
    assert.deepEqual((await actor(null, 'select public.prepare_notification($1,$2,$3) payload', [j.id, j.lease_token, payload], 'service_role')).rows[0].payload, payload);
    await actor(null, "select public.record_email_event('email_early','email.delivered')", [], 'service_role');
    await actor(null, "select public.finish_notification($1,$2,'accepted','email_early',null)", [j.id, j.lease_token], 'service_role');
    assert.equal((await admin.query('select status from private.notification_jobs where id=$1', [j.id])).rows[0].status, 'delivered');
    await save(u, p, { expires_on: tomorrow, reminders_enabled: false }, 3);
    await save(u, p, { expires_on: tomorrow, reminders_enabled: true }, 4);
    assert.equal((await admin.query('select status from private.notification_jobs where id=$1', [j.id])).rows[0].status, 'delivered');
  });
  await test('Account deletion blocks old tokens and retains file cleanup work', async () => {
    await actor(alice, 'select public.request_account_deletion()');
    assert.equal((await actor(alice, 'select * from public.purchases')).rowCount, 0);
    assert.equal((await actor(alice, 'select * from storage.objects')).rowCount, 0);
    await assert.rejects(draft(alice), /ACCOUNT_UNAVAILABLE/);
    const queues = (await admin.query('select * from private.object_deletions where object_key like $1', [alice + '/%'])).rows;
    assert.ok(queues.length >= 12);
    assert.ok(queues.every(q => q.not_before > new Date()));
    const work = (await actor(null, 'select public.run_maintenance() work', [], 'service_role')).rows[0].work;
    assert.ok(!work.accounts.includes(alice));
  });

  async function item(u,template='car') { const id=randomUUID();await actor(u,'select public.create_item_draft($1,$2)',[id,template]);return id; }
  const input=(kind='registration',due='2032-03-31',enabled=false)=>({kind,label:kind,due_on:due,reminders_enabled:enabled,interval_months:null,offsets:[{unit:'days',value:30},{unit:'days',value:7},{unit:'days',value:1}]});
  async function newItem(u,template='car',date=null){const id=await item(u,template);await actor(u,'select public.save_item_with_date($1,1,$2,$3,$4)',[id,'My item','',date]);return id;}
  async function newDate(u,id,value=input()){const d=randomUUID();await actor(u,'select public.save_important_date($1,$2,0,$3)',[d,id,value]);return d;}
  await test('All seven templates save, identity uploads are rejected, ownership isolates children',async()=>{
    const u=await user(),other=await user();
    for(const template of ['receipt','car','motorcycle','licence','passport','aircon','other']){
      const kind=['licence','passport'].includes(template)?'expiration':template==='aircon'?'service':template==='other'?'other':null;
      const id=await newItem(u,template,kind?input(kind):null);
      if(['licence','passport','other'].includes(template)) await assert.rejects(actor(u,"select public.reserve_document($1,$2,'receipt','scan.png',100)",[randomUUID(),id]),/DOCUMENTS_NOT_ALLOWED/);
      await assert.rejects(actor(other,'select public.save_item_with_date($1,2,$2,$3,null)',[id,'stolen','']),/NOT_FOUND/);
    }
    for(const table of ['items','important_dates','date_occurrences','reminder_offsets']){assert.equal((await actor(other,'select * from public.'+table)).rowCount,0);await assert.rejects(actor(u,'delete from public.'+table),/permission denied/);}
  });
  await test('A missing/invalid initial date rolls back the entire item save',async()=>{
    const u=await user(),id=await item(u,'passport');
    await assert.rejects(actor(u,'select public.save_item_with_date($1,1,$2,$3,null)',[id,'Passport','']),/DATE_REQUIRED/);
    await assert.rejects(actor(u,'select public.save_item_with_date($1,1,$2,$3,$4)',[id,'Passport','',input('registration')]),/INVALID_INPUT/);
    assert.equal((await actor(u,'select state from public.items where id=$1',[id])).rows[0].state,'draft');
  });
  await test('Dates on different item types share the three-slot reminder quota',async()=>{
    const u=await user(),car=await newItem(u),receipt=await draft(u);await save(u,receipt,{expires_on:'2032-03-31',reminders_enabled:true});
    await newDate(u,car,input('registration','2032-03-31',true));await newDate(u,car,input('insurance','2032-03-31',true));
    await newDate(u,car,input('service','2032-03-31',true));
    assert.equal((await actor(u,'select public.account_usage() usage')).rows[0].usage.reminders,2);
  });
  await test('Calendar-month offsets clamp to leap-month end in the account timezone',async()=>{
    const u=await user(),p=await newItem(u,'passport', {...input('expiration','2032-03-31',true),offsets:[{unit:'months',value:1}]});
    const d=(await actor(u,'select id from public.important_dates where item_id=$1',[p])).rows[0].id;
    const j=(await admin.query("select (scheduled_at at time zone 'Asia/Manila')::text t from private.notification_jobs where date_id=$1",[d])).rows[0];assert.equal(j.t,'2032-02-29 09:00:00');
    await actor(u,"select public.update_preferences('Test','America/New_York',true)");
    assert.equal((await admin.query("select (scheduled_at at time zone 'America/New_York')::text t from private.notification_jobs where date_id=$1",[d])).rows[0].t,'2032-02-29 09:00:00');
  });
  await test('Date correction preserves prior cycles and prevents stale completion',async()=>{
    const u=await user(),p=await newItem(u),d=await newDate(u,p,input('registration','2032-03-31',true));
    await actor(u,'select public.save_important_date($1,$2,2,$3)',[d,p,input('registration','2033-03-31',true)]);
    await actor(u,'select public.save_important_date($1,$2,3,$3)',[d,p,input('registration','2032-03-31',true)]);
    const o=(await actor(u,'select * from public.date_occurrences where date_id=$1 order by cycle',[d])).rows;
    assert.deepEqual(o.map(x=>x.status),['superseded','superseded','open']);assert.equal(new Set(o.map(x=>x.id)).size,3);
    await assert.rejects(actor(u,'select public.complete_date($1,2,current_date,null)',[d]),/CONFLICT/);
    await actor(u,'select public.complete_date($1,4,current_date,$2)',[d,'2034-03-31']);
    const all=(await actor(u,'select * from public.date_occurrences where date_id=$1',[d])).rows;assert.equal(all.filter(x=>x.status==='completed').length,1);assert.equal(all.filter(x=>x.status==='open').length,1);
    await assert.rejects(actor(u,'select public.complete_date($1,4,current_date,$2)',[d,'2034-03-31']),/CONFLICT/);
  });
  await test('Archive releases coverage and restoration succeeds uncovered',async()=>{
    const u=await user(),p=await newItem(u);await newDate(u,p,input('registration','2032-03-31',true));
    await actor(u,'select public.archive_item($1,2,true)',[p]);let usage=(await actor(u,'select public.account_usage() usage')).rows[0].usage;assert.equal(usage.purchases,1);assert.equal(usage.reminders,0);
    const other=await newItem(u);for(const kind of ['registration','insurance','service'])await newDate(u,other,input(kind,'2032-03-31',true));
    await actor(u,'select public.archive_item($1,3,false)',[p]);
    assert.equal((await actor(u,'select coverage_requested_at from public.items where id=$1',[p])).rows[0].coverage_requested_at,null);
  });
  await test('Date and offset caps cannot be bypassed by RPC calls',async()=>{
    const u=await user(),p=await newItem(u);for(let n=0;n<10;n++)await newDate(u,p);
    await assert.rejects(newDate(u,p),/DATE_LIMIT/);
    const p2=await newItem(u);
    await assert.rejects(newDate(u,p2,{...input(),offsets:[]}),/INVALID_INPUT/);
    await assert.rejects(newDate(u,p2,{...input(),offsets:[{unit:'months',value:25}]}),/check constraint/);
  });
  await test('A claimed reminder cannot be prepared after its occurrence is completed',async()=>{
    const u=await user(),p=await newItem(u),d=await newDate(u,p,input('registration','2032-03-31',true));
    const j=(await admin.query("update private.notification_jobs set status='sending',lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes' where date_id=$1 and offset_value=30 returning *",[d])).rows[0];
    await actor(u,'select public.complete_date($1,2,current_date,null)',[d]);
    const result=(await actor(null,'select public.prepare_notification($1,$2,$3) payload',[j.id,j.lease_token,{to:u+'@example.test'}],'service_role')).rows[0];assert.equal(result.payload,null);
  });

  async function packOrder(u,product='slots_30',slots=5) {
    const id=randomUUID();
    await actor(null,'select public.create_pack_order($1,$2,$3,false,$4)',[u,id,product,slots],'service_role');
    await actor(null,'select public.attach_checkout($1,$2,$3)',[id,'cs_'+id.replaceAll('-',''),'https://checkout.paymongo.com/test'],'service_role');
    return id;
  }
  async function pay(id,product='slots_30',event='evt_'+randomUUID(),slots=5) {
    return actor(null,'select public.credit_payment($1,$2,$3,$4,$5,\'PHP\',false)',[event,id,'cs_'+id.replaceAll('-',''),'pay_'+id.replaceAll('-',''),(product==='slots_30'?2900:24900)*(slots/5)],'service_role');
  }
  await test('Slot replacement is atomic, owner scoped, and blocks an already leased old item',async()=>{
    const u=await user(),other=await user(),ids=[];
    for(let n=0;n<4;n++)ids.push(await newItem(u,'car',input('registration','2032-03-31',true)));
    const job=(await admin.query("update private.notification_jobs set status='sending',lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes' where date_id in(select id from public.important_dates where item_id=$1) returning *",[ids[0]])).rows[0];
    await assert.rejects(actor(other,'select public.set_item_coverage($1,2,true,null,null)',[ids[3]]),/NOT_FOUND/);
    await assert.rejects(actor(u,'select public.set_item_coverage($1,2,true,$2,999)',[ids[3],ids[0]]),/CONFLICT/);
    assert.equal((await actor(u,'select public.item_coverage($1) c',[ids[0]])).rows[0].c.coverage,'covered');
    await actor(u,'select public.set_item_coverage($1,2,true,$2,2)',[ids[3],ids[0]]);
    assert.equal((await actor(u,'select public.item_coverage($1) c',[ids[0]])).rows[0].c.coverage,'off');
    assert.equal((await actor(u,'select public.item_coverage($1) c',[ids[3]])).rows[0].c.coverage,'covered');
    assert.equal((await actor(null,'select public.prepare_notification($1,$2,$3) p',[job.id,job.lease_token,{to:u+'@example.test'}],'service_role')).rows[0].p,null);
  });
  await test('30-day payment replay grants time once; early renewal extends time, not slots',async()=>{
    const u=await user(),id=await packOrder(u);
    await assert.rejects(actor(u,'select public.create_pack_order($1,$2,\'slots_30\',false)',[u,randomUUID()]),/permission denied/);
    await pay(id);
    const first=(await actor(u,'select public.account_usage() u')).rows[0].u;
    assert.equal(first.slot_limit,8);
    await Promise.all([pay(id),pay(id)]);
    assert.equal((await actor(u,'select public.account_usage() u')).rows[0].u.paid_until,first.paid_until);
    const second=await packOrder(u);await pay(second);
    const next=(await actor(u,'select public.account_usage() u')).rows[0].u;
    assert.equal(Date.parse(next.paid_until)-Date.parse(first.paid_until),30*86400000);
    assert.equal(next.slot_limit,8);
    const permanent=await packOrder(u,'slots_permanent');await pay(permanent,'slots_permanent');await pay(permanent,'slots_permanent');
    const forever=(await actor(u,'select public.account_usage() u')).rows[0].u;
    assert.equal(forever.permanent,true);assert.equal(forever.slot_limit,8);
    await assert.rejects(packOrder(u),/PACK_ALREADY_OWNED/);
  });
  await test('Variable quantities bind checkout amount, deduplicate by size, and reject invalid sizes', async()=>{
    const u=await user();
    for(const quantity of [0,4,6,101,105,null]) await assert.rejects(actor(null,'select public.create_pack_order($1,$2,$3,false,$4)',[u,randomUUID(),'slots_30',quantity],'service_role'),/INVALID_INPUT/);
    const id=await packOrder(u,'slots_30',25);
    const existing=(await actor(null,'select public.create_pack_order($1,$2,$3,false,25) o',[u,randomUUID(),'slots_30'],'service_role')).rows[0].o;
    assert.equal(existing.id,id); assert.equal(existing.amount_minor,14500);assert.equal(existing.slot_count,25);
    const different=await packOrder(u,'slots_30',100);assert.notEqual(id,different);
    await assert.rejects(pay(id),/PAYMENT_MISMATCH/);
    await pay(id,'slots_30',undefined,25);await pay(id,'slots_30',undefined,25);
    const usage=(await actor(u,'select public.account_usage() u')).rows[0].u;
    assert.equal(usage.slot_limit,28);assert.equal(usage.renewal_slots,25);assert.equal(usage.temporary_active,true);
    const history=(await actor(u,'select public.get_billing_orders() h')).rows[0].h;
    assert.equal(history.find(o=>o.id===id).slot_count,25);assert.equal(history.find(o=>o.id===id).product,'slots_30');
    await admin.query("insert into public.items(user_id,state,product_name,coverage_requested_at) select $1,'saved','Covered '||n,now() from generate_series(1,28) n",[u]);
    const uncovered=await newItem(u,'car',input('registration','2032-03-31',true));
    assert.equal((await actor(u,'select public.account_usage() u')).rows[0].u.reminders,28);
    assert.equal((await actor(u,'select public.item_coverage($1) c',[uncovered])).rows[0].c.coverage,'off');
    await assert.rejects(admin.query('update private.billing_orders set amount_minor=2900 where id=$1',[id]),/billing_orders_pack_price/);
  });
  await test('Changed renewal quantity applies only to its own term; refund revokes unused capacity',async()=>{
    const u=await user(),first=await packOrder(u,'slots_30',25);await pay(first,'slots_30',undefined,25);
    const second=await packOrder(u,'slots_30',100);await pay(second,'slots_30',undefined,100);
    assert.equal((await actor(u,'select public.account_usage() u')).rows[0].u.slot_limit,28);
    const terms=(await admin.query('select * from private.billing_orders where id=any($1) order by period_starts_at',[[first,second]])).rows;
    assert.equal(+terms[0].period_ends_at,+terms[1].period_starts_at);
    await admin.query("update private.billing_orders set period_starts_at=period_starts_at-interval '31 days',period_ends_at=period_ends_at-interval '31 days' where user_id=$1",[u]);
    await admin.query("update private.reminder_packs set paid_until=paid_until-interval '31 days' where user_id=$1",[u]);
    assert.equal((await actor(u,'select public.account_usage() u')).rows[0].u.slot_limit,103);
    await actor(null,'select public.revoke_refunded_order($1)',['pay_'+second.replaceAll('-','')],'service_role');
    assert.equal((await actor(u,'select public.account_usage() u')).rows[0].u.slot_limit,3);
  });
  await test('Permanent purchases accumulate to 100 slots, survive replay, and refunds remove only their quantity',async()=>{
    const u=await user(),first=await packOrder(u,'slots_permanent',25);await pay(first,'slots_permanent',undefined,25);
    const second=await packOrder(u,'slots_permanent',75);await pay(second,'slots_permanent',undefined,75);await pay(second,'slots_permanent',undefined,75);
    const usage=(await actor(u,'select public.account_usage() u')).rows[0].u;
    assert.equal(usage.slot_limit,103);assert.equal(usage.permanent_slots,100);
    await assert.rejects(packOrder(u,'slots_permanent',5),/SLOT_PACK_LIMIT/);
    await actor(null,'select public.revoke_refunded_order($1)',['pay_'+second.replaceAll('-','')],'service_role');
    const restored=(await actor(u,'select public.account_usage() u')).rows[0].u;
    assert.equal(restored.slot_limit,28);assert.equal(restored.permanent,true);
    await actor(null,'select public.revoke_refunded_order($1)',['pay_'+first.replaceAll('-','')],'service_role');
    assert.equal((await actor(u,'select public.account_usage() u')).rows[0].u.slot_limit,3);
  });
  await test('Competing permanent checkouts cannot exceed 100 slots on fulfillment',async()=>{
    const u=await user(),first=await packOrder(u,'slots_permanent',75),second=await packOrder(u,'slots_permanent',100);
    await pay(first,'slots_permanent',undefined,75);await pay(second,'slots_permanent',undefined,100);
    assert.equal((await actor(u,'select public.account_usage() u')).rows[0].u.slot_limit,78);
    assert.equal((await admin.query('select status from private.billing_orders where id=$1',[second])).rows[0].status,'review');
  });
  await test('Expired capacity is checked before send without waiting for maintenance; opt-ins survive',async()=>{
    const u=await user(),id=await packOrder(u);await pay(id);
    const ids=[];for(let n=0;n<4;n++)ids.push(await newItem(u,'car',input('registration','2032-03-31',true)));
    const job=(await admin.query("update private.notification_jobs set status='sending',lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes' where date_id in(select id from public.important_dates where item_id=$1) returning *",[ids[3]])).rows[0];
    await admin.query("update private.reminder_packs set paid_until=now()-interval '1 second' where user_id=$1",[u]);
    assert.equal((await actor(null,'select public.prepare_notification($1,$2,$3) p',[job.id,job.lease_token,{to:u+'@example.test'}],'service_role')).rows[0].p,null);
    assert.equal((await actor(u,'select count(*)::int n from public.important_dates where reminders_enabled')).rows[0].n,4);
    const usage=(await actor(u,'select public.account_usage() u')).rows[0].u;assert.equal(usage.reminders,3);assert.equal(usage.purchases,4);
    const renewal=await packOrder(u);await pay(renewal);
    assert.equal((await actor(u,'select public.item_coverage($1) c',[ids[3]])).rows[0].c.coverage,'covered');
  });
  await test('Renewal notices use stable identities, preferences, and final expiry-version checks',async()=>{
    const u=await user(),order=await packOrder(u);await pay(order);
    await admin.query("update private.reminder_packs set paid_until=now()+interval '2 days' where user_id=$1",[u]);
    await admin.query('delete from private.email_daily_quota');
    const jobs=(await actor(null,'select public.claim_renewal_jobs(2) j',[],'service_role')).rows[0].j;
    const j=jobs.find(j=>j.email===u+'@example.test');assert.ok(j);
    const second=await packOrder(u);await pay(second);
    assert.equal((await actor(null,'select public.prepare_renewal($1,$2,$3) p',[j.id,j.lease_token,{to:j.email}],'service_role')).rows[0].p,null);
    await actor(u,'select public.update_renewal_preference(false)');
    await admin.query("update private.reminder_packs set paid_until=now()+interval '2 days' where user_id=$1",[u]);
    assert.ok(!(await actor(null,'select public.claim_renewal_jobs(2) j',[],'service_role')).rows[0].j.some(j=>j.email===u+'@example.test'));
  });
  await test('Verified refunds enforce role, currency and mode; full refunds revoke only once',async()=>{
    const u=await user(),id=await packOrder(u);await pay(id);
    const payment='pay_'+id.replaceAll('-','');
    const refund=(amount,currency='PHP',live=false,role='service_role')=>actor(null,'select public.apply_verified_refund($1,$2,$3,$4)',[payment,amount,currency,live],role);
    await assert.rejects(refund(2900,'PHP',false,'authenticated'),/permission denied/);
    await assert.rejects(refund(2900,'USD'),/PAYMENT_MISMATCH/);
    await assert.rejects(refund(2900,'PHP',true),/PAYMENT_MISMATCH/);
    await refund(100);
    assert.equal((await actor(u,'select public.account_usage() u')).rows[0].u.slot_limit,8);
    await refund(2900);await refund(2900);
    assert.equal((await actor(u,'select public.account_usage() u')).rows[0].u.slot_limit,3);
  });
  await test('Test packs do not grant capacity when live billing is enabled',async()=>{
    const u=await user(),id=await packOrder(u);await pay(id);
    await admin.query('update private.billing_settings set live=true');
    try {
      assert.equal((await actor(u,'select public.account_usage() u')).rows[0].u.slot_limit,3);
      await assert.rejects(packOrder(u),/PAYMENT_MISMATCH/);
    } finally { await admin.query('update private.billing_settings set live=false'); }
  });
  await test('Cursor pagination and search work beyond 2000 saved items',async()=>{
    const u=await user();
    await admin.query("insert into public.items(user_id,state,product_name,created_at) select $1,'saved','item '||n,now()-n*interval '1 second' from generate_series(1,2002) n",[u]);
    const first=(await actor(u,'select public.list_items() items')).rows[0].items;assert.equal(first.length,25);
    const last=first.at(-1);
    const second=(await actor(u,'select public.list_items(\'all\',\'\',\'all\',$1,$2) items',[last.created_at,last.id])).rows[0].items;
    assert.equal(second.length,25);assert.ok(!second.some(i=>first.some(f=>f.id===i.id)));
    const found=(await actor(u,"select public.list_items('all','item 2002') items")).rows[0].items;assert.equal(found.length,1);
    assert.equal((await actor(u,'select public.account_usage() u')).rows[0].u.purchases,2002);
    const extra=await draft(u);await save(u,extra);
    assert.equal((await actor(u,'select public.account_usage() u')).rows[0].u.purchases,2003);
  });

  const feedback = (u, id = randomUUID(), notes = 'Please make the reminder dates easier to see on mobile.', expect = true) => actor(u,
    'select public.submit_feedback($1,\'suggestion\',\'Improve mobile reminders\',$2,$3) result', [id, notes, expect]);
  const feedbackStatus = async u => (await actor(u,'select public.feedback_status() s')).rows[0].s;
  const packState = async u => (await admin.query('select * from private.reminder_packs where user_id=$1',[u])).rows[0];
  await admin.query('update private.billing_settings set live=false');
  await test('Feedback validates notes and atomically grants exactly one reward under concurrent retries', async()=>{
    const u=await user(),id=randomUUID();
    await assert.rejects(feedback(u,id,'   \n\t '),/FEEDBACK_NOTES_REQUIRED/);
    assert.equal((await admin.query('select * from private.feedback where user_id=$1',[u])).rowCount,0);
    await Promise.all([feedback(u,id),feedback(u,id)]);
    assert.equal((await admin.query('select * from private.feedback where user_id=$1',[u])).rowCount,1);
    assert.equal((await admin.query('select * from private.feedback_claims where user_id=$1',[u])).rowCount,1);
    assert.equal((await actor(u,'select public.account_usage() u')).rows[0].u.slot_limit,8);
    const end=(await packState(u)).paid_until;
    await assert.rejects(feedback(u,randomUUID(),'Another valid detailed suggestion here.',true),/FEEDBACK_OFFER_CHANGED/);
    await feedback(u,randomUUID(),'',false);
    assert.equal(+(await packState(u)).paid_until,+end);
    await assert.rejects(feedback(u,id,'Changed retry content with enough characters.',false),/FEEDBACK_REPLAY_CONFLICT/);
    assert.equal((await feedbackStatus(u)).claimed,true);
    await admin.query('update private.reminder_packs set paid_until=now()-interval \'1 day\' where user_id=$1',[u]);
    assert.equal((await actor(u,'select public.account_usage() u')).rows[0].u.slot_limit,3);
    assert.equal((await feedbackStatus(u)).eligible,false);
  });
  await test('Concurrent different feedback claims cannot extend the reward twice',async()=>{
    const u=await user();const results=await Promise.allSettled([feedback(u),feedback(u)]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal((await admin.query('select count(*)::int n from private.feedback_claims where user_id=$1',[u])).rows[0].n,1);
  });
  await test('Feedback is private, rate limited, and claims are inaccessible to clients',async()=>{
    const u=await user(),other=await user();await feedback(u);
    assert.equal((await feedbackStatus(other)).claimed,false);
    for(const table of ['feedback','feedback_claims','feedback_settings']) {
      await assert.rejects(actor(u,'select * from private.'+table),/permission denied/);
      await assert.rejects(actor(u,'delete from private.'+table),/permission denied/);
    }
    await assert.rejects(actor(null,'select public.feedback_status()',[],'anon'),/permission denied/);
    await assert.rejects(actor(u,'select public.purge_old_feedback()'),/permission denied/);
    for(let i=0;i<4;i++)await feedback(u,randomUUID(),'',false);
    await assert.rejects(feedback(u,randomUUID(),'',false),/RATE_LIMITED/);
  });
  await test('Reward stacks after paid access; refund moves reward forward without losing its duration',async()=>{
    const u=await user(),order=await packOrder(u);await pay(order);
    const before=await packState(u);await feedback(u);
    assert.equal(+(await packState(u)).paid_until-+before.paid_until,30*86400000);
    await actor(null,'select public.revoke_refunded_order($1)',['pay_'+order.replaceAll('-','')],'service_role');
    const c=(await admin.query('select * from private.feedback_claims where user_id=$1',[u])).rows[0];
    assert.equal(+c.ends_at-+c.starts_at,30*86400000);
    assert.ok(Math.abs(+c.starts_at-Date.now())<10000);
    assert.equal(+(await packState(u)).paid_until,+c.ends_at);
    await actor(null,'select public.revoke_refunded_order($1)',['pay_'+order.replaceAll('-','')],'service_role');
    assert.equal(+(await packState(u)).paid_until,+c.ends_at);
  });
  await test('Paid renewal appends to promotion; paid refunds and permanent upgrade refunds preserve reward',async()=>{
    const u=await user();await feedback(u);const promoEnd=(await packState(u)).paid_until;
    const order=await packOrder(u);await pay(order);await pay(order);
    assert.equal(+(await packState(u)).paid_until-+promoEnd,30*86400000);
    await actor(null,'select public.revoke_refunded_order($1)',['pay_'+order.replaceAll('-','')],'service_role');
    assert.equal(+(await packState(u)).paid_until,+promoEnd);
    const permanent=await packOrder(u,'slots_permanent');await pay(permanent,'slots_permanent');
    assert.equal((await feedbackStatus(u)).permanent,true);
    await feedback(u,randomUUID(),'',false);
    await actor(null,'select public.revoke_refunded_order($1)',['pay_'+permanent.replaceAll('-','')],'service_role');
    assert.equal(+(await packState(u)).paid_until,+promoEnd);
  });
  await test('Permanent accounts, promotion switch, expired packs, and test/live isolation behave correctly',async()=>{
    const permanent=await user(),order=await packOrder(permanent,'slots_permanent');await pay(order,'slots_permanent');
    assert.equal((await feedbackStatus(permanent)).eligible,false);await feedback(permanent,randomUUID(),'',false);
    assert.equal((await feedbackStatus(permanent)).claimed,false);
    await admin.query('update private.feedback_settings set promotion_enabled=false');
    const u=await user();await feedback(u,randomUUID(),'',false);assert.equal((await feedbackStatus(u)).claimed,false);
    await admin.query('update private.feedback_settings set promotion_enabled=true');
    await admin.query("insert into private.reminder_packs(user_id,live,paid_until) values($1,false,now()-interval '1 day')",[u]);
    await feedback(u);assert.ok(Math.abs(+(await packState(u)).paid_until-Date.now()-30*86400000)<10000);
    await admin.query('update private.billing_settings set live=true');
    assert.equal((await actor(u,'select public.account_usage() u')).rows[0].u.slot_limit,3);
    assert.equal((await feedbackStatus(u)).eligible,false);
    const liveUser=await user();await feedback(liveUser);assert.equal((await packState(liveUser)).live,true);
    await admin.query('update private.billing_settings set live=false');
  });
  await test('Feedback retention removes text but preserves claim; account deletion removes both',async()=>{
    const u=await user();await feedback(u);
    await admin.query("update private.feedback set created_at=now()-interval '13 months' where user_id=$1",[u]);
    await actor(null,'select public.purge_old_feedback()',[],'service_role');
    assert.equal((await admin.query('select * from private.feedback where user_id=$1',[u])).rowCount,0);
    assert.equal((await feedbackStatus(u)).claimed,true);
    await admin.query('delete from auth.users where id=$1',[u]);
    assert.equal((await admin.query('select * from private.feedback_claims where user_id=$1',[u])).rowCount,0);
  });


  const recurringInput = (due='2032-01-31', end='2032-03-31', enabled=true) => ({
    ...input('other',due,enabled), offsets:[{unit:'days',value:7}],
    recurrence_months:1, recurrence_ends_on:end, payment_amount_minor:845000,
  });
  async function recurring(u, value=recurringInput()) {
    const id=await newItem(u,'other',value);
    const d=(await actor(u,'select * from public.important_dates where item_id=$1',[id])).rows[0];
    return {id,d};
  }
  const advance=()=>actor(null,'select public.advance_recurring_dates()',[],'service_role');
  const occurrences=async(d)=>(await admin.query('select due_on::text,status,completed_on,cycle from public.date_occurrences where date_id=$1 order by cycle',[d])).rows;
  await test('Recurring completion keeps the original month-end anchor and inclusive end',async()=>{
    const u=await user(),{id,d}=await recurring(u);
    assert.equal(d.payment_amount_minor,'845000');
    await actor(u,'select public.complete_date($1,2,current_date,null)',[d.id]);
    assert.equal((await occurrences(d.id))[1].due_on,'2032-02-29');
    await actor(u,'select public.complete_date($1,3,current_date,null)',[d.id]);
    assert.equal((await occurrences(d.id))[2].due_on,'2032-03-31');
    await actor(u,'select public.complete_date($1,4,current_date,null)',[d.id]);
    const rows=await occurrences(d.id);assert.equal(rows.length,3);assert.ok(rows.every(r=>r.status==='completed'));
    assert.equal((await actor(u,'select public.account_usage() u')).rows[0].u.reminders,1);
    assert.equal((await admin.query("select count(*)::int n from private.notification_jobs where date_id=$1 and status='pending'",[d.id])).rows[0].n,0);
    assert.ok((await actor(u,'select public.item_detail($1) d',[id])).rows[0].d.dates[0].recurrence_months===1);
  });
  await test('Recurrence changes preserve anchors, resets are deliberate, stopping cancels future cycles',async()=>{
    const u=await user(),{id,d}=await recurring(u);
    await actor(u,'select public.complete_date($1,2,current_date,null)',[d.id]);
    await actor(u,'select public.save_important_date($1,$2,3,$3)',[d.id,id,{...recurringInput('2032-02-29'),payment_amount_minor:null}]);
    assert.equal((await admin.query('select recurrence_anchor::text a from public.important_dates where id=$1',[d.id])).rows[0].a,'2032-01-31');
    await actor(u,'select public.complete_date($1,4,current_date,null)',[d.id]);
    assert.equal((await occurrences(d.id))[2].due_on,'2032-03-31');
    await actor(u,'select public.save_important_date($1,$2,5,$3)',[d.id,id,{...recurringInput('2032-03-31'),recurrence_months:null,recurrence_ends_on:null}]);
    await actor(u,'select public.complete_date($1,6,current_date,null)',[d.id]);
    assert.equal((await occurrences(d.id)).filter(r=>r.status==='open').length,0);
    const reset=await recurring(await user());
    const owner=reset.d.user_id;
    await actor(owner,'select public.save_important_date($1,$2,2,$3)',[reset.d.id,reset.id,recurringInput('2032-02-15')]);
    assert.equal((await admin.query('select recurrence_anchor::text a from public.important_dates where id=$1',[reset.d.id])).rows[0].a,'2032-02-15');
  });
  await test('Changing a recurring custom date to a one-time kind clears recurrence atomically',async()=>{
    const u=await user(),id=await newItem(u,'car',recurringInput());
    const d=(await actor(u,'select * from public.important_dates where item_id=$1',[id])).rows[0];
    const value={...input('registration'),recurrence_months:null,recurrence_ends_on:null,payment_amount_minor:null};
    await assert.rejects(actor(u,'select public.save_important_date($1,$2,1,$3)',[d.id,id,value]),/CONFLICT/);
    assert.equal((await actor(u,'select recurrence_months from public.important_dates where id=$1',[d.id])).rows[0].recurrence_months,1);
    await actor(u,'select public.save_important_date($1,$2,2,$3)',[d.id,id,value]);
    const changed=(await actor(u,'select * from public.important_dates where id=$1',[d.id])).rows[0];
    assert.equal(changed.kind,'registration');assert.equal(changed.recurrence_months,null);assert.equal(changed.recurrence_anchor,null);
  });
  await test('Worker catches up without marking payments complete and repeated runs are idempotent',async()=>{
    const u=await user(),{d}=await recurring(u,recurringInput('2020-01-31','2020-03-31',false));
    await Promise.all([advance(),advance()]);await advance();
    const rows=await occurrences(d.id);
    assert.deepEqual(rows.map(r=>r.due_on),['2020-01-31','2020-02-29','2020-03-31']);
    assert.ok(rows.every(r=>r.status==='unconfirmed'&&r.completed_on===null));
    assert.equal((await admin.query('select count(*)::int n from private.notification_jobs where date_id=$1',[d.id])).rows[0].n,0);
  });
  await test('Worker creates the next active email schedule once and retains one coverage slot',async()=>{
    const dates=(await admin.query("select ((now() at time zone 'Asia/Manila')::date-interval '1 day')::date::text due, ((now() at time zone 'Asia/Manila')::date+interval '4 months')::date::text ending")).rows[0];
    const u=await user(),{d}=await recurring(u,recurringInput(dates.due,dates.ending));
    await advance();await advance();
    const rows=await occurrences(d.id);assert.equal(rows.length,2);assert.equal(rows[0].status,'unconfirmed');assert.equal(rows[1].status,'open');
    const jobs=(await admin.query("select expiration_date::text due,offset_value from private.notification_jobs where date_id=$1 and status='pending'",[d.id])).rows;
    assert.deepEqual(jobs,[{due:rows[1].due_on,offset_value:7}]);
    assert.equal((await actor(u,'select public.account_usage() u')).rows[0].u.reminders,1);
  });
  await test('Recurring worker honors archives and coverage without stopping saved schedules',async()=>{
    const u=await user(),{id,d}=await recurring(u,recurringInput('2020-01-31','2020-02-29'));
    await actor(u,'select public.archive_item($1,2,true)',[id]);await advance();
    assert.equal((await occurrences(d.id))[0].status,'open');
    await actor(u,'select public.archive_item($1,3,false)',[id]);await advance();
    assert.equal((await occurrences(d.id)).length,2);
    assert.equal((await admin.query("select count(*)::int n from private.notification_jobs where date_id=$1 and status='pending'",[d.id])).rows[0].n,0);
  });
  await test('Recurring fields reject invalid RPC input and isolate users and worker privileges',async()=>{
    const u=await user(),outside=await user(),{id,d}=await recurring(u);
    for(const patch of [{recurrence_months:2},{recurrence_ends_on:null},{recurrence_ends_on:'2031-01-01'},{payment_amount_minor:-1},{offsets:[{unit:'days',value:30}]},{offsets:[{unit:'months',value:1}]}]) {
      await assert.rejects(actor(u,'select public.save_important_date($1,$2,2,$3)',[d.id,id,{...recurringInput(),...patch}]),/INVALID_INPUT|check constraint/);
    }
    await assert.rejects(actor(outside,'select public.save_important_date($1,$2,2,$3)',[d.id,id,recurringInput()]),/NOT_FOUND/);
    await assert.rejects(actor(outside,'select public.complete_date($1,2,current_date,null)',[d.id]),/NOT_FOUND/);
    await assert.rejects(actor(u,'select public.complete_date($1,2,current_date,$2)',[d.id,'2032-02-28']),/INVALID_INPUT/);
    await assert.rejects(actor(u,'select public.advance_recurring_dates()'),/permission denied/);
    await assert.rejects(actor(u,'select private.save_important_date_base($1,$2,2,$3)',[d.id,id,recurringInput()]),/permission denied/);
    assert.equal((await actor(outside,'select * from public.important_dates where id=$1',[d.id])).rowCount,0);
  });

  console.log('\n' + passed + ' database integration tests passed.');
} finally {
  if (admin) await admin.end();
  if (started) command('pg_ctl', ['-D', join(folder, 'data'), '-m', 'immediate', '-w', 'stop']);
  await rm(folder, { recursive: true, force: true });
}
