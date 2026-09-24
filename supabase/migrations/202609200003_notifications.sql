create table private.notification_jobs (
  id uuid primary key default gen_random_uuid(), warranty_id uuid not null references public.warranties(id) on delete cascade,
  expiration_date date not null, offset_days smallint not null check(offset_days in (30,7,1)),
  scheduled_at timestamptz not null, next_attempt_at timestamptz not null,
  status text not null default 'pending' check(status in ('pending','sending','retry','accepted','delivered','failed','unknown','cancelled','skipped')),
  attempts integer not null default 0, lease_token uuid, lease_until timestamptz, first_attempt_at timestamptz,
  provider_email_id text unique, accepted_at timestamptz, delivered_at timestamptz, last_error_code text, frozen_payload jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(warranty_id,expiration_date,offset_days)
);
create index notifications_due_idx on private.notification_jobs(next_attempt_at,id) where status in ('pending','retry');
create index notifications_lease_idx on private.notification_jobs(lease_until) where status='sending';
create table private.email_daily_quota(day date primary key, reserved integer not null default 0);
create table private.email_events(provider_id text not null,event_type text not null,created_at timestamptz not null default now(),primary key(provider_id,event_type));
create function private.schedule_warranty() returns trigger language plpgsql security definer set search_path = '' as $$
declare p public.profiles; days integer; at_time timestamptz; earliest date;
begin
  select * into p from public.profiles where id=new.user_id;
  update private.notification_jobs set status='cancelled',updated_at=now()
    where warranty_id=new.id and status in ('pending','retry')
    and (expiration_date<>new.expires_on or not new.reminders_enabled or not p.email_reminders_enabled);
  if not new.reminders_enabled or not p.email_reminders_enabled or p.deletion_requested_at is not null then return new; end if;
  earliest := greatest((now() at time zone p.timezone)::date,(coalesce(new.reminders_enabled_at,now()) at time zone p.timezone)::date);
  foreach days in array array[30,7,1] loop
    if new.expires_on-days>=earliest then
      at_time := (new.expires_on-days+time '09:00') at time zone p.timezone;
      insert into private.notification_jobs(warranty_id,expiration_date,offset_days,scheduled_at,next_attempt_at)
        values(new.id,new.expires_on,days,at_time,at_time)
        on conflict(warranty_id,expiration_date,offset_days) do update
        set scheduled_at=excluded.scheduled_at,next_attempt_at=excluded.next_attempt_at,status='pending',updated_at=now()
        where private.notification_jobs.status in ('pending','cancelled') and private.notification_jobs.first_attempt_at is null;
    end if;
  end loop;
  return new;
end $$;
create trigger warranty_schedule after insert or update on public.warranties for each row execute function private.schedule_warranty();
create function private.reschedule_preferences() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.timezone is distinct from old.timezone or new.email_reminders_enabled is distinct from old.email_reminders_enabled then
    update public.warranties set updated_at=now() where user_id=new.id;
  end if;
  return new;
end $$;
create trigger preferences_schedule after update on public.profiles for each row execute function private.reschedule_preferences();
create function private.trim_reminders(u uuid) returns void language plpgsql security definer set search_path = '' as $$
declare t date;
begin
  perform 1 from public.profiles where id=u for update;
  if private.is_premium(u) then return; end if;
  select (now() at time zone timezone)::date into t from public.profiles where id=u;
  update public.warranties set reminders_enabled=false,reminder_disabled_reason='plan_limit',updated_at=now()
    where id in (select id from public.warranties where user_id=u and reminders_enabled and expires_on>=t order by expires_on,id offset 3);
end $$;

create function public.claim_notification_jobs(p_limit integer default 10,p_daily_limit integer default 90) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid; remaining integer; result jsonb;
begin
  -- Serialize daily allowance reservations; row leases still protect individual work.
  perform pg_advisory_xact_lock(719420001);
  for u in select distinct w.user_id from public.warranties w join private.notification_jobs j on j.warranty_id=w.id
    where j.next_attempt_at<=now() and j.status in ('pending','retry','sending') loop perform private.trim_reminders(u); end loop;
  update private.notification_jobs set status='unknown',last_error_code='acceptance_unresolved',updated_at=now()
    where status in ('sending','retry') and first_attempt_at<now()-interval '23 hours';
  update private.notification_jobs set status='retry',next_attempt_at=now() where status='sending' and lease_until<now();
  update private.notification_jobs j set status='cancelled',updated_at=now()
    from public.warranties w,public.profiles p,public.purchases r
    where j.warranty_id=w.id and w.user_id=p.id and r.id=w.purchase_id and j.status in ('pending','retry')
    and (not w.reminders_enabled or not p.email_reminders_enabled or p.email_delivery_blocked or p.deletion_requested_at is not null
      or r.state<>'saved' or w.expires_on<>j.expiration_date);
  update private.notification_jobs j set status='skipped',updated_at=now()
    from public.warranties w,public.profiles p where j.warranty_id=w.id and w.user_id=p.id
    and j.status in ('pending','retry') and w.expires_on<(now() at time zone p.timezone)::date;
  update private.notification_jobs j set status='skipped',updated_at=now()
    where j.status='pending' and j.scheduled_at<=now() and exists(
      select 1 from private.notification_jobs newer where newer.warranty_id=j.warranty_id and newer.expiration_date=j.expiration_date
      and newer.scheduled_at>j.scheduled_at and newer.scheduled_at<=now() and newer.status in ('pending','retry','sending','accepted','delivered')
    );
  insert into private.email_daily_quota(day) values((now() at time zone 'UTC')::date) on conflict do nothing;
  select greatest(0,least(p_daily_limit,90)-reserved) into remaining from private.email_daily_quota where day=(now() at time zone 'UTC')::date;
  with candidates as (
    select id from private.notification_jobs where status in ('pending','retry') and next_attempt_at<=now()
    order by next_attempt_at,id for update skip locked limit least(greatest(p_limit,0),remaining,20)
  ), claimed as (
    update private.notification_jobs j set status='sending',lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes',
      first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1,updated_at=now()
    from candidates c where j.id=c.id returning j.*
  ) select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'lease_token',c.lease_token,'expiration_date',c.expiration_date,
      'offset_days',c.offset_days,'attempts',c.attempts,'payload',c.frozen_payload,'product_name',r.product_name,
      'purchase_id',r.id,'email',a.email)), '[]'::jsonb) into result
    from claimed c join public.warranties w on w.id=c.warranty_id join public.purchases r on r.id=w.purchase_id join auth.users a on a.id=w.user_id;
  update private.email_daily_quota set reserved=reserved+jsonb_array_length(result) where day=(now() at time zone 'UTC')::date;
  return result;
