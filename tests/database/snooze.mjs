import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
export async function testSnooze({ admin, actor, user, newItem, registerPush, test }) {
  await test('Read-only snooze prerequisite check verifies current migration markers', async () => {
    const checks=(await admin.query(await readFile('supabase/check-snooze-prerequisites.sql','utf8'))).rows;
    assert.equal(checks.length,3);for(const check of checks)assert.equal(check.status,'PRESENT',check.migration);
  });
  const localToday = async zone => (await admin.query("select (now() at time zone $1)::date::text today", [zone])).rows[0].today;
  const add = (date, days) => { const value = new Date(date + 'T00:00:00Z'); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); };
  async function fixture({ overdue = false, recurring = false } = {}) {
    const u = await user(), today = await localToday('Asia/Manila');
    await actor(u, "select public.update_preferences('Snooze test','Asia/Manila',true)");
    const due = add(today, overdue ? -2 : 7);
    const input = { kind: 'other', label: 'Payment', due_on: due, reminders_enabled: true, interval_months: null, offsets: [{ unit: 'days', value: 7 }, { unit: 'days', value: 3 }, { unit: 'days', value: 0 }], ...(recurring ? { recurrence_months: 1, recurrence_ends_on: add(today, 100) } : {}) };
    const id = await newItem(u, 'other', input); await registerPush(u);
    const d = (await admin.query('select * from public.important_dates where item_id=$1', [id])).rows[0];
    const o = (await admin.query("select *,due_on::text due from public.date_occurrences where date_id=$1 and status='open'", [d.id])).rows[0];
    return { u, id, d, o, today, input };
  }
  const snooze = (f, choice = 'tomorrow', on = null, revision = f.d.revision, occurrence = f.o.id, u = f.u) => actor(u, 'select public.snooze_date($1,$2,$3,$4,$5)', [f.d.id, occurrence, revision, choice, on]);
  const jobs = async (f, table) => (await admin.query(`select *,scheduled_at::text at from private.${table} where date_id=$1 order by scheduled_at`, [f.d.id])).rows;
  const current = async f => (await admin.query('select *,due_on::text due,snoozed_on::text snooze from public.date_occurrences where id=$1', [f.o.id])).rows[0];
  const pushClaim = async f => (await actor(null, 'select public.claim_push_jobs(5) j', [], 'service_role')).rows[0].j.find(j => j.id === f.id);
  async function makeDue(f) {
    const yesterday = add(f.today, -1);
    await admin.query('update public.date_occurrences set snoozed_on=$2 where id=$1', [f.o.id, yesterday]);
    for (const table of ['notification_jobs', 'push_jobs']) await admin.query(`update private.${table} set scheduled_at=($2::date+time '09:00') at time zone 'Asia/Manila',next_attempt_at=now()-interval '1 minute' where date_id=$1 and offset_unit='snooze' and status='pending'`, [f.d.id, yesterday]);
  }
  await test('Snooze rejects cross-user, anonymous, stale revisions/occurrences and past delivery times', async () => {
    const f = await fixture(), other = await user();
    await assert.rejects(snooze(f, 'tomorrow', null, f.d.revision, f.o.id, other), /NOT_FOUND/);
    await assert.rejects(snooze(f, 'tomorrow', null, 0), /CONFLICT/);
    await assert.rejects(snooze(f, 'custom', add(f.today, -1)), /INVALID_INPUT/);
    await assert.rejects(actor(null, 'select public.snooze_date($1,$2,$3,$4,null)', [f.d.id, f.o.id, f.d.revision, 'tomorrow'], 'anon'), /permission denied/);
    await snooze(f); await assert.rejects(snooze(f), /CONFLICT/);
  });
  await test('Tomorrow/three days/custom use account-local 9 AM without changing due dates, recurrence, coverage or offsets', async () => {
    const f = await fixture({ recurring: true }), before = f.d;
    await snooze(f, 'three_days');
    assert.equal((await current(f)).snooze, add(f.today, 3));
    const d = (await admin.query('select * from public.important_dates where id=$1', [f.d.id])).rows[0];
    for (const key of ['recurrence_anchor', 'recurrence_ends_on', 'recurrence_months', 'reminders_enabled']) assert.deepEqual(d[key], before[key]);
    assert.equal((await current(f)).due, f.o.due);
    assert.equal((await current(f)).status, 'open');
    assert.equal((await admin.query('select count(*)::int n from public.reminder_offsets where date_id=$1', [f.d.id])).rows[0].n, 3);
    const j = (await jobs(f, 'notification_jobs')).find(j => j.offset_unit === 'snooze');
    assert.equal(j.scheduled_at.toISOString(), add(f.today, 3) + 'T01:00:00.000Z');
    const coverage = (await actor(f.u, 'select public.account_usage() s')).rows[0].s;
    assert.equal(coverage.reminders, 1);
  });
  await test('Snooze suppresses regular email/push through the exact follow-up time while preserving later offsets', async () => {
    const f = await fixture(); await snooze(f, 'custom', add(f.today, 4));
    for (const table of ['notification_jobs', 'push_jobs']) {
      const rows = await jobs(f, table);
      assert.equal(rows.filter(j => j.offset_unit === 'snooze' && j.status === 'pending').length, 1);
      assert.equal(rows.find(j => j.offset_unit === 'days' && j.offset_value === 3).status, 'cancelled');
      assert.equal(rows.find(j => j.offset_unit === 'days' && j.offset_value === 0).status, 'pending');
    }
    const preview = (await actor(f.u, 'select public.reminder_preview($1) s', [f.id])).rows[0].s;
    assert.equal(preview[0].next_scheduled_on, add(f.today, 4));
  });
  await test('Snooze creates one follow-up per enabled device and device removal preserves the other delivery', async () => {
    const f = await fixture(); await snooze(f);
    const endpoint = await registerPush(f.u);
    await admin.query('select private.schedule_date($1)', [f.d.id]);
    await admin.query('select private.schedule_date($1)', [f.d.id]);
    assert.equal((await current(f)).snooze, add(f.today, 1));
    assert.equal((await jobs(f, 'notification_jobs')).filter(j => j.offset_unit === 'snooze' && j.status === 'pending').length, 1);
    assert.equal((await jobs(f, 'push_jobs')).filter(j => j.offset_unit === 'snooze' && j.status === 'pending').length, 2);
    await actor(f.u, 'select public.remove_push_subscription($1)', [endpoint]);
    assert.equal((await jobs(f, 'push_jobs')).filter(j => j.offset_unit === 'snooze' && j.status === 'pending').length, 1);
  });
  await test('Repeated snooze replaces pending follow-ups and cancellation restores only future regular alerts', async () => {
    const f = await fixture(); await snooze(f, 'custom', add(f.today, 5));
    await snooze(f, 'tomorrow', null, f.d.revision + 1);
    assert.equal((await current(f)).snooze, add(f.today, 1));
    for (const table of ['notification_jobs', 'push_jobs']) assert.equal((await jobs(f, table)).filter(j => j.offset_unit === 'snooze' && j.status === 'pending').length, 1);
    await snooze(f, 'cancel', null, f.d.revision + 2);
    assert.equal((await current(f)).snooze, null);
    for (const table of ['notification_jobs', 'push_jobs']) {
      const rows = await jobs(f, table);
      assert.equal(rows.filter(j => j.offset_unit === 'snooze' && j.status === 'pending').length, 0);
      assert.equal(rows.find(j => j.offset_unit === 'days' && j.offset_value === 3).status, 'pending');
      assert.equal(rows.some(j => j.status === 'pending' && j.scheduled_at < new Date()), false);
    }
  });
  await test('Overdue one-off snooze reaches both existing workers and keeps its actual due date', async () => {
    const f = await fixture({ overdue: true }); await snooze(f); await makeDue(f);
    const e = (await jobs(f, 'notification_jobs')).find(j => j.offset_unit === 'snooze');
    const p = (await jobs(f, 'push_jobs')).find(j => j.offset_unit === 'snooze');
    const claim = (await actor(null, 'select public.claim_notification_jobs(20,90) j', [], 'service_role')).rows[0].j.find(j => j.id === e.id);
    assert.ok(claim);
    const payload = { to: claim.email, subject: 'Snooze', text: 'Follow-up', html: '<p>Follow-up</p>', from: 'test@example.test' };
    assert.ok((await actor(null, 'select public.prepare_notification($1,$2,$3) s', [e.id, claim.lease_token, payload], 'service_role')).rows[0].s);
    const lease = await pushClaim(p); assert.ok(lease);
    const prepared = (await actor(null, 'select public.prepare_push_job($1,$2) s', [p.id, lease.lease_token], 'service_role')).rows[0].s;
    assert.equal(prepared.dueOn, f.o.due);
    await actor(null, "select public.finish_push_job($1,$2,'accepted',null)", [p.id, lease.lease_token], 'service_role');
    await actor(null, "select public.finish_notification($1,$2,'accepted',$3,null)", [e.id, claim.lease_token, 'snooze-' + e.id], 'service_role');
    await admin.query('select private.schedule_date($1)', [f.d.id]);
    assert.equal((await jobs(f, 'notification_jobs')).find(j => j.id === e.id).status, 'accepted');
    assert.equal((await jobs(f, 'push_jobs')).find(j => j.id === p.id).status, 'accepted');
  });
  await test('Completion, date edits, archive, coverage, opt-out and deletion invalidate claimed snooze deliveries', async () => {
    for (const change of ['complete', 'edit', 'archive', 'coverage', 'date_optout', 'email_optout', 'push_optout', 'delete']) {
      const f = await fixture(); await snooze(f); await makeDue(f);
      const p = (await jobs(f, 'push_jobs')).find(j => j.offset_unit === 'snooze');
      const e = (await jobs(f, 'notification_jobs')).find(j => j.offset_unit === 'snooze');
      const lease = await pushClaim(p); assert.ok(lease, change);
      // Prepare an email lease without consuming the global test quota.
      await admin.query("update private.notification_jobs set status='sending',lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes' where id=$1", [e.id]);
      const ej = (await jobs(f, 'notification_jobs')).find(j => j.id === e.id);
      if (change === 'complete') await actor(f.u, 'select public.complete_date($1,$2,current_date,null)', [f.d.id, f.d.revision + 1]);
      if (change === 'edit') await actor(f.u, 'select public.save_important_date($1,$2,$3,$4)', [f.d.id, f.id, f.d.revision + 1, { ...f.input, due_on: add(f.today, 8) }]);
      if (change === 'archive') await admin.query('update public.items set archived_at=now() where id=$1', [f.id]);
      if (change === 'coverage') await admin.query('update public.items set coverage_active=false,coverage_requested_at=null where id=$1', [f.id]);
      if (change === 'date_optout') await admin.query('update public.important_dates set reminders_enabled=false where id=$1', [f.d.id]);
      if (change === 'email_optout') await admin.query('update public.profiles set email_reminders_enabled=false where id=$1', [f.u]);
      if (change === 'push_optout') await admin.query('update public.profiles set push_reminders_enabled=false where id=$1', [f.u]);
      if (change === 'delete') await admin.query('update public.profiles set deletion_requested_at=now() where id=$1', [f.u]);
      assert.equal((await actor(null, 'select public.prepare_push_job($1,$2) s', [p.id, lease.lease_token], 'service_role')).rows[0].s, null, change);
      assert.equal((await actor(null, 'select public.prepare_notification($1,$2,$3) s', [e.id, ej.lease_token, { to: f.u + '@example.test' }], 'service_role')).rows[0].s, null, change);
    }
  });
  await test('Timezone changes keep the chosen local snooze date and move both queues to local 9 AM', async () => {
    const f = await fixture(); await snooze(f);
    await actor(f.u, "select public.update_preferences('Snooze test','America/New_York',true)");
    const target = add(f.today, 1);
    for (const table of ['notification_jobs', 'push_jobs']) {
      const j = (await jobs(f, table)).find(j => j.offset_unit === 'snooze' && j.status === 'pending');
      assert.ok(j);
      const hour = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }).format(j.scheduled_at);
      assert.equal(hour, '09');
    }
    assert.equal((await current(f)).snooze, target);
  });
  await test('Recurrence advancement never transfers a snooze to the next occurrence or revives stale actions', async () => {
    const f = await fixture({ recurring: true }); await snooze(f);
    await admin.query('update public.date_occurrences set due_on=$2 where id=$1', [f.o.id, add(f.today, -1)]);
    await actor(null, 'select public.advance_recurring_dates()', [], 'service_role');
    assert.equal((await current(f)).status, 'unconfirmed');
    const next = (await admin.query("select * from public.date_occurrences where date_id=$1 and status='open'", [f.d.id])).rows[0];
    assert.equal(next.snoozed_on, null);
    await assert.rejects(snooze(f, 'tomorrow', null, f.d.revision + 2), /CONFLICT/);
  });
  await test('Snooze retains push retry limits and never replays an ambiguously prepared delivery', async () => {
    const f = await fixture(); await snooze(f); await makeDue(f);
    const p = (await jobs(f, 'push_jobs')).find(j => j.offset_unit === 'snooze');
    const lease = await pushClaim(p);
    assert.ok((await actor(null, 'select public.prepare_push_job($1,$2) s', [p.id, lease.lease_token], 'service_role')).rows[0].s);
    await admin.query("update private.push_jobs set lease_until=now()-interval '1 minute' where id=$1", [p.id]);
    assert.equal(await pushClaim(p), undefined);
    assert.equal((await jobs(f, 'push_jobs')).find(j => j.id === p.id).status, 'unknown');
  });
}
