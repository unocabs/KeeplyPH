begin;
-- Snooze metadata belongs to one occurrence; original offsets and due dates are untouched.
alter table public.date_occurrences add column snoozed_on date,
 add column snooze_generation integer not null default 0,
 add column snooze_revision integer;

create function private.snooze_matches(p_occurrence uuid,p_generation integer,p_at timestamptz)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.date_occurrences o join public.important_dates d on d.id=o.date_id
 join public.profiles p on p.id=d.user_id where o.id=p_occurrence and o.status='open'
 and o.snoozed_on is not null and o.snooze_generation=p_generation and o.snooze_revision=d.revision
 and p_at=(o.snoozed_on+time '09:00') at time zone p.timezone);
$$;
create function private.alert_timing_eligible(p_occurrence uuid,p_unit text,p_value integer,p_at timestamptz)
returns boolean language sql stable security definer set search_path='' as $$
 select case when p_unit='snooze' then private.snooze_matches(p_occurrence,p_value,p_at)
 else exists(select 1 from public.date_occurrences o join public.important_dates d on d.id=o.date_id
 join public.profiles p on p.id=d.user_id join public.reminder_offsets r on r.date_id=d.id
 where o.id=p_occurrence and o.status='open' and r.unit=p_unit and r.value=p_value
 and o.due_on>=(now() at time zone p.timezone)::date
 and (o.snoozed_on is null or o.snooze_revision<>d.revision or p_at>(o.snoozed_on+time '09:00') at time zone p.timezone)) end;
$$;
create function private.email_job_eligible(j private.notification_jobs) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.current_dates d join public.profiles p on p.id=d.user_id
 join auth.users a on a.id=p.id where d.id=j.date_id and d.occurrence_id=j.occurrence_id
 and d.expires_on=j.expiration_date and d.reminders_enabled and private.covered(d.item_id)
 and d.state='saved' and d.archived_at is null and p.deletion_requested_at is null
 and p.email_reminders_enabled and not p.email_delivery_blocked and a.email_confirmed_at is not null
 and private.alert_timing_eligible(j.occurrence_id,j.offset_unit,j.offset_value,j.scheduled_at));
$$;