end $$;

create function public.prepare_notification(p_id uuid,p_lease uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare j private.notification_jobs; w public.warranties; p public.profiles; email text;
begin
  -- Same lock order as account writes: profile, then notification.
  select w0.user_id into p.id from public.warranties w0 join private.notification_jobs j0 on j0.warranty_id=w0.id where j0.id=p_id;
  if p.id is null then return null; end if;
  perform private.trim_reminders(p.id);
  select * into j from private.notification_jobs where id=p_id and lease_token=p_lease and status='sending' and lease_until>now() for update;
  if not found then return null; end if;
  select * into w from public.warranties where id=j.warranty_id;
  select * into p from public.profiles where id=w.user_id;
  select a.email into email from auth.users a where a.id=w.user_id and a.email_confirmed_at is not null;
  if not w.reminders_enabled or not p.email_reminders_enabled or p.email_delivery_blocked or p.deletion_requested_at is not null
    or w.expires_on<>j.expiration_date or w.expires_on<(now() at time zone p.timezone)::date or email is null
    or (j.frozen_payload is not null and j.frozen_payload->>'to'<>email)
  then update private.notification_jobs set status='cancelled',updated_at=now() where id=p_id; return null; end if;
  if p_payload->>'to'<>email then raise exception 'INVALID_INPUT'; end if;
  update private.notification_jobs set frozen_payload=coalesce(frozen_payload,p_payload) where id=p_id returning frozen_payload into p_payload;
  return p_payload;
end $$;
create function public.finish_notification(p_id uuid,p_lease uuid,p_status text,p_provider_id text,p_error text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('accepted','retry','failed','unknown') then raise exception 'INVALID_INPUT'; end if;
  perform 1 from public.profiles where id in (
    select w.user_id from public.warranties w join private.notification_jobs j on j.warranty_id=w.id where j.id=p_id
  ) for update;
  update private.notification_jobs set status=case when p_status='retry' and attempts>=6 then 'unknown' else p_status end,
    provider_email_id=coalesce(p_provider_id,provider_email_id),accepted_at=case when p_status='accepted' then now() else accepted_at end,
    last_error_code=left(p_error,80),lease_until=null,
    next_attempt_at=now()+case when attempts<=1 then interval '15 minutes' when attempts=2 then interval '1 hour' when attempts=3 then interval '4 hours' else interval '12 hours' end,
    updated_at=now()
    where id=p_id and lease_token=p_lease and status='sending';
  if p_provider_id is not null then
    perform public.record_email_event(p_provider_id,e.event_type) from private.email_events e where e.provider_id=p_provider_id;
  end if;
end $$;
create function public.record_email_event(p_id text,p_type text) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.profiles where id in (
    select w.user_id from public.warranties w join private.notification_jobs j on j.warranty_id=w.id where j.provider_email_id=p_id
  ) for update;
  -- Persist early delivery events: a webhook can beat the send acknowledgment.
  insert into private.email_events(provider_id,event_type) values(p_id,p_type) on conflict do nothing;
  if p_type='email.delivered' then update private.notification_jobs set delivered_at=now(),status='delivered' where provider_email_id=p_id and status='accepted';
  elsif p_type in ('email.bounced','email.complained') then
    update private.notification_jobs set status='failed',last_error_code=p_type where provider_email_id=p_id;
    update public.profiles set email_delivery_blocked=true where id in (
      select w.user_id from public.warranties w join private.notification_jobs j on j.warranty_id=w.id where j.provider_email_id=p_id
    );
  end if;
end $$;
revoke execute on function private.schedule_warranty(),private.reschedule_preferences(),private.trim_reminders(uuid) from public,anon,authenticated;
revoke execute on function public.claim_notification_jobs(integer,integer),public.prepare_notification(uuid,uuid,jsonb),public.finish_notification(uuid,uuid,text,text,text),public.record_email_event(text,text) from public,anon,authenticated;
grant execute on function public.claim_notification_jobs(integer,integer),public.prepare_notification(uuid,uuid,jsonb),public.finish_notification(uuid,uuid,text,text,text),public.record_email_event(text,text) to service_role;
