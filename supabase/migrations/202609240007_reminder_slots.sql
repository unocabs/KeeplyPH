-- Pause workers for this atomic cutover; preserves historical migrations and job identities.
begin;
alter table public.items add column coverage_requested_at timestamptz;
alter table public.items add column coverage_active boolean not null default false;
alter table public.items add column coverage_since timestamptz;
alter table public.profiles add column renewal_emails_enabled boolean not null default true;
create index items_cursor_idx on public.items(user_id,created_at desc,id desc);
create index items_coverage_idx on public.items(user_id,coverage_requested_at,id) where coverage_requested_at is not null;
create table private.billing_settings (singleton boolean primary key default true check(singleton), live boolean not null default false);
insert into private.billing_settings default values;
revoke all on private.billing_settings from public,anon,authenticated;
create table private.reminder_packs (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 live boolean not null default false, paid_until timestamptz, permanent boolean not null default false, revision integer not null default 1
);
revoke all on private.reminder_packs from public,anon,authenticated;
create function private.slot_limit(u uuid) returns integer language sql stable security definer set search_path='' as $$
 select greatest(3+case when exists(select 1 from private.reminder_packs where live=(select live from private.billing_settings) and user_id=u and (permanent or paid_until>now())) then 5 else 0 end,
 case when private.is_premium(u) then 1000 else 0 end)
$$;
create function private.covered(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select i.id in (select x.id from public.items x where x.user_id=i.user_id and x.state='saved' and x.archived_at is null and x.coverage_requested_at is not null order by x.coverage_requested_at,x.id limit private.slot_limit(i.user_id))
 from public.items i where i.id=p_id),false)
$$;
-- Preserve existing opt-ins; fail visibly if anomalous free data would lose coverage.
do $$ begin
 if exists(select 1 from public.important_dates d join public.items i on i.id=d.item_id
 where d.reminders_enabled and i.state='saved' and i.archived_at is null and not private.is_premium(i.user_id)
 group by i.user_id having count(distinct i.id)>3) then raise exception 'MIGRATION_COVERAGE_REVIEW_REQUIRED'; end if;