create or replace function private.schedule_email_date(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare d private.current_dates; p public.profiles; r record; target date; at_time timestamptz;
begin
 select * into d from private.current_dates where id=p_id;
 update private.notification_jobs set status='cancelled',updated_at=now() where date_id=p_id and status in ('pending','retry') and (d.id is null or occurrence_id<>d.occurrence_id);
 if d.id is null then return; end if;
 select * into p from public.profiles where id=d.user_id;
 update private.notification_jobs j set status='cancelled',updated_at=now() where j.date_id=p_id and j.status in ('pending','retry') and
 (not private.covered(d.item_id) or not d.reminders_enabled or not p.email_reminders_enabled or p.email_delivery_blocked or p.deletion_requested_at is not null or d.archived_at is not null or d.state<>'saved'
 or (j.offset_unit<>'snooze' and not exists(select 1 from public.reminder_offsets ro where ro.date_id=p_id and ro.unit=j.offset_unit and ro.value=j.offset_value)));
 if not private.covered(d.item_id) or not d.reminders_enabled or not p.email_reminders_enabled or p.email_delivery_blocked or p.deletion_requested_at is not null or d.archived_at is not null or d.state<>'saved' then return; end if;
 for r in select * from public.reminder_offsets where date_id=p_id loop
   target := case when r.unit='months' then (d.expires_on-make_interval(months=>r.value))::date else d.expires_on-r.value end;
   at_time := (target+time '09:00') at time zone p.timezone;
   if at_time>=now() and at_time>=coalesce((select coverage_since from public.items where id=d.item_id),now()) and target>=greatest((now() at time zone p.timezone)::date,(coalesce(d.reminders_enabled_at,now()) at time zone p.timezone)::date) then
     insert into private.notification_jobs(date_id,occurrence_id,expiration_date,offset_value,offset_unit,scheduled_at,next_attempt_at)
     values(d.id,d.occurrence_id,d.expires_on,r.value,r.unit,at_time,at_time)
     on conflict(occurrence_id,offset_unit,offset_value) do update set scheduled_at=excluded.scheduled_at,next_attempt_at=excluded.next_attempt_at,status='pending',updated_at=now()
       where private.notification_jobs.status in ('pending','cancelled') and private.notification_jobs.first_attempt_at is null;
   end if;
 end loop;
end $$;

create or replace function private.push_job_eligible(j private.push_jobs) returns boolean language sql stable security definer set search_path='' as $$
 select private.push_eligible(j.date_id,j.subscription_id) and exists(select 1 from private.current_dates d
 join public.profiles p on p.id=d.user_id
 where d.occurrence_id=j.occurrence_id and d.id=j.date_id and d.expires_on=j.expiration_date
 and private.alert_timing_eligible(j.occurrence_id,j.offset_unit,j.offset_value,j.scheduled_at));
$$;
alter function private.schedule_date(uuid) rename to schedule_regular_date;

create function private.schedule_date(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare d private.current_dates; p public.profiles; o public.date_occurrences; at_time timestamptz; s record;
begin
 select * into d from private.current_dates where id=p_id;
 select * into p from public.profiles where id=d.user_id;
 -- Permanently invalidate lost coverage; reactivation cannot resurrect an old follow-up.
 update public.date_occurrences set snoozed_on=null where date_id=p_id and snoozed_on is not null
 and (status<>'open' or snooze_revision is distinct from d.revision or d.id is null
 or not d.reminders_enabled or not private.covered(d.item_id) or d.archived_at is not null
 or p.deletion_requested_at is not null or not (p.push_reminders_enabled or (p.email_reminders_enabled and not p.email_delivery_blocked)));
 perform private.schedule_regular_date(p_id);
 select * into o from public.date_occurrences where id=d.occurrence_id;
 if o.snoozed_on is not null then
 at_time:=(o.snoozed_on+time '09:00') at time zone p.timezone;
 if at_time>=now() then
 if p.email_reminders_enabled and not p.email_delivery_blocked then
 insert into private.notification_jobs(date_id,occurrence_id,expiration_date,offset_unit,offset_value,scheduled_at,next_attempt_at)
 values(d.id,o.id,o.due_on,'snooze',o.snooze_generation,at_time,at_time)
 on conflict(occurrence_id,offset_unit,offset_value) do update set scheduled_at=excluded.scheduled_at,next_attempt_at=excluded.next_attempt_at,status='pending'
 where private.notification_jobs.status in ('pending','cancelled') and private.notification_jobs.first_attempt_at is null;
 end if;
 for s in select * from private.push_subscriptions where user_id=d.user_id and private.push_eligible(d.id,id) loop
 insert into private.push_jobs(subscription_id,date_id,occurrence_id,expiration_date,offset_unit,offset_value,scheduled_at,next_attempt_at)
 values(s.id,d.id,o.id,o.due_on,'snooze',o.snooze_generation,at_time,at_time)
 on conflict(subscription_id,occurrence_id,offset_unit,offset_value) do update set scheduled_at=excluded.scheduled_at,next_attempt_at=excluded.next_attempt_at,status='pending'
 where private.push_jobs.status in ('pending','cancelled') and private.push_jobs.attempts=0;
 end loop;
 end if; end if;
 update private.notification_jobs j set status='cancelled' where date_id=p_id and status in ('pending','retry') and not private.email_job_eligible(j);
 update private.push_jobs j set status='cancelled' where date_id=p_id and status in ('pending','retry') and not private.push_job_eligible(j);
end $$;

create or replace function public.claim_notification_jobs(p_limit integer default 10,p_daily_limit integer default 90) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid; remaining integer; result jsonb;
begin
  -- Serialize daily allowance reservations; row leases still protect individual work.
  perform pg_advisory_xact_lock(719420001);
  for u in select distinct w.user_id from private.current_dates w join private.notification_jobs j on j.date_id=w.id
    where j.next_attempt_at<=now() and j.status in ('pending','retry','sending') loop perform private.trim_reminders(u); end loop;
  update private.notification_jobs set status='unknown',last_error_code='acceptance_unresolved',updated_at=now()
    where status in ('sending','retry') and first_attempt_at<now()-interval '23 hours';
  update private.notification_jobs set status='retry',next_attempt_at=now() where status='sending' and lease_until<now();
  update private.notification_jobs set status='cancelled',updated_at=now() where status in ('pending','retry') and date_id is not null and not exists(select 1 from private.current_dates d where d.occurrence_id=notification_jobs.occurrence_id);
  update private.notification_jobs j set status='cancelled',updated_at=now() where j.date_id is not null and j.status in ('pending','retry') and not private.email_job_eligible(j);
  update private.notification_jobs j set status='skipped',updated_at=now()
    where j.status='pending' and j.offset_unit<>'snooze' and j.scheduled_at<=now() and exists(
      select 1 from private.notification_jobs newer where newer.date_id=j.date_id and newer.occurrence_id=j.occurrence_id
      and newer.scheduled_at>j.scheduled_at and newer.scheduled_at<=now() and newer.status in ('pending','retry','sending','accepted','delivered')
    );
  insert into private.email_daily_quota(day) values((now() at time zone 'UTC')::date) on conflict do nothing;
  select greatest(0,least(p_daily_limit,90)-reserved) into remaining from private.email_daily_quota where day=(now() at time zone 'UTC')::date;
  with candidates as (
    select id from private.notification_jobs where date_id is not null and status in ('pending','retry') and next_attempt_at<=now()
    order by next_attempt_at,id for update skip locked limit least(greatest(p_limit,0),remaining,20)
  ), claimed as (
    update private.notification_jobs j set status='sending',lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes',
      first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1,updated_at=now()
    from candidates c where j.id=c.id returning j.*
  ) select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'lease_token',c.lease_token,'expiration_date',c.expiration_date,
      'offset_value',c.offset_value,'attempts',c.attempts,'payload',c.frozen_payload,'product_name',r.product_name,
      'purchase_id',r.id,'date_id',w.id,'date_kind',w.kind,'recurrence_months',x.recurrence_months,'recurrence_anchor',x.recurrence_anchor,'recurrence_ends_on',x.recurrence_ends_on,'payment_amount_minor',x.payment_amount_minor,'kind',w.label,'email',a.email)), '[]'::jsonb) into result
    from claimed c join private.current_dates w on w.id=c.date_id join public.important_dates x on x.id=w.id join public.items r on r.id=w.purchase_id join auth.users a on a.id=w.user_id;
  update private.email_daily_quota set reserved=reserved+jsonb_array_length(result) where day=(now() at time zone 'UTC')::date;
  return result;
