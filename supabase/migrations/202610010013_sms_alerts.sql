begin;
alter table public.profiles
 add column phone_number text check(phone_number ~ '^\+639[0-9]{9}$'),
 add column phone_verified_at timestamptz,
 add column sms_reminders_enabled boolean not null default false,
 add column phone_prompt_dismissed boolean not null default false,
 add constraint sms_requires_phone check(not sms_reminders_enabled or phone_number is not null);

create function public.update_alert_preferences(p_phone text,p_sms boolean,p_email boolean) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();
begin
 perform private.rate_limit(u,'write',30);
 if p_sms is null or p_email is null or (p_sms and p_phone is null) or (p_phone is not null and p_phone !~ '^\+639[0-9]{9}$') then raise exception 'INVALID_INPUT'; end if;
 update public.profiles set phone_verified_at=case when phone_number is not distinct from p_phone then phone_verified_at else null end,
 phone_number=p_phone,sms_reminders_enabled=p_sms,email_reminders_enabled=p_email,updated_at=now() where id=u;
end $$;
create function public.dismiss_phone_prompt() returns void language plpgsql security definer set search_path='' as $$
begin update public.profiles set phone_prompt_dismissed=true where id=private.require_user(); end $$;

create table private.sms_daily_quota(day date primary key,reserved integer not null default 0);
create table private.sms_monthly_quota(user_id uuid references public.profiles(id) on delete cascade,month date,reserved integer not null default 0,primary key(user_id,month));
create table private.phone_challenges(
 user_id uuid primary key references public.profiles(id) on delete cascade,phone text not null,code_hash text not null,
 expires_at timestamptz not null,requested_at timestamptz not null,attempts integer not null default 0
);
create table private.phone_verification_requests(
 user_id uuid references public.profiles(id) on delete cascade,phone text not null,requested_at timestamptz not null default now()
);
create function public.begin_phone_verification(p_user uuid,p_phone text,p_hash text) returns void
language plpgsql security definer set search_path='' as $$
declare p public.profiles;
begin
 select * into p from public.profiles where id=p_user and deletion_requested_at is null for update;
 if not found or p.phone_number is distinct from p_phone or not p.sms_reminders_enabled then raise exception 'INVALID_INPUT'; end if;
 perform pg_advisory_xact_lock(719420013);
 if exists(select 1 from private.phone_challenges where user_id=p_user and requested_at>now()-interval '1 minute')
 or (select count(*) from private.phone_verification_requests where (user_id=p_user or phone=p_phone) and requested_at>now()-interval '1 hour')>=3
 then raise exception 'RATE_LIMIT'; end if;
 insert into private.sms_daily_quota(day) values((now() at time zone 'UTC')::date) on conflict do nothing;
 if (select reserved from private.sms_daily_quota where day=(now() at time zone 'UTC')::date)>=100 then raise exception 'RATE_LIMIT'; end if;
 update private.sms_daily_quota set reserved=reserved+1 where day=(now() at time zone 'UTC')::date;
 delete from private.phone_verification_requests where requested_at<now()-interval '1 day';
 insert into private.phone_verification_requests(user_id,phone) values(p_user,p_phone);
 insert into private.phone_challenges(user_id,phone,code_hash,expires_at,requested_at) values(p_user,p_phone,p_hash,now()+interval '10 minutes',now())
 on conflict(user_id) do update set phone=excluded.phone,code_hash=excluded.code_hash,expires_at=excluded.expires_at,requested_at=excluded.requested_at,attempts=0;
end $$;
create function public.verify_alert_phone(p_user uuid,p_hash text) returns boolean
language plpgsql security definer set search_path='' as $$
declare c private.phone_challenges; p public.profiles;
begin
 select * into p from public.profiles where id=p_user and deletion_requested_at is null for update;
 if not found then return false; end if;
 select * into c from private.phone_challenges where user_id=p_user for update;
 if not found or c.expires_at<=now() or c.attempts>=5 or c.phone is distinct from p.phone_number then return false; end if;
 update private.phone_challenges set attempts=attempts+1 where user_id=p_user;
 if c.code_hash<>p_hash then return false; end if;
 update public.profiles set phone_verified_at=now() where id=p_user;
 delete from private.phone_challenges where user_id=p_user;
 return true;