end $$;
update public.items i set coverage_requested_at=d.enabled_at,coverage_since=d.enabled_at,coverage_active=true
from (select item_id,min(coalesce(reminders_enabled_at,created_at)) enabled_at from public.important_dates where reminders_enabled group by item_id) d
where i.id=d.item_id and i.state='saved' and i.archived_at is null;
create or replace function private.schedule_date(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare d private.current_dates; p public.profiles; r record; target date; at_time timestamptz;
begin
 select * into d from private.current_dates where id=p_id;
 update private.notification_jobs set status='cancelled',updated_at=now() where date_id=p_id and status in ('pending','retry') and (d.id is null or occurrence_id<>d.occurrence_id);
 if d.id is null then return; end if;
 select * into p from public.profiles where id=d.user_id;
 update private.notification_jobs j set status='cancelled',updated_at=now() where j.date_id=p_id and j.status in ('pending','retry') and
 (not private.covered(d.item_id) or not d.reminders_enabled or not p.email_reminders_enabled or p.email_delivery_blocked or p.deletion_requested_at is not null or d.archived_at is not null or d.state<>'saved'
 or not exists(select 1 from public.reminder_offsets ro where ro.date_id=p_id and ro.unit=j.offset_unit and ro.value=j.offset_value));
 if not private.covered(d.item_id) or not d.reminders_enabled or not p.email_reminders_enabled or p.email_delivery_blocked or p.deletion_requested_at is not null or d.archived_at is not null or d.state<>'saved' then return; end if;
 for r in select * from public.reminder_offsets where date_id=p_id loop
   target := case when r.unit='months' then (d.expires_on-make_interval(months=>r.value))::date else d.expires_on-r.value end;
   at_time := (target+time '09:00') at time zone p.timezone;
   if at_time>=coalesce((select coverage_since from public.items where id=d.item_id),now()) and target>=greatest((now() at time zone p.timezone)::date,(coalesce(d.reminders_enabled_at,now()) at time zone p.timezone)::date) then
     insert into private.notification_jobs(date_id,occurrence_id,expiration_date,offset_value,offset_unit,scheduled_at,next_attempt_at)
     values(d.id,d.occurrence_id,d.expires_on,r.value,r.unit,at_time,at_time)
     on conflict(occurrence_id,offset_unit,offset_value) do update set scheduled_at=excluded.scheduled_at,next_attempt_at=excluded.next_attempt_at,status='pending',updated_at=now()
       where private.notification_jobs.status in ('pending','cancelled') and private.notification_jobs.first_attempt_at is null;
   end if;
 end loop;
end $$;
create or replace function private.trim_reminders(u uuid) returns void language plpgsql security definer set search_path='' as $$
declare i record; d record;
begin
 perform 1 from public.profiles where id=u for update;
 for i in select id,private.covered(id) effective from public.items where user_id=u and coverage_active is distinct from private.covered(id) loop
  update public.items set coverage_active=i.effective,coverage_since=case when i.effective then now() else coverage_since end where id=i.id;
  for d in select id from public.important_dates where item_id=i.id loop perform private.schedule_date(d.id); end loop;
 end loop;
end $$;
-- Date preferences never reject saving for lack of item coverage.
create or replace function private.check_reminder_limit(u uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform private.trim_reminders(u); end $$;
create function private.try_coverage(p_id uuid,u uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.items where id=p_id and (coverage_requested_at is not null or archived_at is not null)) then return; end if;
 perform private.trim_reminders(u);
 if (select count(*) from public.items where user_id=u and private.covered(id))<private.slot_limit(u) then
  update public.items set coverage_requested_at=clock_timestamp() where id=p_id and user_id=u and state='saved' and archived_at is null and coverage_requested_at is null;
 end if;
 perform private.trim_reminders(u);
end $$;
create function public.set_item_coverage(p_id uuid,p_revision integer,p_enabled boolean,p_replace uuid default null,p_replace_revision integer default null) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); i public.items; d record;
begin
 select * into i from public.items where id=p_id and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if i.revision<>p_revision then raise exception 'CONFLICT'; end if;
 if p_enabled then
  if i.state<>'saved' or i.archived_at is not null or not exists(select 1 from public.important_dates where item_id=p_id and reminders_enabled) then raise exception 'DATE_REQUIRED'; end if;
  if p_replace is not null then
   if p_replace=p_id then raise exception 'INVALID_INPUT'; end if;
   update public.items set coverage_requested_at=null,revision=revision+1 where id=p_replace and user_id=u and revision=p_replace_revision and private.covered(id);
   if not found then raise exception 'CONFLICT'; end if;
   -- The target takes the released priority, ahead of capacity-paused selections.
   update public.items set coverage_requested_at=coalesce((select min(coverage_requested_at)-interval '1 microsecond' from public.items where user_id=u),now()),revision=revision+1 where id=p_id;
  else
   if not private.covered(p_id) and (select count(*) from public.items where user_id=u and private.covered(id))>=private.slot_limit(u) then raise exception 'REMINDER_LIMIT'; end if;
   update public.items set coverage_requested_at=coalesce(coverage_requested_at,clock_timestamp()),revision=revision+1 where id=p_id;
  end if;
 else update public.items set coverage_requested_at=null,revision=revision+1 where id=p_id;
 end if;
 perform private.trim_reminders(u);
 for d in select id from public.important_dates where user_id=u and item_id in (p_id,p_replace) loop perform private.schedule_date(d.id); end loop;
end $$;
create or replace function public.create_item_draft(p_id uuid,p_template text) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();
begin
 if p_template not in ('receipt','car','motorcycle','licence','passport','aircon','other') then raise exception 'INVALID_INPUT'; end if;
 if exists(select 1 from public.items where id=p_id and user_id=u and template_key=p_template) then return p_id; end if;
 perform private.rate_limit(u,'draft',10);
 if (select count(*) from public.items where user_id=u and state='draft')>=3 then raise exception 'DRAFT_LIMIT'; end if;
 insert into public.items(id,user_id,template_key) values(p_id,u,p_template); return p_id;
end $$;
create or replace function public.save_item(p_id uuid,p_revision integer,p_label text,p_notes text) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); old public.items;
begin
 perform private.rate_limit(u,'write',30);
 select * into old from public.items where id=p_id and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if old.revision<>p_revision then raise exception 'CONFLICT'; end if;
 if nullif(btrim(p_label),'') is null then raise exception 'INVALID_INPUT'; end if;
 update public.items set product_name=btrim(p_label),notes=nullif(p_notes,''),state='saved',revision=revision+1,updated_at=now() where id=p_id;
 return p_id;
end $$;
create or replace function public.save_important_date(p_id uuid,p_item_id uuid,p_revision integer,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); d public.important_dates; o public.date_occurrences; i public.items; due date:=(p_data->>'due_on')::date;
 r jsonb; enabled boolean:=coalesce((p_data->>'reminders_enabled')::boolean,false); k text:=p_data->>'kind';
