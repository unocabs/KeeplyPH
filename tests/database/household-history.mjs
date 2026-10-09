import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export async function testHouseholdHistory({ admin, actor, user, test, activityMigrationSeed }) {
  const today = (await admin.query("select (now() at time zone 'Asia/Manila')::date::text as t")).rows[0].t;
  async function fixture({ kind = 'other', preset = 'electric-bill', repeat = 1, due = today, interval = null, template = 'other' } = {}) {
    const owner = await user(), item = randomUUID();
    await actor(owner, 'select public.create_item_draft($1,$2)', [item, template]);
    await actor(owner, 'select public.save_item_with_date($1,1,$2,$3,$4,$5)', [item, 'Household record', '', { kind, label: 'Important date', due_on: due, reminders_enabled: false, interval_months: interval, offsets: [], recurrence_months: repeat, recurrence_ends_on: null, payment_amount_minor: 60000 }, preset]);
    return { owner, item, ...(await state(owner, item)) };
  }
  async function state(owner, item) {
    const d = (await actor(owner, 'select public.item_detail($1) as item', [item])).rows[0].item.dates[0];
    return { date: d, occurrence: d.occurrences.find(o => o.status === 'open') };
  }
  const data = (overrides = {}) => ({ activity_type: 'payment', title: 'Bill paid', completed_on: today, amount_minor: 60000, notes: '', document_ids: [], ...overrides });
  const complete = (f, request = randomUUID(), payload = data(), next = null, policy = 'fixed', occurrence = f.occurrence.id, revision = f.date.revision) => actor(f.owner, 'select public.complete_occurrence($1,$2,$3,$4,$5,$6) as id', [request, occurrence, revision, payload, next, policy]);
  const history = async (f, before = null, id = null) => (await actor(f.owner, 'select public.item_activity_history($1,$2,$3) as page', [f.item, before, id])).rows[0].page;

  await test('History prerequisites recognize the complete local schema', async () => {
    const checks = (await admin.query(await readFile('supabase/check-household-history-prerequisites.sql', 'utf8'))).rows;
    assert.equal(checks.length, 32); assert(checks.every(check => check.status.startsWith('PRESENT')));
  });
  await test('Migration preserves known earlier completion without inventing actor, cost or notes',async()=>{
    const f=activityMigrationSeed,a=(await history(f)).activities[0];
    assert.equal(a.scheduled_on,'2026-01-01');assert.equal(a.completed_on,'2026-01-02');
    assert.equal(a.source,'legacy_completion');assert.equal(a.actor_id,null);assert.equal(a.amount_minor,null);assert.equal(a.notes,null);
  });
  await test('Concurrent retries record exactly one completion and advance once', async () => {
    const f = await fixture(), request = randomUUID();
    const results = await Promise.all(Array.from({ length: 4 }, () => complete(f, request)));
    assert(results.every(result => result.rows[0].id === request));
    const page = await history(f); assert.equal(page.activities.length, 1);
    assert.equal(page.activities[0].scheduled_on.slice(0, 10), today);
    assert.equal(page.activities[0].amount_minor, 60000);
    const occurrences = (await admin.query('select * from public.date_occurrences where date_id=$1', [f.date.id])).rows;
    assert.equal(occurrences.length, 2); assert.equal(occurrences.filter(o => o.status === 'completed').length, 1);
    await assert.rejects(complete(f, request, data({ notes: 'Changed payload' })), /REQUEST_CONFLICT/);
    await assert.rejects(complete(f), /ALREADY_COMPLETED/);
  });
  await test('Late completion resolves the chosen unconfirmed cycle without changing future schedule', async () => {
    const f = await fixture({ due: '2026-01-31' });
    await actor(null, 'select public.advance_recurring_dates()', [], 'service_role');
    const current = await state(f.owner, f.item);
    const old = current.date.occurrences.find(o => o.id === f.occurrence.id);
    assert.equal(old.status, 'unconfirmed');
    await complete(f, randomUUID(), data(), null, 'fixed', old.id, current.date.revision);
    const after = await state(f.owner, f.item);
    assert.equal(after.occurrence.id, current.occurrence.id); assert.equal(after.occurrence.due_on, current.occurrence.due_on);
    assert.equal(after.date.occurrences.find(o => o.id === old.id).status, 'completed');
    assert.equal((await history(f)).activities[0].scheduled_on.slice(0, 10), '2026-01-31');
  });
  await test('Completion races with recurrence leave either a completed historical cycle or a safe conflict', async () => {
    const f = await fixture({ due: '2026-01-31' });
    const results = await Promise.allSettled([complete(f), actor(null, 'select public.advance_recurring_dates()', [], 'service_role')]);
    const occurrence = (await admin.query('select * from public.date_occurrences where id=$1', [f.occurrence.id])).rows[0];
    assert(['completed', 'unconfirmed'].includes(occurrence.status));
    if (results[0].status === 'rejected') { assert.match(results[0].reason.message, /CONFLICT/); assert.equal((await history(f)).activities.length, 0); }
    else assert.equal((await history(f)).activities.length, 1);
    assert.equal((await admin.query("select count(*)::int as n from public.date_occurrences where date_id=$1 and status='open'", [f.date.id])).rows[0].n, 1);
  });
  await test('Legacy completion callers keep working and capture only known facts', async () => {
    const f = await fixture({ repeat: null });
    await actor(f.owner, 'select public.complete_date($1,$2,$3,null)', [f.date.id, f.date.revision, today]);
    const activity = (await history(f)).activities[0];
    assert.equal(activity.source, 'legacy_completion'); assert.equal(activity.activity_type, 'completion');
    assert.equal(activity.amount_minor, null); assert.equal(activity.notes, null);
  });
  await test('Warranties cannot acquire an assumed next date and one-time completion stops', async () => {
    const f = await fixture({ kind: 'warranty', repeat: null, preset: null, template: 'receipt' });
    await assert.rejects(complete(f, randomUUID(), data(), '2032-01-01'), /INVALID_INPUT/);
    await complete(f, randomUUID(), data({ activity_type: 'warranty_closed' }));
    assert.equal((await state(f.owner, f.item)).occurrence, undefined);
    const once = await fixture({ repeat: null }); await complete(once);
    assert.equal((await state(once.owner, once.item)).occurrence, undefined);
  });
  await test('Completion-based service recurrence waits for real completion and preserves anchors', async () => {
    const f = await fixture({ kind: 'service', preset: null, template: 'aircon', due: '2026-01-31' });
    await complete(f, randomUUID(), data({ activity_type: 'service', completed_on: '2026-02-28' }), null, 'from_completion');
    const next = await state(f.owner, f.item); assert.equal(next.occurrence.due_on.slice(0, 10), '2026-03-28');
    assert.equal(next.date.recurrence_policy, 'from_completion');
    await actor(null, 'select public.advance_recurring_dates()', [], 'service_role');
    assert.equal((await state(f.owner, f.item)).occurrence.id, next.occurrence.id);
    await assert.rejects(complete(await fixture(), randomUUID(), data(), null, 'from_completion'), /INVALID_INPUT/);
  });
  await test('Service month-end and leap-year completion keep fixed schedule anchor', async () => {
    const f = await fixture({ kind: 'service', preset: null, due: '2024-01-31', template: 'aircon' });
    await complete(f, randomUUID(), data({ activity_type: 'service', completed_on: '2024-02-03' }));
    const next = await state(f.owner, f.item); assert.equal(next.occurrence.due_on.slice(0, 10), '2024-02-29');
    await complete({ ...f, ...next }, randomUUID(), data({ activity_type: 'service', completed_on: '2024-03-01' }));
    assert.equal((await state(f.owner, f.item)).occurrence.due_on.slice(0, 10), '2024-03-31');
  });
  await test('Explicit finish clears repeat metadata and creates no future occurrence', async () => {
    const f = await fixture(); await complete(f, randomUUID(), data(), null, 'stop');
    const after = await state(f.owner, f.item); assert.equal(after.date.recurrence_months, null); assert.equal(after.occurrence, undefined);
  });
  await test('Manual activity retries are idempotent and accept zero actual cost', async () => {
    const f = await fixture(), id = randomUUID(), input = data({ activity_type: 'repair', amount_minor: 0 });
    const save = () => actor(f.owner, 'select public.save_item_activity($1,$2,0,$3,null)', [id, f.item, input]);
    await Promise.all([save(), save()]); assert.equal((await history(f)).activities.length, 1);
    assert.equal((await history(f)).activities[0].amount_minor, 0);
    await assert.rejects(actor(f.owner, 'select public.save_item_activity($1,$2,0,$3,null)', [id, f.item, data()]), /REQUEST_CONFLICT/);
  });
  await test('Corrections preserve scheduled dates and audit old details without rescheduling', async () => {
    const f = await fixture(), id = (await complete(f)).rows[0].id;
    const before = await state(f.owner, f.item);
    await actor(f.owner, 'select public.save_item_activity($1,$2,1,$3,$4)', [id, f.item, data({ amount_minor: 12345, completed_on: '2026-01-02', notes: 'Corrected actual payment' }), 'Correct receipt amount']);
    const after = await state(f.owner, f.item), a = (await history(f)).activities[0];
    assert.equal(after.occurrence.id, before.occurrence.id); assert.equal(a.revision, 2); assert.equal(a.amount_minor, 12345);
    assert.equal(a.scheduled_on.slice(0, 10), today);
    const audit = (await admin.query('select * from private.activity_revisions where activity_id=$1', [id])).rows;
    assert.equal(audit.length, 1); assert.equal(audit[0].before_data.amount_minor, 60000);
    await assert.rejects(actor(f.owner, 'select public.save_item_activity($1,$2,1,$3,$4)', [id, f.item, data(), 'Stale edit']), /CONFLICT/);
  });
  await test('Removal retains audit and allows selected historical completion to be recorded again', async () => {
    const f = await fixture(), id = (await complete(f)).rows[0].id, before = await state(f.owner, f.item);
    await actor(f.owner, 'select public.void_item_activity($1,1,$2)', [id, 'Not actually paid']);
    await actor(f.owner, 'select public.void_item_activity($1,1,$2)', [id, 'Not actually paid']);
    const after = await state(f.owner, f.item);
    assert.equal(after.occurrence.id, before.occurrence.id); assert((await history(f)).activities[0].voided_at);
    assert.equal(after.date.occurrences.find(o => o.id === f.occurrence.id).status, 'unconfirmed');
    const newRequest = randomUUID(); await complete(f, newRequest, data({ notes: 'Paid later' }), null, 'fixed', f.occurrence.id, after.date.revision);
    const activity = (await history(f)).activities[0]; assert.equal(activity.id, id); assert.equal(activity.voided_at, null);
    assert.equal((await history(f)).activities.length, 1); assert.equal((await complete(f, newRequest, data({ notes: 'Paid later' }))).rows[0].id, id);
  });
  await test('Skipped missed cycles retain an explicit reason without implying payment', async () => {
    const f = await fixture({ due: '2026-01-31' }); await actor(null, 'select public.advance_recurring_dates()', [], 'service_role');
    const current = await state(f.owner, f.item), id = randomUUID();
    const skip = () => actor(f.owner, 'select public.skip_unconfirmed_occurrence($1,$2,$3,$4)', [id, f.occurrence.id, current.date.revision, 'Provider waived this month']);
    await Promise.all([skip(), skip()]);
    const after = await state(f.owner, f.item); assert.equal(after.occurrence.id, current.occurrence.id);
    assert.equal(after.date.occurrences.find(o => o.id === f.occurrence.id).status, 'skipped');
    assert.equal((await history(f)).activities.length, 0);
    assert.equal((await admin.query('select * from private.occurrence_reviews where id=$1', [id])).rows.length, 1);
    const reopen=randomUUID();
    const replay=()=>actor(f.owner,'select public.skip_unconfirmed_occurrence($1,$2,$3,$4,true)',[reopen,f.occurrence.id,after.date.revision,'Correct mistaken skip']);
    await Promise.all([replay(),replay()]);
    const reopened=await state(f.owner,f.item);
    assert.equal(reopened.occurrence.id,current.occurrence.id);
    assert.equal(reopened.date.occurrences.find(o=>o.id===f.occurrence.id).status,'unconfirmed');
  });
  await test('Correction request replay returns the original result and audit stays owner-scoped',async()=>{
    const f=await fixture(),id=(await complete(f)).rows[0].id,request=randomUUID();
    const correct=()=>actor(f.owner,'select public.save_item_activity($1,$2,1,$3,$4,$5)',[id,f.item,data({amount_minor:75000}),'Correct actual amount',request]);
    await Promise.all([correct(),correct()]);
    assert.equal((await history(f)).activities[0].revision,2);
    const audit=(await actor(f.owner,'select public.activity_corrections($1) as audit',[id])).rows[0].audit;
    assert.equal(audit.length,1);assert.equal(audit[0].before.amount_minor,60000);
    await assert.rejects(actor(await user(),'select public.activity_corrections($1)',[id]),/NOT_FOUND/);
    await assert.rejects(actor(f.owner,'select public.save_item_activity($1,$2,1,$3,$4,$5)',[id,f.item,data(),'Changed request',request]),/REQUEST_CONFLICT/);
  });
  await test('Unconfirmed review totals and pagination span all saved records and isolate accounts',async()=>{
    const f=await fixture({due:'2020-01-01'}),outsider=await user();
    await actor(null,'select public.advance_recurring_dates()',[],'service_role');
    const first=(await actor(f.owner,'select public.unconfirmed_occurrence_summary() as page')).rows[0].page;
    assert(first.total>20);assert.equal(first.rows.length,20);assert(first.has_more);
    const last=first.rows.at(-1),second=(await actor(f.owner,'select public.unconfirmed_occurrence_summary($1,$2) as page',[last.due_on,last.occurrence_id])).rows[0].page;
    assert.equal(second.total,first.total);assert(second.rows.every(row=>!first.rows.some(old=>old.occurrence_id===row.occurrence_id)));
    const foreign=(await actor(outsider,'select public.unconfirmed_occurrence_summary() as page')).rows[0].page;
    assert.equal(foreign.total,0);assert.deepEqual(foreign.rows,[]);
    await actor(f.owner,'select public.archive_item($1,2,true)',[f.item]);
    assert.equal((await actor(f.owner,'select public.unconfirmed_occurrence_summary() as page')).rows[0].page.total,0);
  });
  await test('History associations reject cross-item, cross-account and unfinished files atomically', async () => {
    const f = await fixture(), other = await fixture();
    const document = randomUUID();
    await admin.query("insert into public.documents(id,purchase_id,user_id,kind,state,staging_key,object_key,original_name,reserved_bytes) values($1,$2,$3,'receipt','pending',$4,$5,'Test receipt',1000)", [document, other.item, other.owner, randomUUID(), randomUUID()]);
    await assert.rejects(complete(f, randomUUID(), data({ document_ids: [document] })), /INVALID_DOCUMENT/);
    assert.equal((await history(f)).activities.length, 0); assert.equal((await state(f.owner, f.item)).occurrence.id, f.occurrence.id);
    await admin.query("update public.documents set purchase_id=$1,user_id=$2,state='ready',size_bytes=100,mime_type='image/png',checksum='test' where id=$3", [f.item, f.owner, document]);
    const result = await complete(f, randomUUID(), data({ document_ids: [document] }));
    assert.deepEqual((await history(f)).activities[0].document_ids, [document]);
    await admin.query('delete from public.documents where id=$1', [document]);
    assert.deepEqual((await history(f)).activities[0].document_ids, []); assert(result.rows[0].id);
  });
  await test('Activity authorization, revisions and input validation cannot be bypassed', async () => {
    const f = await fixture(), outsider = await user(), id = randomUUID();
    await assert.rejects(actor(outsider, 'select public.item_activity_history($1)', [f.item]), /NOT_FOUND/);
    await assert.rejects(actor(outsider, 'select public.complete_occurrence($1,$2,$3,$4)', [id, f.occurrence.id, f.date.revision, data()]), /NOT_FOUND/);
    await assert.rejects(actor(null, 'select public.item_activity_history($1)', [f.item], 'anon'), /permission denied/);
    for (const input of [data({ completed_on: '2200-01-01' }), data({ amount_minor: 0.5 }), data({ title: ' ' }), data({ currency: 'USD' }), data({ completed_on: null })]) await assert.rejects(complete(f, randomUUID(), input), /INVALID_INPUT/);
    await assert.rejects(complete(f, randomUUID(), data(), null, 'fixed', f.occurrence.id, null), /INVALID_INPUT/);
    await assert.rejects(actor(f.owner, "insert into public.item_activities(user_id,item_id,activity_type,title,completed_on) values($1,$2,'payment','Bad',current_date)", [f.owner, f.item]), /permission denied/);
    await complete(f, id); assert.equal((await actor(outsider, 'select * from public.item_activities')).rows.length, 0);
    await assert.rejects(actor(outsider, 'select public.void_item_activity($1,1,$2)', [id, 'Tampered']), /NOT_FOUND/);
    await assert.rejects(actor(f.owner, 'select public.void_item_activity($1,null,$2)', [id, 'Missing revision']), /INVALID_INPUT/);
    await assert.rejects(actor(f.owner, 'select * from private.activity_revisions'), /permission denied/);
  });
  await test('Archived records reject new activity and completion while history remains readable', async () => {
    const f = await fixture(); await actor(f.owner, 'select public.archive_item($1,2,true)', [f.item]);
    await assert.rejects(complete(f), /ITEM_ARCHIVED/);
    await assert.rejects(actor(f.owner, 'select public.save_item_activity($1,$2,0,$3)', [randomUUID(), f.item, data()]), /ITEM_ARCHIVED/);
    assert.equal((await history(f)).activities.length, 0);
  });
  await test('Indexed history cursor handles equal timestamps without duplicates', async () => {
    const f = await fixture();
    await admin.query("insert into public.item_activities(user_id,item_id,activity_type,title,completed_on,created_at) select $1,$2,'note','Activity '||n,current_date,'2026-01-01'::timestamptz from generate_series(1,25) n", [f.owner, f.item]);
    const first = await history(f); assert.equal(first.activities.length, 20); assert(first.has_more);
    const last = first.activities.at(-1), second = await history(f, last.created_at, last.id);
    assert.equal(second.activities.length, 5); assert(!second.has_more);
    assert.equal(new Set([...first.activities, ...second.activities].map(a => a.id)).size, 25);
  });
}
