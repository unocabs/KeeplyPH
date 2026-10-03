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
  let migrationSeed, recurrenceMigrationSeed;
  for (const name of (await readdir('supabase/migrations')).filter(n => n.endsWith('.sql') && (!process.env.PG_TEST_MIGRATION_THROUGH || n <= process.env.PG_TEST_MIGRATION_THROUGH)).sort()) {
    if(name==='202609230005_items.sql') {
      const u=await user(), id=await draft(u); await save(u,id,{expires_on:'2032-03-31',reminders_enabled:true});
      const old=(await admin.query('select id from public.warranties where purchase_id=$1',[id])).rows[0];
      const job=(await admin.query("update private.notification_jobs set status='accepted',provider_email_id='migration_email',first_attempt_at=now(),frozen_payload='{\"to\":\"test@example.test\"}'::jsonb where warranty_id=$1 and offset_days=30 returning id,frozen_payload",[old.id])).rows[0];
      migrationSeed={u,id,warranty:old.id,job};
    }
    if(name==='202610010012_reminder_categories.sql') {
      const u=await user(), id=randomUUID();
      await actor(u,"select public.create_item_draft($1,'other')",[id]);
      await actor(u,'select public.save_item_with_date($1,1,$2,$3,$4)',[id,'Existing loan','',{kind:'other',label:'Existing payment',due_on:'2032-01-31',reminders_enabled:false,interval_months:null,offsets:[{unit:'days',value:7}],recurrence_months:1,recurrence_ends_on:'2032-03-31',payment_amount_minor:845000}]);
      recurrenceMigrationSeed=(await admin.query('select * from public.important_dates where item_id=$1',[id])).rows[0];
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
    for(const patch of [{recurrence_months:2},{recurrence_ends_on:'2031-01-01'},{payment_amount_minor:-1},{offsets:[{unit:'days',value:30}]},{offsets:[{unit:'months',value:1}]}]) {
      await assert.rejects(actor(u,'select public.save_important_date($1,$2,2,$3)',[d.id,id,{...recurringInput(),...patch}]),/INVALID_INPUT|check constraint/);
    }
    await assert.rejects(actor(outside,'select public.save_important_date($1,$2,2,$3)',[d.id,id,recurringInput()]),/NOT_FOUND/);
    await assert.rejects(actor(outside,'select public.complete_date($1,2,current_date,null)',[d.id]),/NOT_FOUND/);
    await assert.rejects(actor(u,'select public.complete_date($1,2,current_date,$2)',[d.id,'2032-02-28']),/INVALID_INPUT/);
    await assert.rejects(actor(u,'select public.advance_recurring_dates()'),/permission denied/);
    await assert.rejects(actor(u,'select private.save_important_date_base($1,$2,2,$3)',[d.id,id,recurringInput()]),/permission denied/);
    assert.equal((await actor(outside,'select * from public.important_dates where id=$1',[d.id])).rowCount,0);
  });

  await test('Category migration preserves existing recurrence dates, amounts and anchors',async()=>{
    const after=(await admin.query('select * from public.important_dates where id=$1',[recurrenceMigrationSeed.id])).rows[0];
    assert.deepEqual(after,recurrenceMigrationSeed);
  });
  await test('Open-ended quarterly premiums complete and advance from their original anchor',async()=>{
    const u=await user(), id=await item(u,'other');
    const value={...recurringInput('2032-01-31',null),recurrence_months:3};
    await actor(u,'select public.save_item_with_date($1,1,$2,$3,$4,$5)',[id,'Family policy','',value,'life-insurance']);
    const d=(await actor(u,'select * from public.important_dates where item_id=$1',[id])).rows[0];
    await actor(u,'select public.complete_date($1,2,current_date,null)',[d.id]);
    await actor(u,'select public.complete_date($1,3,current_date,null)',[d.id]);
    assert.deepEqual((await occurrences(d.id)).map(o=>o.due_on),['2032-01-31','2032-04-30','2032-07-31']);
    const detail=(await actor(u,'select public.item_detail($1) d',[id])).rows[0].d;
    assert.equal(detail.reminder_preset,'life-insurance');
    assert.equal(detail.dates[0].recurrence_ends_on,null);
    // The legacy five-argument save preserves the selected type.
    await actor(u,'select public.save_item_with_date($1,2,$2,$3,null)',[id,'Renamed policy','']);
    assert.equal((await actor(u,'select public.item_detail($1) d',[id])).rows[0].d.reminder_preset,'life-insurance');
    await actor(u,'select public.save_item_with_date($1,3,$2,$3,null,$4)',[id,'Renamed policy','','']);
    assert.equal((await actor(u,'select public.item_detail($1) d',[id])).rows[0].d.reminder_preset,null);
  });
  await test('Open-ended schedules catch up independently of email alerts and can be stopped',async()=>{
    const due=(await admin.query("select ((now() at time zone 'Asia/Manila')::date-interval '1 day')::date::text d")).rows[0].d;
    const u=await user(),{id,d}=await recurring(u,recurringInput(due,null,false));
    await advance(); await advance();
    const rows=await occurrences(d.id); assert.equal(rows.length,2); assert.equal(rows[0].status,'unconfirmed'); assert.equal(rows[1].status,'open');
    await actor(u,'select public.save_important_date($1,$2,3,$3)',[d.id,id,{...recurringInput(rows[1].due_on,null,false),recurrence_months:null}]);
    await actor(u,'select public.complete_date($1,4,current_date,null)',[d.id]);
    assert.equal((await occurrences(d.id)).filter(o=>o.status==='open').length,0);
  });
  await test('Registration, insurance, maintenance and expiration can opt into repeat schedules',async()=>{
    const u=await user();
    for(const [template,kind] of [['car','registration'],['motorcycle','insurance'],['aircon','service'],['passport','expiration']]) {
      const id=await newItem(u,template,{...recurringInput('2032-01-31',null,false),kind});
      const d=(await actor(u,'select * from public.important_dates where item_id=$1',[id])).rows[0];
      await actor(u,'select public.complete_date($1,2,current_date,null)',[d.id]);
      assert.equal((await occurrences(d.id))[1].due_on,'2032-02-29');
    }
  });
  await test('Saved type validation is atomic, owner-scoped and category filters run before pagination',async()=>{
    const u=await user(),outside=await user();
    const bad=await item(u,'other');
    await assert.rejects(actor(u,'select public.save_item_with_date($1,1,$2,$3,$4,$5)',[bad,'Bad','',recurringInput(),'unknown-type']),/check constraint/);
    assert.equal((await actor(u,'select state from public.items where id=$1',[bad])).rows[0].state,'draft');
    const id=await item(u,'other');
    await actor(u,'select public.save_item_with_date($1,1,$2,$3,$4,$5)',[id,'Policy','',recurringInput(),'life-insurance']);
    await assert.rejects(actor(outside,'select public.save_item_with_date($1,2,$2,$3,null,$4)',[id,'Changed','','rent']),/NOT_FOUND/);
    await admin.query("insert into public.items(user_id,template_key,state,product_name,created_at) select $1,'car','saved','Vehicle '||n,now()+interval '1 second' from generate_series(1,26) n",[u]);
    const result=(await actor(u,"select public.list_items('all','','category:insurance') d")).rows[0].d;
    assert.deepEqual(result.map(i=>i.id),[id]);
    assert.equal((await actor(u,"select public.list_items('all','life insurance','all') d")).rows[0].d[0].id,id);
    assert.deepEqual((await actor(outside,"select public.list_items('all','','category:insurance') d")).rows[0].d,[]);
    await assert.rejects(actor(u,'select private.save_item_with_date_base($1,2,$2,$3,null)',[id,'Changed','']),/permission denied/);
  });

  await test('SMS defaults off, preferences remain private, and provider RPCs are restricted',async()=>{
    const u=await user(), other=await user();
    const p=(await actor(u,'select * from public.profiles where id=$1',[u])).rows[0];
    assert.equal(p.email_reminders_enabled,true);assert.equal(p.sms_reminders_enabled,false);assert.equal(p.phone_number,null);
    await assert.rejects(actor(u,"select public.update_alert_preferences('123',true,true)"),/INVALID_INPUT/);
    await actor(u,"select public.update_alert_preferences('+639171234567',true,true)");
    assert.equal((await actor(other,'select phone_number from public.profiles where id=$1',[u])).rowCount,0);
    await assert.rejects(actor(u,"select public.begin_phone_verification($1,'+639171234567','hash')",[u]),/permission denied/);
    await assert.rejects(actor(u,'select public.claim_sms_jobs(2)'),/permission denied/);
    await actor(u,'select public.dismiss_phone_prompt()');
    assert.equal((await actor(u,'select phone_prompt_dismissed from public.profiles')).rows[0].phone_prompt_dismissed,true);
  });
  await test('Phone verification throttles sends and guesses, expires, and resets on number change',async()=>{
    const u=await user();
    await actor(u,"select public.update_alert_preferences('+639181234567',true,true)");
    await actor(null,"select public.begin_phone_verification($1,'+639181234567','correct')",[u],'service_role');
    await assert.rejects(actor(null,"select public.begin_phone_verification($1,'+639181234567','again')",[u],'service_role'),/RATE_LIMIT/);
    for(let i=0;i<5;i++)assert.equal((await actor(null,"select public.verify_alert_phone($1,'wrong') ok",[u],'service_role')).rows[0].ok,false);
    assert.equal((await actor(null,"select public.verify_alert_phone($1,'correct') ok",[u],'service_role')).rows[0].ok,false);
    await admin.query("update private.phone_challenges set attempts=0,expires_at=now()-interval '1 second' where user_id=$1",[u]);
    assert.equal((await actor(null,"select public.verify_alert_phone($1,'correct') ok",[u],'service_role')).rows[0].ok,false);
    await admin.query("update private.phone_challenges set expires_at=now()+interval '1 minute' where user_id=$1",[u]);
    assert.equal((await actor(null,"select public.verify_alert_phone($1,'correct') ok",[u],'service_role')).rows[0].ok,true);
    await actor(u,"select public.update_alert_preferences('+639191234567',true,true)");
    assert.equal((await actor(u,'select phone_verified_at from public.profiles')).rows[0].phone_verified_at,null);
  });
  async function smsFixture(){
    const u=await user();
    await actor(u,"select public.update_alert_preferences('+639201234567',true,false)");
    const id=await newItem(u,'other',{kind:'other',label:'Payment',due_on:'2032-01-31',reminders_enabled:true,interval_months:null,offsets:[{unit:'days',value:7}]});
    assert.equal((await admin.query('select count(*)::int n from private.sms_jobs s join public.important_dates d on d.id=s.date_id where d.item_id=$1',[id])).rows[0].n,0);
    await admin.query('update public.profiles set phone_verified_at=now() where id=$1',[u]);
    const job=(await admin.query('select s.* from private.sms_jobs s join public.important_dates d on d.id=s.date_id where d.item_id=$1',[id])).rows[0];
    await admin.query("update private.sms_jobs set scheduled_at=now()-interval '1 minute' where id=$1",[job.id]);
    return {u,id,job};
  }
  async function claimSms(){return (await actor(null,'select public.claim_sms_jobs(2) jobs',[],'service_role')).rows[0].jobs;}
  await test('Verified SMS schedules independently of email and expired leases never resend',async()=>{
    const {u,id,job}=await smsFixture();
    const jobs=await claimSms(), claimed=jobs.find(j=>j.id===job.id);assert.ok(claimed);
    assert.equal((await actor(null,'select public.prepare_sms($1,$2) ok',[job.id,claimed.lease_token],'service_role')).rows[0].ok,true);
    assert.ok((await actor(u,'select public.reminder_preview($1) p',[id])).rows[0].p.length);
    await admin.query("update private.sms_jobs set lease_until=now()-interval '1 second' where id=$1",[job.id]);
    assert.equal((await claimSms()).some(j=>j.id===job.id),false);
    assert.equal((await admin.query('select status from private.sms_jobs where id=$1',[job.id])).rows[0].status,'unknown');
  });
  await test('SMS rechecks opt-out, completion, phone changes, archives and coverage after claim',async()=>{
    for(const change of ['opt-out','complete','phone','archive','coverage']){
      const {u,id,job}=await smsFixture();
      const claimed=(await claimSms()).find(j=>j.id===job.id);assert.ok(claimed);
      if(change==='opt-out')await actor(u,"select public.update_alert_preferences('+639201234567',false,false)");
      if(change==='complete')await actor(u,'select public.complete_date($1,2,current_date,null)',[job.date_id]);
      if(change==='phone')await actor(u,"select public.update_alert_preferences('+639211234567',true,false)");
      if(change==='archive')await actor(u,'select public.archive_item($1,2,true)',[id]);
      if(change==='coverage')await actor(u,'select public.set_item_coverage($1,2,false,null,null)',[id]);
      assert.equal((await actor(null,'select public.prepare_sms($1,$2) ok',[job.id,claimed.lease_token],'service_role')).rows[0].ok,false);
    }
  });
  await test('SMS monthly and global quotas bound costs while preserving email jobs',async()=>{
    const {u,job}=await smsFixture();
    await admin.query("insert into private.sms_monthly_quota(user_id,month,reserved) values($1,date_trunc('month',now() at time zone 'UTC')::date,30)",[u]);
    assert.equal((await claimSms()).some(j=>j.id===job.id),false);
    assert.equal((await admin.query('select last_error_code from private.sms_jobs where id=$1',[job.id])).rows[0].last_error_code,'monthly_sms_limit');
    const f=await smsFixture();
    await admin.query("update private.sms_daily_quota set reserved=100 where day=(now() at time zone 'UTC')::date");
    assert.deepEqual(await claimSms(),[]);
    assert.equal((await admin.query('select status from private.sms_jobs where id=$1',[f.job.id])).rows[0].status,'pending');
  });
  await test('Warranties reject recurrence and assumed renewal dates through direct RPCs',async()=>{
    const u=await user();
    await assert.rejects(newItem(u,'receipt',{...recurringInput('2032-01-31',null,false),kind:'warranty'}),/warranty_does_not_repeat/);
    const id=await newItem(u,'receipt',{kind:'warranty',label:'Warranty',due_on:'2032-01-31',reminders_enabled:false,interval_months:null,offsets:[{unit:'days',value:7}]});
    const d=(await actor(u,'select id from public.important_dates where item_id=$1',[id])).rows[0];
    await assert.rejects(actor(u,"select public.complete_date($1,2,current_date,'2033-01-31')",[d.id]),/INVALID_INPUT/);
    await actor(u,'select public.complete_date($1,2,current_date,null)',[d.id]);
    assert.equal((await occurrences(d.id)).filter(o=>o.status==='open').length,0);
  });

  await test('Read-only web push prerequisite check identifies every applied schema marker',async()=>{
    const checks=(await admin.query(await readFile('supabase/check-web-push-prerequisites.sql','utf8'))).rows;
    assert.equal(checks.length,15);for(const check of checks)assert.match(check.status,/PRESENT/,check.migration);
  });
  const pushKey=Buffer.concat([Buffer.from([4]),Buffer.alloc(64,7)]).toString('base64url');
  const pushAuth=Buffer.alloc(16,9).toString('base64url');
  const pushEndpoint=()=> 'https://fcm.googleapis.com/wp/' + randomUUID();
  async function registerPush(u,endpoint=pushEndpoint(),auth=pushAuth) {
    await actor(u,'select public.register_push_subscription($1,$2,$3)',[endpoint,pushKey,auth]); return endpoint;
  }
  async function pushStatus(u,endpoint=null){return (await actor(u,'select public.push_device_status($1) s',[endpoint])).rows[0].s;}
  async function pushFixture(){
    const u=await user();
    await actor(u,"select public.update_preferences('Push user','Asia/Manila',false)");
    const id=await newItem(u,'other',{kind:'other',label:'Payment',due_on:'2032-01-31',reminders_enabled:true,interval_months:null,offsets:[{unit:'days',value:7}]});
    const endpoint=await registerPush(u);
    const job=(await admin.query('select j.* from private.push_jobs j join public.important_dates d on d.id=j.date_id where d.item_id=$1',[id])).rows[0];
    await admin.query("update private.push_jobs set next_attempt_at=now()-interval '1 minute' where id=$1",[job.id]);
    return {u,id,endpoint,job};
  }
  async function claimPush(){return (await actor(null,'select public.claim_push_jobs(5) j',[],'service_role')).rows[0].j;}
  async function preparePush(job,lease){return (await actor(null,'select public.prepare_push_job($1,$2) j',[job,lease],'service_role')).rows[0].j;}
  async function finishPush(job,lease,status){return actor(null,'select public.finish_push_job($1,$2,$3,null)',[job,lease,status],'service_role');}
  await test('Push subscriptions are owner-scoped, endpoint-restricted and worker RPCs are service-only',async()=>{
    const u=await user(),other=await user(),endpoint=await registerPush(u);
    await registerPush(u,endpoint);
    assert.deepEqual(await pushStatus(u,endpoint),{enabled:true,registered:true,deviceCount:1});
    assert.deepEqual(await pushStatus(other,endpoint),{enabled:false,registered:false,deviceCount:0});
    await assert.rejects(registerPush(other,endpoint),/DEVICE_LINKED/);
    for(const endpoint of ['https://127.0.0.1/private','https://fcm.googleapis.com.evil.test/wp/token','http://fcm.googleapis.com/wp/token','https://fcm.googleapis.com:443/wp/token','https://user@fcm.googleapis.com/wp/token']) await assert.rejects(registerPush(u,endpoint),/INVALID_INPUT/);
    await assert.rejects(actor(u,'select * from private.push_subscriptions'),/permission denied/);
    await assert.rejects(actor(u,'select * from private.push_jobs'),/permission denied/);
    await assert.rejects(actor(u,'select public.claim_push_jobs(2)'),/permission denied/);
    await assert.rejects(actor(u,'select public.expire_push_subscription($1,$2)',[endpoint,pushAuth]),/permission denied/);
    await assert.rejects(actor(u,'select private.schedule_date($1)',[randomUUID()]),/permission denied/);
    await assert.rejects(actor(null,'select public.push_device_status(null)',[],'anon'),/permission denied/);
    assert.equal((await actor(other,'select public.prepare_push_test($1) s',[endpoint])).rows[0].s,null);
  });
  await test('Concurrent registration enforces five devices and removing one preserves the others',async()=>{
    const u=await user(),endpoints=Array.from({length:6},pushEndpoint);
    const results=await Promise.allSettled(endpoints.map(endpoint=>registerPush(u,endpoint)));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,5);
    assert.equal((await pushStatus(u)).deviceCount,5);
    const first=endpoints[results.findIndex(r=>r.status==='fulfilled')];
    await actor(u,'select public.remove_push_subscription($1)',[first]);
    assert.equal((await pushStatus(u)).deviceCount,4);assert.equal((await pushStatus(u)).enabled,true);
    await admin.query('delete from private.push_subscriptions where user_id=$1',[u]);
    assert.deepEqual(await pushStatus(u),{enabled:false,registered:false,deviceCount:0});
  });
  await test('Push-only schedules are visible in previews, concurrent claims are exclusive and acceptance is final',async()=>{
    const f=await pushFixture();
    assert.equal((await admin.query('select count(*)::int n from private.notification_jobs where date_id=$1',[f.job.date_id])).rows[0].n,0);
    const preview=(await actor(f.u,'select public.reminder_preview($1) p',[f.id])).rows[0].p;
    assert.equal(preview[0].next_scheduled_on,'2032-01-24');
    const claims=(await Promise.all([claimPush(),claimPush()])).flat().filter(j=>j.id===f.job.id);
    assert.equal(claims.length,1);
    const payload=await preparePush(f.job.id,claims[0].lease_token);
    assert.equal(payload.endpoint,f.endpoint);assert.equal(payload.itemId,f.id);
    assert.equal(await preparePush(f.job.id,claims[0].lease_token),null);
    await finishPush(f.job.id,claims[0].lease_token,'accepted');
    await admin.query('select private.schedule_date($1)',[f.job.date_id]);
    assert.equal((await admin.query('select status from private.push_jobs where id=$1',[f.job.id])).rows[0].status,'accepted');
    assert.equal((await claimPush()).some(j=>j.id===f.job.id),false);
  });
  await test('Push rechecks completion, archives, coverage, opt-out and deletion after claim',async()=>{
    for(const change of ['complete','archive','coverage','optout','delete']) {
      const f=await pushFixture(),lease=(await claimPush()).find(j=>j.id===f.job.id).lease_token;
      if(change==='complete')await actor(f.u,'select public.complete_date($1,2,current_date,null)',[f.job.date_id]);
      if(change==='archive')await admin.query('update public.items set archived_at=now() where id=$1',[f.id]);
      if(change==='coverage')await admin.query('update public.items set coverage_active=false,coverage_requested_at=null where id=$1',[f.id]);
      if(change==='optout')await admin.query('update public.profiles set push_reminders_enabled=false where id=$1',[f.u]);
      if(change==='delete')await admin.query('update public.profiles set deletion_requested_at=now() where id=$1',[f.u]);
      assert.equal(await preparePush(f.job.id,lease),null,change);
    }
  });
  await test('Known push rejections retry at most three times and uncertain prepared sends never replay',async()=>{
    const f=await pushFixture();
    for(let attempt=1;attempt<=3;attempt++) {
      const lease=(await claimPush()).find(j=>j.id===f.job.id).lease_token;
      assert.ok(await preparePush(f.job.id,lease));await finishPush(f.job.id,lease,'retry');
      const row=(await admin.query('select * from private.push_jobs where id=$1',[f.job.id])).rows[0];
      assert.equal(row.attempts,attempt);assert.equal(row.status,attempt===3?'failed':'retry');
      await admin.query('update private.push_jobs set next_attempt_at=now() where id=$1',[f.job.id]);
    }
    assert.equal((await claimPush()).some(j=>j.id===f.job.id),false);
    const uncertain=await pushFixture(),lease=(await claimPush()).find(j=>j.id===uncertain.job.id).lease_token;
    assert.ok(await preparePush(uncertain.job.id,lease));
    await admin.query("update private.push_jobs set lease_until=now()-interval '1 minute' where id=$1",[uncertain.job.id]);
    assert.equal((await claimPush()).some(j=>j.id===uncertain.job.id),false);
    assert.equal((await admin.query('select status from private.push_jobs where id=$1',[uncertain.job.id])).rows[0].status,'unknown');
  });
  await test('Expired push cleanup compares keys and test notifications are rate limited',async()=>{
    const u=await user(),endpoint=await registerPush(u);
    for(let n=0;n<3;n++)assert.ok((await actor(u,'select public.prepare_push_test($1) s',[endpoint])).rows[0].s);
    await assert.rejects(actor(u,'select public.prepare_push_test($1)',[endpoint]),/RATE_LIMIT/);
    const replacementAuth=Buffer.alloc(16,8).toString('base64url');
    await registerPush(u,endpoint,replacementAuth);
    await actor(null,'select public.expire_push_subscription($1,$2)',[endpoint,pushAuth],'service_role');
    assert.equal((await pushStatus(u,endpoint)).registered,true);
    await actor(null,'select public.expire_push_subscription($1,$2)',[endpoint,replacementAuth],'service_role');
    assert.deepEqual(await pushStatus(u,endpoint),{enabled:false,registered:false,deviceCount:0});
  });
  await test('Completing a recurring push-only date schedules its next occurrence exactly once',async()=>{
    const u=await user();await actor(u,"select public.update_preferences('Push user','Asia/Manila',false)");
    const id=await newItem(u,'other',{kind:'other',label:'Monthly payment',due_on:'2032-01-31',reminders_enabled:true,interval_months:null,offsets:[{unit:'days',value:7}],recurrence_months:1});
    await registerPush(u);
    const date=(await admin.query('select id,revision from public.important_dates where item_id=$1',[id])).rows[0];
    await actor(u,'select public.complete_date($1,$2,current_date,null)',[date.id,date.revision]);
    await admin.query('select private.schedule_date($1)',[date.id]);await admin.query('select private.schedule_date($1)',[date.id]);
    const jobs=(await admin.query("select *,expiration_date::text as expiry from private.push_jobs where date_id=$1 and status='pending'",[date.id])).rows;
    assert.equal(jobs.length,1);assert.equal(jobs[0].expiry,'2032-02-29');
    const occurrence=(await admin.query("select * from public.date_occurrences where id=$1",[jobs[0].occurrence_id])).rows[0];
    assert.equal(occurrence.status,'open');
  });
  await test('Push skips past offsets, reschedules timezone changes and cascades device deletion',async()=>{
    const f=await pushFixture();
    await admin.query("update private.push_jobs set next_attempt_at=scheduled_at where id=$1",[f.job.id]);
    await actor(f.u,"select public.update_preferences('Push user','UTC',false)");
    assert.equal(new Date((await admin.query('select scheduled_at from private.push_jobs where id=$1',[f.job.id])).rows[0].scheduled_at).toISOString(),'2032-01-24T09:00:00.000Z');
    const due=(await admin.query("select (now() at time zone 'UTC')::date::text due")).rows[0].due;
    const past=await newItem(f.u,'other',{kind:'other',label:'Past offsets',due_on:due,reminders_enabled:true,interval_months:null,offsets:[{unit:'days',value:7}]});
    assert.equal((await admin.query('select count(*)::int n from private.push_jobs j join public.important_dates d on d.id=j.date_id where d.item_id=$1',[past])).rows[0].n,0);
    await actor(f.u,'select public.remove_push_subscription($1)',[f.endpoint]);
    assert.equal((await admin.query('select count(*)::int n from private.push_jobs where id=$1',[f.job.id])).rows[0].n,0);
  });

  // Campaign fixtures use this isolated cluster only; no hosted project is contacted.
  async function resetIdeas() {
    await admin.query("update public.profiles set suggestion_emails_enabled=false; update private.reminder_idea_jobs set status='cancelled' where status in ('pending','sending','retry'); update private.notification_jobs set status='cancelled' where status in ('pending','sending','retry'); update private.email_daily_quota set reserved=0,suggestion_reserved=0;");
  }
  async function ideaFixture(days=2) {
    const u=await user();
    const hour=(await admin.query("select extract(hour from now() at time zone 'UTC')::integer utc_hour")).rows[0].utc_hour;
    let offset=10-hour; if(offset>12)offset-=24; if(offset< -12)offset+=24;
    const tz=offset===0?'UTC':'Etc/GMT'+(offset>0?'-':'+')+Math.abs(offset);
    await admin.query('update public.profiles set timezone=$2 where id=$1',[u,tz]);
    await actor(u,'select public.update_email_preferences(false,true)');
    const e=(await admin.query("update private.reminder_idea_enrollments set enrolled_at=now()-make_interval(days=>$2),next_eligible_at=now() where user_id=$1 returning *",[u,days])).rows[0];
    return {u,e,tz};
  }
  async function claimIdeas() { return (await actor(null,'select public.claim_reminder_idea_jobs(2) jobs',[],'service_role')).rows[0].jobs; }
  function ideaPayload(email) { return {from:'Keeply <test@example.test>',to:email,subject:'Reminder idea',html:'<p>A useful date</p>',text:'A useful date',headers:{'List-Unsubscribe':'<https://keeplyph.com/api/email/unsubscribe?token=test>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}}; }
  async function prepareIdea(j,payload=ideaPayload(j.email)) { return (await actor(null,'select public.prepare_reminder_idea($1,$2,$3) p',[j.id,j.lease_token,payload],'service_role')).rows[0].p; }
  async function finishIdea(j,status='accepted',provider=null) { await actor(null,'select public.finish_reminder_idea($1,$2,$3,$4,null)',[j.id,j.lease_token,status,provider],'service_role'); }
  await test('Reminder idea prerequisites are read-only and consent and worker privileges are separate',async()=>{
    await resetIdeas();
    const checks=(await admin.query(await readFile('supabase/check-reminder-ideas-prerequisites.sql','utf8'))).rows;
    assert.equal(checks.length,16); assert.ok(checks.every(c=>c.status.startsWith('PRESENT')));
    const u=await user(); assert.equal((await actor(u,'select suggestion_emails_enabled from public.profiles')).rows[0].suggestion_emails_enabled,false);
    for(const sql of ['select public.claim_reminder_idea_jobs(1)',"select public.unsubscribe_reminder_ideas(gen_random_uuid(),gen_random_uuid())",'select * from private.reminder_idea_jobs']) await assert.rejects(actor(u,sql),/permission denied/);
    await actor(u,'select public.update_email_preferences(false,true)');
    const p=(await actor(u,'select email_reminders_enabled,suggestion_emails_enabled from public.profiles')).rows[0];
    assert.deepEqual(p,{email_reminders_enabled:false,suggestion_emails_enabled:true});
    assert.equal((await admin.query("select next_eligible_at>now()+interval '47 hours' as delayed from private.reminder_idea_enrollments where user_id=$1",[u])).rows[0].delayed,true);
  });
  await test('Concurrent idea claims deduplicate and freeze unsubscribe headers across retries',async()=>{
    await resetIdeas(); const f=await ideaFixture();
    const claims=(await Promise.all([claimIdeas(),claimIdeas()])).flat(); assert.equal(claims.length,1); const j=claims[0]; assert.equal(j.theme,'start');
    const original=await prepareIdea(j); assert.deepEqual(original.headers,ideaPayload(j.email).headers);
    await finishIdea(j,'retry'); await admin.query('update private.reminder_idea_jobs set next_attempt_at=now() where id=$1',[j.id]);
    const retry=(await claimIdeas())[0]; assert.equal(retry.id,j.id); assert.notEqual(retry.lease_token,j.lease_token);
    const frozen=await prepareIdea(retry,{...ideaPayload(j.email),subject:'Changed template'}); assert.deepEqual(frozen,original);
    await actor(null,"select public.record_email_event('idea-early-event','email.delivered')",[],'service_role');
    await finishIdea(retry,'accepted','idea-early-event');
    assert.equal((await admin.query('select status from private.reminder_idea_jobs where id=$1',[j.id])).rows[0].status,'delivered');
    assert.equal((await claimIdeas()).length,0);
    assert.equal((await admin.query('select step from private.reminder_idea_enrollments where user_id=$1',[f.u])).rows[0].step,1);
  });
  await test('Suggestions recheck opt-out, deleted accounts, confirmation, suppression and address after claim',async()=>{
    for(const change of ['optout','deletion','unconfirmed','suppression','address']) {
      await resetIdeas(); const f=await ideaFixture(),j=(await claimIdeas())[0];
      if(change==='address')await prepareIdea(j);
      if(change==='optout')await actor(null,'select public.unsubscribe_reminder_ideas($1,$2)',[f.u,f.e.id],'service_role');
      if(change==='deletion')await admin.query('update public.profiles set deletion_requested_at=now() where id=$1',[f.u]);
      if(change==='unconfirmed')await admin.query('update auth.users set email_confirmed_at=null where id=$1',[f.u]);
      if(change==='suppression')await admin.query('update public.profiles set email_delivery_blocked=true where id=$1',[f.u]);
      if(change==='address')await admin.query("update auth.users set email='changed@example.test' where id=$1",[f.u]);
      assert.equal(await prepareIdea(j),null,change);
    }
  });
  await test('Old unsubscribe links cannot disable a new enrollment and opt-out preserves deadline alerts',async()=>{
    await resetIdeas(); const f=await ideaFixture(),j=(await claimIdeas())[0];
    await actor(f.u,'select public.update_email_preferences(true,false)'); assert.equal(await prepareIdea(j),null);
    assert.equal((await admin.query('select email_reminders_enabled from public.profiles where id=$1',[f.u])).rows[0].email_reminders_enabled,true);
    await actor(f.u,'select public.update_email_preferences(true,true)');
    await actor(null,'select public.unsubscribe_reminder_ideas($1,$2)',[f.u,f.e.id],'service_role');
    assert.equal((await admin.query('select suggestion_emails_enabled from public.profiles where id=$1',[f.u])).rows[0].suggestion_emails_enabled,true);
  });
  await test('Ideas prioritize missing categories, rotate examples, and skip stale onboarding steps',async()=>{
    await resetIdeas(); const f=await ideaFixture(9);
    await admin.query("insert into public.items(id,user_id,template_key,state,product_name,reminder_preset,created_at) values(gen_random_uuid(),$1,'other','saved','Existing loan','personal-loan',now()-interval '5 days')",[f.u]);
    const j=(await claimIdeas())[0]; assert.equal(j.theme,'vehicles');
    await admin.query("insert into private.reminder_idea_jobs(user_id,enrollment_id,step,theme,variant,status,first_attempt_at) values($1,$2,99,'bills',0,'accepted',now()-interval '35 days')",[f.u,f.e.id]);
    assert.equal((await admin.query("select private.choose_reminder_idea($1,3) theme",[f.u])).rows[0].theme,'bills');
    await resetIdeas(); const old=await ideaFixture(60),later=(await claimIdeas())[0];
    assert.notEqual(later.theme,'start');
    const e=(await admin.query("select step,next_eligible_at>now()+interval '13 days' as delayed from private.reminder_idea_enrollments where user_id=$1",[old.u])).rows[0];
    assert.ok(e.step>=6); assert.equal(e.delayed,true); assert.equal((await claimIdeas()).length,0);
  });
  await test('Category changes cancel stale ideas and older themes rotate their examples',async()=>{
    await resetIdeas(); const f=await ideaFixture(9);
    await admin.query("insert into private.reminder_idea_jobs(user_id,enrollment_id,step,theme,status,first_attempt_at,accepted_at) values($1,$2,99,'loans','accepted',now()-interval '35 days',now()-interval '35 days')",[f.u,f.e.id]);
    const j=(await claimIdeas())[0]; assert.equal(j.theme,'loans'); assert.equal(j.variant,1);
    await admin.query("insert into public.items(id,user_id,template_key,state,product_name,reminder_preset,created_at) values(gen_random_uuid(),$1,'other','saved','Existing loan','personal-loan',now()-interval '5 days')",[f.u]);
    assert.equal(await prepareIdea(j),null);
    await resetIdeas(); const g=await ideaFixture(),k=(await claimIdeas())[0]; await prepareIdea(k);
    await actor(null,'select public.unsubscribe_reminder_ideas($1,$2)',[g.u,g.e.id],'service_role');
    await finishIdea(k,'accepted','idea-after-optout');
    assert.equal((await admin.query('select suggestion_emails_enabled from public.profiles where id=$1',[g.u])).rows[0].suggestion_emails_enabled,false);
    assert.equal((await admin.query('select status from private.reminder_idea_jobs where id=$1',[k.id])).rows[0].status,'accepted');
  });
  await test('Recent activity, account timezone and transactional backlog defer suggestions',async()=>{
    await resetIdeas(); const f=await ideaFixture();
    await admin.query("update public.profiles set timezone=$2 where id=$1",[f.u,f.tz==='UTC'?'Etc/GMT-3':'UTC']);
    if((await admin.query("select (now() at time zone timezone)::time not between time '10:00' and time '12:00' outside from public.profiles where id=$1",[f.u])).rows[0].outside) assert.equal((await claimIdeas()).length,0);
    await admin.query('update public.profiles set timezone=$2 where id=$1',[f.u,f.tz]);
    await admin.query("insert into public.items(id,user_id,template_key,state,product_name) values(gen_random_uuid(),$1,'other','saved','Just added')",[f.u]);
    assert.equal((await claimIdeas()).length,0);
    await admin.query("update public.items set created_at=now()-interval '5 days' where user_id=$1",[f.u]);
    // Existing fixture supplies a valid transactional job; a due backlog wins globally.
    const tx=(await admin.query('select id from private.notification_jobs limit 1')).rows[0];
    await admin.query("update private.notification_jobs set status='pending',next_attempt_at=now() where id=$1",[tx.id]);
    assert.equal((await claimIdeas()).length,0);
    await admin.query("update private.notification_jobs set status='cancelled' where id=$1",[tx.id]);
    assert.equal((await claimIdeas()).length,1);
  });
  await test('Suggestion daily allowance leaves 80 sends reserved for important emails',async()=>{
    await resetIdeas(); await ideaFixture(); await ideaFixture();
    await admin.query("insert into private.email_daily_quota(day,reserved,suggestion_reserved) values((now() at time zone 'UTC')::date,9,9) on conflict(day) do update set reserved=9,suggestion_reserved=9");
    assert.equal((await claimIdeas()).length,1);
    const quota=(await admin.query("select reserved,suggestion_reserved from private.email_daily_quota where day=(now() at time zone 'UTC')::date")).rows[0];
    assert.deepEqual(quota,{reserved:10,suggestion_reserved:10}); assert.equal((await claimIdeas()).length,0);
  });
  await test('Campaign retry bounds, expired leases and complaint suppression remain durable',async()=>{
    await resetIdeas(); await ideaFixture(); const j=(await claimIdeas())[0]; await prepareIdea(j);
    await admin.query("update private.reminder_idea_jobs set first_attempt_at=now()-interval '24 hours',lease_until=now()-interval '1 minute' where id=$1",[j.id]);
    assert.equal((await claimIdeas()).length,0); assert.equal((await admin.query('select status from private.reminder_idea_jobs where id=$1',[j.id])).rows[0].status,'unknown');
    await resetIdeas(); const g=await ideaFixture(),k=(await claimIdeas())[0]; await prepareIdea(k); await finishIdea(k,'accepted','idea-complaint');
    await actor(null,"select public.record_email_event('idea-complaint','email.complained')",[],'service_role');
    assert.equal((await admin.query('select email_delivery_blocked from public.profiles where id=$1',[g.u])).rows[0].email_delivery_blocked,true);
    assert.equal((await admin.query('select status from private.reminder_idea_jobs where id=$1',[k.id])).rows[0].status,'failed');
  });

  if (!process.env.PG_TEST_MIGRATION_THROUGH || process.env.PG_TEST_MIGRATION_THROUGH >= '202610020016_occurrence_snooze.sql') {
    await (await import('../tests/database/snooze.mjs')).testSnooze({admin,actor,user,newItem,registerPush,test});
  }

  if (!process.env.PG_TEST_MIGRATION_THROUGH || process.env.PG_TEST_MIGRATION_THROUGH >= '202610040017_install_reward.sql') {
    const claimSetup = async (u,endpoint,installed=true) => (await actor(u,'select public.claim_install_reward($1,$2) reward',[endpoint,installed])).rows[0].reward;
    const rewardUsage = async u => (await actor(u,'select public.account_usage() usage')).rows[0].usage;
    await test('Installation reward requires authentication, installed signal and an owned enabled push device',async()=>{
      const u=await user(),other=await user(),endpoint=await registerPush(u);
      await assert.rejects(actor(null,'select public.claim_install_reward($1,true)',[endpoint],'anon'),/permission denied/);
      await assert.rejects(claimSetup(other,endpoint),/SETUP_REQUIRED/);
      await assert.rejects(claimSetup(u,endpoint,false),/SETUP_REQUIRED/);
      await assert.rejects(claimSetup(u,endpoint,null),/SETUP_REQUIRED/);
      await actor(u,'select public.remove_push_subscription($1)',[endpoint]);
      await assert.rejects(claimSetup(u,endpoint),/SETUP_REQUIRED/);
      assert.equal((await rewardUsage(u)).slot_limit,3);
      await assert.rejects(actor(u,'select * from private.install_reward_claims'),/permission denied/);
      await assert.rejects(actor(u,'insert into private.install_reward_claims(user_id) values($1)',[u]),/permission denied/);
    });
    await test('Concurrent reward claims grant exactly two slots once across devices and reconnects',async()=>{
      const u=await user(),first=await registerPush(u),second=await registerPush(u);
      const results=await Promise.all([claimSetup(u,first),claimSetup(u,second),claimSetup(u,first)]);
      assert.equal(results.filter(r=>r.granted).length,1);
      assert.ok(results.every(r=>r.claimed));
      let usage=await rewardUsage(u);
      assert.equal(usage.slot_limit,5);assert.equal(usage.bonus_slots,2);assert.equal(usage.install_reward_claimed,true);
      assert.equal(usage.permanent,false,'Reward is independent of paid permanent pack ownership');
      await actor(u,'select public.remove_push_subscription($1)',[first]);
      await actor(u,'select public.remove_push_subscription($1)',[second]);
      assert.equal((await rewardUsage(u)).slot_limit,5,'Turning off notifications preserves reward');
      const third=await registerPush(u);
      assert.deepEqual(await claimSetup(u,third),{claimed:true,granted:false});
      assert.equal((await rewardUsage(u)).slot_limit,5);
      assert.equal((await admin.query('select count(*)::integer n from private.install_reward_claims where user_id=$1',[u])).rows[0].n,1);
    });
    await test('Reward restores selected reminder coverage and creates future push jobs without backfilling',async()=>{
      const u=await user(),ids=[],pack=await packOrder(u);await pay(pack);
      for(let n=0;n<5;n++)ids.push(await newItem(u,'car',input('registration','2032-03-31',true)));
      await admin.query("update private.reminder_packs set paid_until=now()-interval '1 day' where user_id=$1",[u]);
      const endpoint=await registerPush(u);
      assert.equal((await rewardUsage(u)).reminders,3);
      await claimSetup(u,endpoint);
      const usage=await rewardUsage(u);assert.equal(usage.reminders,5);
      const covered=(await admin.query('select coverage_active from public.items where id=any($1)',[ids])).rows;
      assert.ok(covered.every(i=>i.coverage_active));
      const jobs=(await admin.query("select count(distinct d.item_id)::integer n from private.push_jobs j join public.important_dates d on d.id=j.date_id where d.user_id=$1 and j.status='pending'",[u])).rows[0].n;
      assert.equal(jobs,5);
    });
    await test('Permanent reward survives temporary pack expiry and purchased permanent pack refunds',async()=>{
      const u=await user(),endpoint=await registerPush(u);await claimSetup(u,endpoint);
      const temporary=await packOrder(u);await pay(temporary);
      assert.equal((await rewardUsage(u)).slot_limit,10);
      await admin.query("update private.reminder_packs set paid_until=now()-interval '1 day' where user_id=$1",[u]);
      assert.equal((await rewardUsage(u)).slot_limit,5);
      const permanent=await packOrder(u,'slots_permanent',10);await pay(permanent,'slots_permanent',undefined,10);
      const usage=await rewardUsage(u);assert.equal(usage.slot_limit,15);assert.equal(usage.permanent_slots,10);
      await actor(null,'select public.revoke_refunded_order($1)',['pay_'+permanent.replaceAll('-','')],'service_role');
      // Temporary purchase still exists; the reward always remains additive.
      assert.equal((await rewardUsage(u)).bonus_slots,2);
      await actor(null,'select public.revoke_refunded_order($1)',['pay_'+temporary.replaceAll('-','')],'service_role');
      assert.equal((await rewardUsage(u)).slot_limit,5);
      await admin.query('delete from auth.users where id=$1',[u]);
      assert.equal((await admin.query('select count(*)::integer n from private.install_reward_claims where user_id=$1',[u])).rows[0].n,0);
    });
    await test('Read-only setup prerequisite check includes all migrations through the reward',async()=>{
      const checks=(await admin.query(await readFile('supabase/check-install-reward-prerequisites.sql','utf8'))).rows;
      assert.equal(checks.length,18);for(const check of checks)assert.match(check.status,/PRESENT/,check.migration);
    });
  }

  console.log('\n' + passed + ' database integration tests passed.');
} finally {
  if (admin) await admin.end();
  if (started) command('pg_ctl', ['-D', join(folder, 'data'), '-m', 'immediate', '-w', 'stop']);
  await rm(folder, { recursive: true, force: true });
}