end $$;

-- Warranties end; they never acquire a new assumed coverage period.
update public.important_dates set recurrence_months=null,recurrence_anchor=null,recurrence_ends_on=null where kind='warranty';
alter table public.important_dates add constraint warranty_does_not_repeat check(kind<>'warranty' or recurrence_months is null);
alter function public.complete_date(uuid,integer,date,date) rename to complete_date_with_recurrence;
alter function public.complete_date_with_recurrence(uuid,integer,date,date) set schema private;
revoke all on function private.complete_date_with_recurrence(uuid,integer,date,date) from public,anon,authenticated,service_role;
create function public.complete_date(p_id uuid,p_revision integer,p_completed date,p_next date) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();
begin
 if p_next is not null and exists(select 1 from public.important_dates where id=p_id and user_id=u and kind='warranty') then raise exception 'INVALID_INPUT'; end if;
 perform private.complete_date_with_recurrence(p_id,p_revision,p_completed,p_next);
end $$;

create table private.sms_jobs(
 id uuid primary key default gen_random_uuid(),date_id uuid not null references public.important_dates(id) on delete cascade,
 occurrence_id uuid not null references public.date_occurrences(id) on delete cascade,
 offset_unit text not null,offset_value integer not null,expiration_date date not null,scheduled_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','sending','accepted','failed','unknown','cancelled','skipped')),
 lease_token uuid,lease_until timestamptz,attempted_at timestamptz,phone text,provider_id text,last_error_code text,
 unique(occurrence_id,offset_unit,offset_value)
);
create index sms_due_idx on private.sms_jobs(scheduled_at) where status='pending';
create index sms_owner_budget_idx on private.sms_jobs(date_id,attempted_at) where attempted_at is not null;

create function private.sms_eligible(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.current_dates d join public.profiles p on p.id=d.user_id
 where d.id=p_id and d.reminders_enabled and private.covered(d.item_id) and d.state='saved' and d.archived_at is null
 and p.deletion_requested_at is null and p.sms_reminders_enabled and p.phone_verified_at is not null and p.phone_number is not null);