end $$;

create or replace function public.prepare_notification(p_id uuid,p_lease uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare j private.notification_jobs; w private.current_dates; p public.profiles; email text;
begin
  -- Same lock order as account writes: profile, then notification.
  select w0.user_id into p.id from public.important_dates w0 join private.notification_jobs j0 on j0.date_id=w0.id where j0.id=p_id;
  if p.id is null then return null; end if;
  perform private.trim_reminders(p.id);
  select * into j from private.notification_jobs where id=p_id and lease_token=p_lease and status='sending' and lease_until>now() for update;
  if not found then return null; end if;
  select * into w from private.current_dates where id=j.date_id;
  select * into p from public.profiles where id=w.user_id;
  select a.email into email from auth.users a where a.id=w.user_id and a.email_confirmed_at is not null;
  if not private.email_job_eligible(j) or email is null
    or (j.frozen_payload is not null and j.frozen_payload->>'to'<>email)
  then update private.notification_jobs set status='cancelled',updated_at=now() where id=p_id; return null; end if;
  if p_payload->>'to'<>email then raise exception 'INVALID_INPUT'; end if;
  update private.notification_jobs set frozen_payload=coalesce(frozen_payload,p_payload) where id=p_id returning frozen_payload into p_payload;
  return p_payload;
end $$;

create function public.snooze_date(p_id uuid,p_occurrence uuid,p_revision integer,p_choice text,p_on date default null)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); d public.important_dates; o public.date_occurrences; p public.profiles; target date;
begin
 perform private.rate_limit(u,'snooze',30);
 select * into p from public.profiles where id=u for update;
 perform private.trim_reminders(u);
 select * into d from public.important_dates where id=p_id and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if d.revision<>p_revision then raise exception 'CONFLICT'; end if;
 select * into o from public.date_occurrences where id=p_occurrence and date_id=p_id and status='open' for update;
 if not found then raise exception 'CONFLICT'; end if;
 if p_choice not in ('tomorrow','three_days','custom','cancel') or p_choice is null then raise exception 'INVALID_INPUT'; end if;
 if p_choice<>'cancel' then
 if not d.reminders_enabled or not private.covered(d.item_id) or not (p.push_reminders_enabled or (p.email_reminders_enabled and not p.email_delivery_blocked)) then raise exception 'ALERTS_UNAVAILABLE'; end if;
 target:=case p_choice when 'tomorrow' then (now() at time zone p.timezone)::date+1 when 'three_days' then (now() at time zone p.timezone)::date+3 else p_on end;
 if target is null or target>date '2200-12-31' or (target+time '09:00') at time zone p.timezone<=now() then raise exception 'INVALID_INPUT'; end if;
 end if;
 -- A fresh generation gives a new follow-up its own idempotency identity.
 update public.important_dates set revision=revision+1,updated_at=now() where id=d.id;
 update public.date_occurrences set snoozed_on=target,snooze_generation=snooze_generation+1,snooze_revision=d.revision+1 where id=o.id;
 perform private.schedule_date(d.id);
