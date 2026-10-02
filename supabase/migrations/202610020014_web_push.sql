begin;
alter table public.profiles add column push_reminders_enabled boolean not null default false,
 add column push_enabled_at timestamptz,
 add column push_subscription_count integer not null default 0 check(push_subscription_count between 0 and 5);

create table private.push_subscriptions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 endpoint text not null unique check(length(endpoint) between 20 and 2048),
 p256dh text not null check(p256dh ~ '^[A-Za-z0-9_-]{87}={0,2}$'),
 auth text not null check(auth ~ '^[A-Za-z0-9_-]{22}={0,2}$'),created_at timestamptz not null default now()
);
alter table private.push_subscriptions enable row level security;
create table private.push_jobs(
 id uuid primary key default gen_random_uuid(),subscription_id uuid not null references private.push_subscriptions(id) on delete cascade,
 date_id uuid not null references public.important_dates(id) on delete cascade,
 occurrence_id uuid not null references public.date_occurrences(id) on delete cascade,
 offset_unit text not null,offset_value integer not null,expiration_date date not null,scheduled_at timestamptz not null,
 next_attempt_at timestamptz not null,status text not null default 'pending'
 check(status in ('pending','retry','sending','accepted','failed','unknown','cancelled','skipped')),
 lease_token uuid,lease_until timestamptz,prepared_at timestamptz,attempts integer not null default 0,last_error_code text,
 unique(subscription_id,occurrence_id,offset_unit,offset_value)
);
alter table private.push_jobs enable row level security;
create index push_due_idx on private.push_jobs(next_attempt_at) where status in ('pending','retry');
create index push_owner_idx on private.push_subscriptions(user_id);

create function private.push_endpoint_allowed(p_endpoint text) returns boolean language sql immutable set search_path='' as $$
 select p_endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]#]+$';
$$;
create function private.push_eligible(p_date uuid,p_subscription uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.current_dates d join public.profiles p on p.id=d.user_id
 join private.push_subscriptions s on s.user_id=p.id and s.id=p_subscription
 where d.id=p_date and d.reminders_enabled and private.covered(d.item_id) and d.state='saved'
 and d.archived_at is null and p.deletion_requested_at is null and p.push_reminders_enabled);
$$;
create function private.push_job_eligible(j private.push_jobs) returns boolean language sql stable security definer set search_path='' as $$
 select private.push_eligible(j.date_id,j.subscription_id) and exists(select 1 from private.current_dates d
 join public.profiles p on p.id=d.user_id join public.reminder_offsets r on r.date_id=d.id
 where d.occurrence_id=j.occurrence_id and d.id=j.date_id and d.expires_on=j.expiration_date
 and d.expires_on>=(now() at time zone p.timezone)::date and r.unit=j.offset_unit and r.value=j.offset_value);