$$;
alter function private.schedule_date(uuid) rename to schedule_email_date;
create function private.schedule_date(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare d private.current_dates; p public.profiles; r record; target date; at_time timestamptz;
begin
 perform private.schedule_email_date(p_id);
 select * into d from private.current_dates where id=p_id;
 update private.sms_jobs j set status='cancelled' where date_id=p_id and status='pending' and
 (d.id is null or j.occurrence_id<>d.occurrence_id or not private.sms_eligible(p_id)
 or not exists(select 1 from public.reminder_offsets ro where ro.date_id=p_id and ro.unit=j.offset_unit and ro.value=j.offset_value));
 if d.id is null or not private.sms_eligible(p_id) then return; end if;
 select * into p from public.profiles where id=d.user_id;
 for r in select * from public.reminder_offsets where date_id=p_id loop
 target:=case when r.unit='months' then (d.expires_on-make_interval(months=>r.value))::date else d.expires_on-r.value end;
 at_time:=(target+time '09:00') at time zone p.timezone;
 if at_time>=greatest(p.phone_verified_at,coalesce((select coverage_since from public.items where id=d.item_id),now()))
 and target>=greatest((now() at time zone p.timezone)::date,(coalesce(d.reminders_enabled_at,now()) at time zone p.timezone)::date) then
 insert into private.sms_jobs(date_id,occurrence_id,expiration_date,offset_unit,offset_value,scheduled_at)
 values(d.id,d.occurrence_id,d.expires_on,r.unit,r.value,at_time)
 on conflict(occurrence_id,offset_unit,offset_value) do update set scheduled_at=excluded.scheduled_at,status='pending'
 where private.sms_jobs.status in ('pending','cancelled') and private.sms_jobs.attempted_at is null;
 end if;
 end loop;
end $$;
create function private.reschedule_sms_preferences() returns trigger language plpgsql security definer set search_path='' as $$
declare d record;
begin
 if new.timezone is distinct from old.timezone or new.sms_reminders_enabled is distinct from old.sms_reminders_enabled
 or new.phone_number is distinct from old.phone_number or new.phone_verified_at is distinct from old.phone_verified_at then
 for d in select id from public.important_dates where user_id=new.id loop perform private.schedule_date(d.id); end loop;
 end if;
 return new;
end $$;
create trigger sms_preferences_schedule after update on public.profiles for each row execute function private.reschedule_sms_preferences();

-- Add actionable context without changing the proven email leasing/deduplication logic.
alter function public.claim_notification_jobs(integer,integer) rename to claim_email_jobs_base;
alter function public.claim_email_jobs_base(integer,integer) set schema private;
revoke all on function private.claim_email_jobs_base(integer,integer) from public,anon,authenticated,service_role;
create function public.claim_notification_jobs(p_limit integer default 10,p_daily_limit integer default 90) returns jsonb
language plpgsql security definer set search_path='' as $$
declare jobs jsonb;
begin
 jobs:=private.claim_email_jobs_base(p_limit,p_daily_limit);
 return coalesce((select jsonb_agg(j||jsonb_build_object('date_id',d.id,'date_kind',d.kind,'recurrence_months',d.recurrence_months,
 'recurrence_anchor',d.recurrence_anchor,'recurrence_ends_on',d.recurrence_ends_on,'payment_amount_minor',d.payment_amount_minor))
 from jsonb_array_elements(jobs) j join private.notification_jobs n on n.id=(j->>'id')::uuid join public.important_dates d on d.id=n.date_id),'[]'::jsonb);
end $$;

create function public.claim_sms_jobs(p_limit integer default 2) returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.sms_jobs; d private.current_dates; p public.profiles; result jsonb:='[]'::jsonb; u uuid;
begin
 -- Lock order matches account mutations: profile before quota and job rows.
 for u in select distinct x.user_id from public.important_dates x join private.sms_jobs s on s.date_id=x.id where s.status='pending' and s.scheduled_at<=now()
 order by x.user_id loop perform private.trim_reminders(u); end loop;
 perform pg_advisory_xact_lock(719420013);
 update private.sms_jobs set status='unknown',last_error_code='acceptance_unresolved' where status='sending' and lease_until<now();
 insert into private.sms_daily_quota(day) values((now() at time zone 'UTC')::date) on conflict do nothing;
 for j in select * from private.sms_jobs where status='pending' and scheduled_at<=now() order by scheduled_at,id for update skip locked limit 40 loop
 select * into d from private.current_dates where id=j.date_id;
 select * into p from public.profiles where id=d.user_id;
 if d.id is null or not private.sms_eligible(j.date_id) or d.occurrence_id<>j.occurrence_id or d.expires_on<>j.expiration_date
 or not exists(select 1 from public.reminder_offsets where date_id=j.date_id and unit=j.offset_unit and value=j.offset_value) then
 update private.sms_jobs set status='cancelled' where id=j.id; continue; end if;
 if d.expires_on<(now() at time zone p.timezone)::date or exists(select 1 from private.sms_jobs n where n.occurrence_id=j.occurrence_id
 and n.scheduled_at>j.scheduled_at and n.scheduled_at<=now() and n.status in ('pending','sending','accepted')) then
 update private.sms_jobs set status='skipped' where id=j.id; continue; end if;
 insert into private.sms_monthly_quota(user_id,month) values(p.id,date_trunc('month',now() at time zone 'UTC')::date) on conflict do nothing;
 if (select reserved from private.sms_monthly_quota where user_id=p.id and month=date_trunc('month',now() at time zone 'UTC')::date)>=30 then
 update private.sms_jobs set status='skipped',last_error_code='monthly_sms_limit' where id=j.id; continue; end if;
 if (select reserved from private.sms_daily_quota where day=(now() at time zone 'UTC')::date)>=100 then exit; end if;
 update private.sms_monthly_quota set reserved=reserved+1 where user_id=p.id and month=date_trunc('month',now() at time zone 'UTC')::date;
 update private.sms_jobs set status='sending',lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes',attempted_at=now(),phone=p.phone_number where id=j.id returning * into j;
 update private.sms_daily_quota set reserved=reserved+1 where day=(now() at time zone 'UTC')::date;
 result:=result||jsonb_build_array(jsonb_build_object('id',j.id,'lease_token',j.lease_token,'phone',j.phone,'expiration_date',j.expiration_date,
 'product_name',d.product_name,'purchase_id',d.item_id,'date_id',d.id,'kind',d.label,'date_kind',d.kind));
 if jsonb_array_length(result)>=least(greatest(p_limit,1),2) then exit; end if;
 end loop;
 return result;
end $$;
create function public.prepare_sms(p_id uuid,p_lease uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare j private.sms_jobs; d private.current_dates; p public.profiles;
begin
 select * into p from public.profiles where id=(select user_id from public.important_dates where id=(select date_id from private.sms_jobs where id=p_id)) for update;
 if not found then return false; end if;
 perform private.trim_reminders(p.id);
 select * into j from private.sms_jobs where id=p_id and lease_token=p_lease and status='sending' and lease_until>now() for update;
 if not found then return false; end if;
 select * into d from private.current_dates where id=j.date_id;
 if d.id is null or not private.sms_eligible(j.date_id) or j.phone is distinct from p.phone_number or j.occurrence_id<>d.occurrence_id
 or j.expiration_date<>d.expires_on or d.expires_on<(now() at time zone p.timezone)::date
 or not exists(select 1 from public.reminder_offsets where date_id=j.date_id and unit=j.offset_unit and value=j.offset_value)
 then update private.sms_jobs set status='cancelled' where id=p_id; return false; end if;
 return true;
end $$;
create function public.finish_sms(p_id uuid,p_lease uuid,p_status text,p_provider_id text,p_error text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_status not in ('accepted','failed','unknown') then raise exception 'INVALID_INPUT'; end if;
 update private.sms_jobs set status=p_status,provider_id=p_provider_id,last_error_code=left(p_error,80),lease_until=null
 where id=p_id and lease_token=p_lease and status='sending';
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
 ) j on j.occurrence_id=d.occurrence_id
 where d.user_id=u and d.item_id=p_item_id and d.archived_at is null and d.reminders_enabled and private.covered(d.item_id)
 group by d.id,p.timezone) r;
 return result;
end $$;
revoke all on function public.update_alert_preferences(text,boolean,boolean),public.dismiss_phone_prompt(),public.complete_date(uuid,integer,date,date) from public,anon;
grant execute on function public.update_alert_preferences(text,boolean,boolean),public.dismiss_phone_prompt(),public.complete_date(uuid,integer,date,date) to authenticated;
revoke all on function public.begin_phone_verification(uuid,text,text),public.verify_alert_phone(uuid,text),public.claim_sms_jobs(integer),public.prepare_sms(uuid,uuid),public.finish_sms(uuid,uuid,text,text,text),public.claim_notification_jobs(integer,integer) from public,anon,authenticated;
grant execute on function public.begin_phone_verification(uuid,text,text),public.verify_alert_phone(uuid,text),public.claim_sms_jobs(integer),public.prepare_sms(uuid,uuid),public.finish_sms(uuid,uuid,text,text,text),public.claim_notification_jobs(integer,integer) to service_role;
revoke all on function private.schedule_date(uuid),private.schedule_email_date(uuid),private.sms_eligible(uuid),private.reschedule_sms_preferences() from public,anon,authenticated,service_role;
commit;