begin
 perform private.rate_limit(u,'date_write',60);
 select * into i from public.items where id=p_item_id and user_id=u;
 if not found then raise exception 'NOT_FOUND'; end if;
 if i.state<>'saved' then raise exception 'INVALID_INPUT'; end if;
 if i.template_key in ('licence','passport') and (nullif(p_data->>'serial_number','') is not null or nullif(p_data->>'starts_on','') is not null) then raise exception 'INVALID_INPUT'; end if;
 if due is null or due not between date '1900-01-01' and date '2200-12-31' or nullif(btrim(p_data->>'label'),'') is null then raise exception 'INVALID_INPUT'; end if;
 if not ((i.template_key='receipt' and k in ('warranty','other')) or (i.template_key in ('car','motorcycle') and k in ('registration','insurance','service','warranty','other')) or (i.template_key in ('licence','passport') and k='expiration') or (i.template_key='aircon' and k='service') or (i.template_key='other' and k='other')) then raise exception 'INVALID_INPUT'; end if;
 if jsonb_typeof(p_data->'offsets') is distinct from 'array' or jsonb_array_length(p_data->'offsets') not between 1 and 3 then raise exception 'INVALID_INPUT'; end if;
 select * into d from public.important_dates where id=p_id and user_id=u and item_id=p_item_id for update;
 if found then
   if d.revision<>p_revision then raise exception 'CONFLICT'; end if;
 else
   if p_revision<>0 then raise exception 'CONFLICT'; end if;
   if (select count(*) from public.important_dates where item_id=p_item_id)>=10 then raise exception 'DATE_LIMIT'; end if;
   insert into public.important_dates(id,item_id,user_id,kind,label) values(p_id,p_item_id,u,k,btrim(p_data->>'label')) returning * into d;
 end if;
 update public.important_dates set kind=k,label=btrim(p_data->>'label'),starts_on=case when p_data ? 'starts_on' then nullif(p_data->>'starts_on','')::date else d.starts_on end,
 serial_number=case when p_data ? 'serial_number' then nullif(p_data->>'serial_number','') else d.serial_number end,notes=case when p_data ? 'notes' then nullif(p_data->>'notes','') else d.notes end,
 interval_months=nullif(p_data->>'interval_months','')::integer,
 reminders_enabled=enabled,reminders_enabled_at=case when enabled and not d.reminders_enabled then now() else d.reminders_enabled_at end,
 reminder_disabled_reason=case when enabled then null else 'user' end,revision=revision+1,updated_at=now() where id=p_id;
 if nullif(p_data->>'starts_on','')::date>due then raise exception 'INVALID_INPUT'; end if;
 select * into o from public.date_occurrences where date_id=p_id and status='open';
 if o.id is null and not exists(select 1 from public.date_occurrences where date_id=p_id) and k='service' and nullif(p_data->>'last_completed_on','') is not null then
   if (p_data->>'last_completed_on')::date>(now() at time zone (select timezone from public.profiles where id=u))::date or (p_data->>'last_completed_on')::date>due or (p_data->>'last_completed_on')::date<date '1900-01-01' then raise exception 'INVALID_INPUT'; end if;
   insert into public.date_occurrences(date_id,user_id,cycle,due_on,status,completed_on) values(p_id,u,1,(p_data->>'last_completed_on')::date,'completed',(p_data->>'last_completed_on')::date);
 end if;
 if o.id is null or o.due_on<>due then
   update public.date_occurrences set status='superseded' where date_id=p_id and status='open';
   insert into public.date_occurrences(date_id,user_id,cycle,due_on) values(p_id,u,coalesce((select max(cycle) from public.date_occurrences where date_id=p_id),0)+1,due);
 end if;
 delete from public.reminder_offsets where date_id=p_id;
 for r in select value from jsonb_array_elements(p_data->'offsets') loop
   insert into public.reminder_offsets values(p_id,r->>'unit',(r->>'value')::integer);
 end loop;
 if enabled and not d.reminders_enabled then perform private.try_coverage(p_item_id,u); end if;
 perform private.trim_reminders(u); perform private.schedule_date(p_id); return p_id;
end $$;
create or replace function public.archive_item(p_id uuid,p_revision integer,p_archive boolean) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); d record;
begin
 update public.items set archived_at=case when p_archive then now() end,revision=revision+1 where id=p_id and user_id=u and revision=p_revision;
 if not found then raise exception 'CONFLICT'; end if;
 if p_archive then update public.items set coverage_requested_at=null where id=p_id; end if;
 perform private.trim_reminders(u);
 for d in select id from public.important_dates where item_id=p_id loop perform private.schedule_date(d.id); end loop;