end $$;

create function private.invalidate_date_snooze() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.revision<>old.revision or not new.reminders_enabled then
 update public.date_occurrences set snoozed_on=null where date_id=new.id and snoozed_on is not null;
 end if; return new;
end $$;
create trigger invalidate_date_snooze after update on public.important_dates for each row execute function private.invalidate_date_snooze();
create function private.invalidate_owner_snooze() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='items' then
 if new.archived_at is not null or new.coverage_requested_at is null or not new.coverage_active then
 update public.date_occurrences set snoozed_on=null where date_id in(select id from public.important_dates where item_id=new.id);
 end if;
 else
 if (old.email_reminders_enabled and not new.email_reminders_enabled) or (old.push_reminders_enabled and not new.push_reminders_enabled)
 or (new.email_delivery_blocked and not old.email_delivery_blocked) or new.deletion_requested_at is not null then
 update public.date_occurrences set snoozed_on=null where user_id=new.id;
 end if;
 end if; return new;
end $$;
create trigger invalidate_item_snooze after update on public.items for each row execute function private.invalidate_owner_snooze();
create trigger invalidate_profile_snooze before update on public.profiles for each row execute function private.invalidate_owner_snooze();


create or replace function public.reminder_preview(p_item_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); result jsonb;
begin
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into result from (
 select d.id as date_id,(min(j.scheduled_at) at time zone p.timezone)::date as next_scheduled_on from private.current_dates d
 join public.profiles p on p.id=d.user_id join (
 select occurrence_id,scheduled_at from private.notification_jobs nj where private.email_job_eligible(nj) and status in ('pending','retry','sending')
 and exists(select 1 from public.profiles where id=u and email_reminders_enabled and not email_delivery_blocked)
 union all select occurrence_id,scheduled_at from private.sms_jobs where status in ('pending','sending')
 and exists(select 1 from public.profiles where id=u and sms_reminders_enabled and phone_verified_at is not null)
 union all select occurrence_id,scheduled_at from private.push_jobs pj where status in ('pending','retry','sending') and private.push_job_eligible(pj)
 ) j on j.occurrence_id=d.occurrence_id
 where d.user_id=u and d.item_id=p_item_id and d.archived_at is null and d.reminders_enabled and private.covered(d.item_id)
 group by d.id,p.timezone) r;
 return result;
end $$;

revoke all on function private.snooze_matches(uuid,integer,timestamptz),private.alert_timing_eligible(uuid,text,integer,timestamptz),private.email_job_eligible(private.notification_jobs),private.schedule_date(uuid),private.schedule_regular_date(uuid),private.invalidate_date_snooze(),private.invalidate_owner_snooze() from public,anon,authenticated,service_role;
revoke all on function public.snooze_date(uuid,uuid,integer,text,date) from public,anon,authenticated,service_role;
grant execute on function public.snooze_date(uuid,uuid,integer,text,date) to authenticated;
commit;