$$;
alter function private.schedule_date(uuid) rename to schedule_existing_channels;
create function private.schedule_date(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare d private.current_dates; p public.profiles; r record; s record; target date; at_time timestamptz;
begin
 perform private.schedule_existing_channels(p_id);
 select * into d from private.current_dates where id=p_id;
 update private.push_jobs j set status='cancelled' where j.date_id=p_id and j.status in ('pending','retry')
 and not private.push_job_eligible(j);
 if d.id is null then return; end if;
 select * into p from public.profiles where id=d.user_id;
 for s in select * from private.push_subscriptions where user_id=d.user_id loop
 if not private.push_eligible(p_id,s.id) then continue; end if;
 for r in select * from public.reminder_offsets where date_id=p_id loop
 target:=case when r.unit='months' then (d.expires_on-make_interval(months=>r.value))::date else d.expires_on-r.value end;
 at_time:=(target+time '09:00') at time zone p.timezone;
 if at_time>=greatest(now(),s.created_at,p.push_enabled_at,d.reminders_enabled_at,
 (select coverage_since from public.items where id=d.item_id)) then
 insert into private.push_jobs(subscription_id,date_id,occurrence_id,expiration_date,offset_unit,offset_value,scheduled_at,next_attempt_at)
 values(s.id,d.id,d.occurrence_id,d.expires_on,r.unit,r.value,at_time,at_time)
 on conflict(subscription_id,occurrence_id,offset_unit,offset_value) do update
 set scheduled_at=excluded.scheduled_at,next_attempt_at=excluded.next_attempt_at,status='pending'
 where private.push_jobs.status in ('pending','cancelled') and private.push_jobs.attempts=0;
 end if;
 end loop; end loop;
end $$;
create function private.reschedule_push_preferences() returns trigger language plpgsql security definer set search_path='' as $$
declare d record;
begin
 if new.push_reminders_enabled is distinct from old.push_reminders_enabled or new.timezone is distinct from old.timezone
 or new.deletion_requested_at is distinct from old.deletion_requested_at then
 for d in select id from public.important_dates where user_id=new.id loop perform private.schedule_date(d.id); end loop;
 end if; return new;
end $$;
create trigger push_preferences_schedule after update on public.profiles for each row execute function private.reschedule_push_preferences();
create function private.push_device_count() returns trigger language plpgsql security definer set search_path='' as $$
declare u uuid:=case when tg_op='DELETE' then old.user_id else new.user_id end; n integer;
begin
 select count(*) into n from private.push_subscriptions where user_id=u;
 update public.profiles set push_subscription_count=n,push_reminders_enabled=push_reminders_enabled and n>0,updated_at=now() where id=u;
 return null;
end $$;
create trigger push_device_count after insert or delete on private.push_subscriptions for each row execute function private.push_device_count();

create function public.register_push_subscription(p_endpoint text,p_p256dh text,p_auth text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); existing private.push_subscriptions; d record;
begin
 perform private.rate_limit(u,'push_register',10);
 perform 1 from public.profiles where id=u for update;
 if not private.push_endpoint_allowed(p_endpoint) or length(p_endpoint)>2048
 or p_p256dh is null or p_auth is null or p_p256dh !~ '^[A-Za-z0-9_-]{87}={0,2}$' or p_auth !~ '^[A-Za-z0-9_-]{22}={0,2}$'
 then raise exception 'INVALID_INPUT'; end if;
 select * into existing from private.push_subscriptions where endpoint=p_endpoint;
 if existing.id is not null and existing.user_id<>u then raise exception 'DEVICE_LINKED'; end if;
 if existing.id is null and (select count(*) from private.push_subscriptions where user_id=u)>=5 then raise exception 'DEVICE_LIMIT'; end if;
 insert into private.push_subscriptions(user_id,endpoint,p256dh,auth) values(u,p_endpoint,p_p256dh,p_auth)
 on conflict(endpoint) do update set p256dh=excluded.p256dh,auth=excluded.auth where private.push_subscriptions.user_id=u;
 -- A concurrent attempt to attach the same endpoint to a different owner cannot transfer it.
 if not found then raise exception 'DEVICE_LINKED'; end if;
 update public.profiles set push_enabled_at=case when push_reminders_enabled then push_enabled_at else now() end,
 push_reminders_enabled=true,updated_at=now() where id=u;
 for d in select id from public.important_dates where user_id=u loop perform private.schedule_date(d.id); end loop;
end $$;
create function public.remove_push_subscription(p_endpoint text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();
begin
 perform private.rate_limit(u,'push_register',10);
 perform 1 from public.profiles where id=u for update;
 delete from private.push_subscriptions where endpoint=p_endpoint and user_id=u;
end $$;
create function public.push_device_status(p_endpoint text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();
begin
 return (select jsonb_build_object('enabled',push_reminders_enabled,'deviceCount',push_subscription_count,
 'registered',exists(select 1 from private.push_subscriptions s where s.user_id=u and s.endpoint=p_endpoint)) from public.profiles where id=u);
end $$;
-- Test sends require an owner registration and are limited independently of reminder sends.
create function public.prepare_push_test(p_endpoint text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();
begin
 perform private.rate_limit(u,'push_test',3,3600);
 return (select jsonb_build_object('endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth))
 from private.push_subscriptions s join public.profiles p on p.id=s.user_id
 where s.user_id=u and s.endpoint=p_endpoint and p.push_reminders_enabled);
end $$;
create function public.claim_push_jobs(p_limit integer default 2) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 update private.push_jobs set status=case when prepared_at is null then 'retry' else 'unknown' end,
 next_attempt_at=now(),lease_until=null,last_error_code='lease_expired' where status='sending' and lease_until<now();
 update private.push_jobs j set status='cancelled' where status in ('pending','retry') and not private.push_job_eligible(j);
 with candidates as (select j.id from private.push_jobs j where j.status in ('pending','retry') and j.next_attempt_at<=now()
 and j.attempts<3 order by j.next_attempt_at,j.id limit greatest(0,least(p_limit,5)) for update skip locked),
 claimed as (update private.push_jobs j set status='sending',lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',prepared_at=null
 from candidates c where j.id=c.id returning j.id,j.lease_token)
 select coalesce(jsonb_agg(to_jsonb(claimed)),'[]'::jsonb) into result from claimed;
 return result;
end $$;
create function public.prepare_push_job(p_id uuid,p_lease uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.push_jobs; s private.push_subscriptions; p public.profiles; d private.current_dates;
begin
 select p0.* into p from public.profiles p0 join public.important_dates d0 on d0.user_id=p0.id
 join private.push_jobs j0 on j0.date_id=d0.id where j0.id=p_id for update of p0;
 select * into j from private.push_jobs where id=p_id and lease_token=p_lease and status='sending' and lease_until>now() for update;
 if not found or j.prepared_at is not null then return null; end if;
 if not private.push_job_eligible(j) then update private.push_jobs set status='cancelled',lease_until=null where id=j.id; return null; end if;
 select * into s from private.push_subscriptions where id=j.subscription_id;
 select * into d from private.current_dates where id=j.date_id;
 update private.push_jobs set prepared_at=now(),attempts=attempts+1 where id=j.id;
 return jsonb_build_object('id',j.id,'endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth),
 'itemId',d.item_id,'dateId',d.id,'product',d.product_name,'kind',d.label,'dueOn',d.expires_on,'timezone',p.timezone);
end $$;
create function public.finish_push_job(p_id uuid,p_lease uuid,p_status text,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_status not in ('accepted','retry','failed','unknown','expired') then raise exception 'INVALID_INPUT'; end if;
 update private.push_jobs set status=case when p_status='expired' then 'failed' when p_status='retry' and attempts>=3 then 'failed' else p_status end,
 next_attempt_at=now()+interval '15 minutes',last_error_code=left(p_error,80),lease_until=null
 where id=p_id and lease_token=p_lease and status='sending' and prepared_at is not null;
end $$;
-- Compare keys as well as the endpoint so an old in-flight send cannot remove a replacement registration.
create function public.expire_push_subscription(p_endpoint text,p_auth text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid;
begin
 select user_id into u from private.push_subscriptions where endpoint=p_endpoint and auth=p_auth;
 if u is null then return; end if;
 perform 1 from public.profiles where id=u for update;
 delete from private.push_subscriptions where endpoint=p_endpoint and auth=p_auth;
end $$;

create or replace function public.reminder_preview(p_item_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); result jsonb;
begin
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into result from (
 select d.id as date_id,(min(j.scheduled_at) at time zone p.timezone)::date as next_scheduled_on from private.current_dates d
 join public.profiles p on p.id=d.user_id join (
 select occurrence_id,scheduled_at from private.notification_jobs where status in ('pending','retry','sending')
 and exists(select 1 from public.profiles where id=u and email_reminders_enabled and not email_delivery_blocked)
 union all select occurrence_id,scheduled_at from private.sms_jobs where status in ('pending','sending')
 and exists(select 1 from public.profiles where id=u and sms_reminders_enabled and phone_verified_at is not null)
 union all select occurrence_id,scheduled_at from private.push_jobs pj where status in ('pending','retry','sending') and private.push_job_eligible(pj)
 ) j on j.occurrence_id=d.occurrence_id
 where d.user_id=u and d.item_id=p_item_id and d.archived_at is null and d.reminders_enabled and private.covered(d.item_id)
 group by d.id,p.timezone) r;
 return result;
end $$;
revoke all on private.push_subscriptions,private.push_jobs from public,anon,authenticated,service_role;
revoke all on function private.push_endpoint_allowed(text),private.push_eligible(uuid,uuid),private.push_job_eligible(private.push_jobs),
 private.schedule_date(uuid),private.schedule_existing_channels(uuid),private.reschedule_push_preferences(),private.push_device_count() from public,anon,authenticated,service_role;
revoke all on function public.register_push_subscription(text,text,text),public.remove_push_subscription(text),public.push_device_status(text),public.prepare_push_test(text),
 public.claim_push_jobs(integer),public.prepare_push_job(uuid,uuid),public.finish_push_job(uuid,uuid,text,text),public.expire_push_subscription(text,text) from public,anon,authenticated,service_role;
grant execute on function public.register_push_subscription(text,text,text),public.remove_push_subscription(text),public.push_device_status(text),public.prepare_push_test(text) to authenticated;
grant execute on function public.claim_push_jobs(integer),public.prepare_push_job(uuid,uuid),public.finish_push_job(uuid,uuid,text,text),public.expire_push_subscription(text,text) to service_role;
commit;