end $$;
create or replace function public.account_usage() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); n integer; t date;
begin
 perform private.trim_reminders(u);
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 select count(*) into n from public.items where user_id=u and private.covered(id);
 return jsonb_build_object(
 'purchases',(select count(*) from public.items where user_id=u and state='saved'),
 'reminders',n,'slot_limit',private.slot_limit(u),
 'uncovered',(select count(*) from public.items where user_id=u and state='saved' and archived_at is null and not private.covered(id)),
 'storage_bytes',coalesce((select sum(case when state='ready' then size_bytes else reserved_bytes end) from public.documents where user_id=u),0),
 'storage_limit_bytes',case when private.is_premium(u) then 2147483648 else 104857600 end,
 'premium',private.is_premium(u),'premium_until',(select premium_until from public.account_entitlements where user_id=u),
 'paid_until',(select paid_until from private.reminder_packs where live=(select live from private.billing_settings) and user_id=u),'permanent',coalesce((select permanent from private.reminder_packs where live=(select live from private.billing_settings) and user_id=u),false),
 'renewal_emails_enabled',(select renewal_emails_enabled from public.profiles where id=u),
 'upcoming',(select count(*) from private.current_dates where user_id=u and state='saved' and archived_at is null and expires_on between t and t+30),
 'overdue',(select count(*) from private.current_dates where user_id=u and state='saved' and archived_at is null and expires_on<t));
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
  update private.notification_jobs set status='cancelled',updated_at=now() where status in ('pending','retry') and not exists(select 1 from private.current_dates d where d.occurrence_id=notification_jobs.occurrence_id);
  update private.notification_jobs j set status='cancelled',updated_at=now()
    from private.current_dates w,public.profiles p,public.items r
    where j.date_id=w.id and w.user_id=p.id and r.id=w.purchase_id and j.status in ('pending','retry')
    and (not private.covered(w.item_id) or not w.reminders_enabled or not p.email_reminders_enabled or p.email_delivery_blocked or p.deletion_requested_at is not null
      or r.state<>'saved' or r.archived_at is not null or w.id is null or w.archived_at is not null or w.state<>'saved' or w.occurrence_id<>j.occurrence_id or not exists(select 1 from public.reminder_offsets r0 where r0.date_id=w.id and r0.value=j.offset_value and r0.unit=j.offset_unit) or w.expires_on<>j.expiration_date or w.occurrence_id<>j.occurrence_id or not exists(select 1 from public.reminder_offsets r0 where r0.date_id=w.id and r0.value=j.offset_value and r0.unit=j.offset_unit));
  update private.notification_jobs j set status='skipped',updated_at=now()
    from private.current_dates w,public.profiles p where j.date_id=w.id and w.user_id=p.id
    and j.status in ('pending','retry') and w.expires_on<(now() at time zone p.timezone)::date;
  update private.notification_jobs j set status='skipped',updated_at=now()
    where j.status='pending' and j.scheduled_at<=now() and exists(
      select 1 from private.notification_jobs newer where newer.date_id=j.date_id and newer.occurrence_id=j.occurrence_id
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
      'offset_value',c.offset_value,'attempts',c.attempts,'payload',c.frozen_payload,'product_name',r.product_name,
      'purchase_id',r.id,'kind',w.label,'email',a.email)), '[]'::jsonb) into result
    from claimed c join private.current_dates w on w.id=c.date_id join public.items r on r.id=w.purchase_id join auth.users a on a.id=w.user_id;
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
  if not private.covered(w.item_id) or not w.reminders_enabled or not p.email_reminders_enabled or p.email_delivery_blocked or p.deletion_requested_at is not null
    or w.id is null or w.archived_at is not null or w.state<>'saved' or w.occurrence_id<>j.occurrence_id or not exists(select 1 from public.reminder_offsets r0 where r0.date_id=w.id and r0.value=j.offset_value and r0.unit=j.offset_unit) or w.expires_on<>j.expiration_date or w.expires_on<(now() at time zone p.timezone)::date or email is null
    or (j.frozen_payload is not null and j.frozen_payload->>'to'<>email)
  then update private.notification_jobs set status='cancelled',updated_at=now() where id=p_id; return null; end if;
  if p_payload->>'to'<>email then raise exception 'INVALID_INPUT'; end if;
  update private.notification_jobs set frozen_payload=coalesce(frozen_payload,p_payload) where id=p_id returning frozen_payload into p_payload;
  return p_payload;
end $$;
create or replace function public.reminder_preview(p_item_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); result jsonb;
begin
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into result from (
 select d.id as date_id,(min(j.scheduled_at) at time zone p.timezone)::date as next_scheduled_on from private.current_dates d
 join private.notification_jobs j on j.occurrence_id=d.occurrence_id
 join public.profiles p on p.id=d.user_id
 where d.user_id=u and d.item_id=p_item_id and d.archived_at is null and d.reminders_enabled and private.covered(d.item_id)
 and p.email_reminders_enabled and not p.email_delivery_blocked
 and j.status in ('pending','retry','sending') group by d.id,p.timezone
 ) r; return result;
end $$;
-- Bounded owner-scoped list. Search and filters execute before keyset pagination.
create function private.item_json(i public.items) returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(i)||jsonb_build_object('coverage',case when private.covered(i.id) then 'covered' when i.coverage_requested_at is not null then 'paused_capacity' else 'off' end,
 'documents','[]'::jsonb,'dates',coalesce((select jsonb_agg(to_jsonb(d)||jsonb_build_object(
 'occurrences',coalesce((select jsonb_agg(to_jsonb(o)) from public.date_occurrences o where o.date_id=d.id and o.status='open'),'[]'::jsonb),
 'offsets',coalesce((select jsonb_agg(jsonb_build_object('unit',r.unit,'value',r.value)) from public.reminder_offsets r where r.date_id=d.id),'[]'::jsonb)))
 from public.important_dates d where d.item_id=i.id),'[]'::jsonb))
$$;
create function public.list_items(p_filter text default 'all',p_query text default '',p_template text default 'all',p_cursor timestamptz default null,p_cursor_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); t date; result jsonb;
begin
 perform private.trim_reminders(u);
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 select coalesce(jsonb_agg(private.item_json(i) order by i.created_at desc,i.id desc),'[]'::jsonb) into result from (
 select i.* from public.items i where i.user_id=u
 and (p_template='all' or i.template_key=p_template)
 and (p_query='' or i.product_name ilike '%'||left(p_query,160)||'%' or i.template_key ilike '%'||left(p_query,160)||'%' or exists(select 1 from private.current_dates d where d.item_id=i.id and (d.label ilike '%'||left(p_query,160)||'%' or d.expires_on::text=left(p_query,160))))
 and (p_cursor is null or (i.created_at,i.id)<(p_cursor,p_cursor_id))
 and case p_filter when 'archived' then i.archived_at is not null when 'drafts' then i.state='draft'
 else i.state='saved' and i.archived_at is null and
 case p_filter when 'reminders' then private.covered(i.id) when 'uncovered' then not private.covered(i.id)
 when 'upcoming' then exists(select 1 from private.current_dates d where d.item_id=i.id and d.expires_on between t and t+30)
 when 'overdue' then exists(select 1 from private.current_dates d where d.item_id=i.id and d.expires_on<t)
 when 'dates' then exists(select 1 from private.current_dates d where d.item_id=i.id) else true end end
 order by i.created_at desc,i.id desc limit 25) i;
 return result;
end $$;
create function public.dashboard_items() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); t date; result jsonb;
begin
 perform private.trim_reminders(u);
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 select coalesce(jsonb_agg(private.item_json(i)),'[]'::jsonb) into result from public.items i where i.user_id=u and i.id in (
 (select id from public.items where user_id=u and state='saved' and archived_at is null order by created_at desc,id desc limit 6)
 union (select item_id from private.current_dates where user_id=u and state='saved' and archived_at is null and expires_on>=t order by expires_on,id limit 5));
 return result;
end $$;
revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function private.active_account() to authenticated;
revoke execute on function public.set_item_coverage(uuid,integer,boolean,uuid,integer),public.list_items(text,text,text,timestamptz,uuid),public.dashboard_items() from public,anon;
grant execute on function public.set_item_coverage(uuid,integer,boolean,uuid,integer),public.list_items(text,text,text,timestamptz,uuid),public.dashboard_items() to authenticated;
create function public.item_coverage(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); i public.items;
begin
 perform private.trim_reminders(u);
 select * into i from public.items where id=p_id and user_id=u;
 if not found then raise exception 'NOT_FOUND'; end if;
 return jsonb_build_object('coverage',case when private.covered(i.id) then 'covered' when i.coverage_requested_at is not null then 'paused_capacity' else 'off' end);
end $$;
revoke execute on function public.item_coverage(uuid) from public,anon;
grant execute on function public.item_coverage(uuid) to authenticated;
commit;
