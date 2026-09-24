-- Atomic cutover. Pause notification cron before applying and deploy matching code.
-- UUIDs and storage keys are preserved. Compatibility views contain no second copy.
alter table public.purchases rename to items;
alter table public.items add column template_key text not null default 'receipt' check(template_key in ('receipt','car','motorcycle','licence','passport','aircon','other'));
alter table public.items add column template_version integer not null default 1 check(template_version=1);
alter table public.items add column archived_at timestamptz;
create index items_template_idx on public.items(user_id,template_key,state);
-- Explicit owner filters also protect views on PostgreSQL 14 (before security_invoker views).
create view public.purchases with (security_barrier=true) as select id,user_id,state,product_name,purchased_on,merchant,price_minor,currency,category,notes,revision,created_at,updated_at from public.items where template_key='receipt' and user_id=auth.uid() and private.active_account();
grant select on public.purchases to authenticated;

create table public.important_dates (
  id uuid primary key default gen_random_uuid(), item_id uuid not null, user_id uuid not null,
  kind text not null check(kind in ('warranty','registration','insurance','service','expiration','other')),
  label text not null check(char_length(label) between 1 and 160),
  starts_on date, serial_number text check(char_length(serial_number)<=160), notes text check(char_length(notes)<=5000),
  reminders_enabled boolean not null default false, reminders_enabled_at timestamptz,
  reminder_disabled_reason text check(reminder_disabled_reason in ('user','plan_limit')),
  interval_months integer check(interval_months between 1 and 120),
  revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,user_id), foreign key(item_id,user_id) references public.items(id,user_id) on delete cascade
);
create index important_dates_owner_idx on public.important_dates(user_id,item_id);
create unique index one_purchase_warranty on public.important_dates(item_id) where kind='warranty';
create table public.date_occurrences (
  id uuid primary key default gen_random_uuid(), date_id uuid not null, user_id uuid not null,
  cycle integer not null check(cycle>0), due_on date not null,
  status text not null default 'open' check(status in ('open','completed','superseded')),
  completed_on date, created_at timestamptz not null default now(),
  unique(date_id,cycle), unique(id,date_id),
  foreign key(date_id,user_id) references public.important_dates(id,user_id) on delete cascade,
  check((status='completed')=(completed_on is not null))
);
create unique index one_open_occurrence on public.date_occurrences(date_id) where status='open';
create index occurrences_due_idx on public.date_occurrences(user_id,status,due_on);
create table public.reminder_offsets (
  date_id uuid not null references public.important_dates(id) on delete cascade,
  unit text not null check(unit in ('days','months')), value integer not null,
  primary key(date_id,unit,value), check((unit='days' and value between 0 and 365) or (unit='months' and value between 1 and 24))
);
insert into public.important_dates(id,item_id,user_id,kind,label,starts_on,serial_number,notes,reminders_enabled,reminders_enabled_at,reminder_disabled_reason,created_at,updated_at)
 select id,purchase_id,user_id,'warranty','Warranty',starts_on,serial_number,notes,reminders_enabled,reminders_enabled_at,reminder_disabled_reason,created_at,updated_at from public.warranties;
insert into public.date_occurrences(date_id,user_id,cycle,due_on)
 select id,user_id,1,expires_on from public.warranties;
-- Retain past send identities as superseded occurrences, including accepted jobs.
insert into public.date_occurrences(date_id,user_id,cycle,due_on,status)
 select j.warranty_id,w.user_id,1+row_number() over(partition by j.warranty_id order by j.expiration_date),j.expiration_date,'superseded'
 from (select distinct warranty_id,expiration_date from private.notification_jobs) j join public.warranties w on w.id=j.warranty_id where j.expiration_date<>w.expires_on;
insert into public.reminder_offsets select id,'days',v from public.important_dates cross join unnest(array[30,7,1]) v;
alter table private.notification_jobs drop constraint notification_jobs_warranty_id_fkey;
alter table private.notification_jobs drop constraint notification_jobs_warranty_id_expiration_date_offset_days_key;
alter table private.notification_jobs drop constraint notification_jobs_offset_days_check;
alter table private.notification_jobs rename column warranty_id to date_id;
alter table private.notification_jobs rename column offset_days to offset_value;
alter table private.notification_jobs add column offset_unit text not null default 'days';
alter table private.notification_jobs add column occurrence_id uuid;
update private.notification_jobs j set occurrence_id=o.id from public.date_occurrences o where o.date_id=j.date_id and o.due_on=j.expiration_date;
alter table private.notification_jobs alter column occurrence_id set not null;
alter table private.notification_jobs add foreign key(occurrence_id,date_id) references public.date_occurrences(id,date_id) on delete cascade;
alter table private.notification_jobs add unique(occurrence_id,offset_unit,offset_value);
drop trigger warranty_schedule on public.warranties;
drop function private.schedule_warranty();
drop table public.warranties;
create view public.warranties with (security_barrier=true) as
 select d.id,d.item_id as purchase_id,d.user_id,d.starts_on,o.due_on as expires_on,d.serial_number,d.notes,d.reminders_enabled,d.reminders_enabled_at,d.reminder_disabled_reason,d.created_at,d.updated_at
 from public.important_dates d join public.date_occurrences o on o.date_id=d.id and o.status='open'
 where d.kind='warranty' and d.user_id=auth.uid() and private.active_account();
grant select on public.warranties to authenticated;
create view private.current_dates as
 select d.*,d.item_id as purchase_id,o.id as occurrence_id,o.due_on as expires_on,i.product_name,i.state,i.archived_at
 from public.important_dates d join public.date_occurrences o on o.date_id=d.id and o.status='open' join public.items i on i.id=d.item_id;

alter table public.important_dates enable row level security;
alter table public.date_occurrences enable row level security;
alter table public.reminder_offsets enable row level security;
create policy own_dates on public.important_dates for select to authenticated using(user_id=auth.uid() and private.active_account());
create policy own_occurrences on public.date_occurrences for select to authenticated using(user_id=auth.uid() and private.active_account());
create policy own_offsets on public.reminder_offsets for select to authenticated using(exists(select 1 from public.important_dates d where d.id=date_id and d.user_id=auth.uid()) and private.active_account());
revoke all on public.important_dates,public.date_occurrences,public.reminder_offsets from public,anon,authenticated;
grant select on public.important_dates,public.date_occurrences,public.reminder_offsets to authenticated;
grant all on public.important_dates,public.date_occurrences,public.reminder_offsets to service_role;

create function private.schedule_date(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare d private.current_dates; p public.profiles; r record; target date; at_time timestamptz;
begin
 select * into d from private.current_dates where id=p_id;
 update private.notification_jobs set status='cancelled',updated_at=now() where date_id=p_id and status in ('pending','retry') and (d.id is null or occurrence_id<>d.occurrence_id);
 if d.id is null then return; end if;
 select * into p from public.profiles where id=d.user_id;
 update private.notification_jobs j set status='cancelled',updated_at=now() where j.date_id=p_id and j.status in ('pending','retry') and
 (not d.reminders_enabled or not p.email_reminders_enabled or p.email_delivery_blocked or p.deletion_requested_at is not null or d.archived_at is not null or d.state<>'saved'
 or not exists(select 1 from public.reminder_offsets ro where ro.date_id=p_id and ro.unit=j.offset_unit and ro.value=j.offset_value));
 if not d.reminders_enabled or not p.email_reminders_enabled or p.email_delivery_blocked or p.deletion_requested_at is not null or d.archived_at is not null or d.state<>'saved' then return; end if;
 for r in select * from public.reminder_offsets where date_id=p_id loop
   target := case when r.unit='months' then (d.expires_on-make_interval(months=>r.value))::date else d.expires_on-r.value end;
   at_time := (target+time '09:00') at time zone p.timezone;
   if target>=greatest((now() at time zone p.timezone)::date,(coalesce(d.reminders_enabled_at,now()) at time zone p.timezone)::date) then
     insert into private.notification_jobs(date_id,occurrence_id,expiration_date,offset_value,offset_unit,scheduled_at,next_attempt_at)
     values(d.id,d.occurrence_id,d.expires_on,r.value,r.unit,at_time,at_time)
     on conflict(occurrence_id,offset_unit,offset_value) do update set scheduled_at=excluded.scheduled_at,next_attempt_at=excluded.next_attempt_at,status='pending',updated_at=now()
       where private.notification_jobs.status in ('pending','cancelled') and private.notification_jobs.first_attempt_at is null;
   end if;
 end loop;
end $$;
create or replace function private.reschedule_preferences() returns trigger language plpgsql security definer set search_path='' as $$
declare d record;
begin
 if new.timezone is distinct from old.timezone or new.email_reminders_enabled is distinct from old.email_reminders_enabled or new.email_delivery_blocked is distinct from old.email_delivery_blocked then
 for d in select id from public.important_dates where user_id=new.id loop perform private.schedule_date(d.id); end loop;
 end if; return new;
end $$;
create or replace function private.trim_reminders(u uuid) returns void language plpgsql security definer set search_path='' as $$
declare d record; t date;
begin
 perform 1 from public.profiles where id=u for update;
 if private.is_premium(u) then return; end if;
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 for d in select id from private.current_dates where user_id=u and reminders_enabled and archived_at is null and expires_on>=t order by expires_on,id offset 3 loop
 update public.important_dates set reminders_enabled=false,reminder_disabled_reason='plan_limit' where id=d.id;
 perform private.schedule_date(d.id);
 end loop;
end $$;
create function private.check_reminder_limit(u uuid) returns void language plpgsql security definer set search_path='' as $$
declare n integer; t date;
begin
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 select count(*) into n from private.current_dates where user_id=u and reminders_enabled and archived_at is null and expires_on>=t;
 if n>(case when private.is_premium(u) then 1000 else 3 end) then raise exception 'REMINDER_LIMIT'; end if;
end $$;

create function public.create_item_draft(p_id uuid,p_template text) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();
begin
 if p_template not in ('receipt','car','motorcycle','licence','passport','aircon','other') then raise exception 'INVALID_INPUT'; end if;
 if exists(select 1 from public.items where id=p_id and user_id=u and template_key=p_template) then return p_id; end if;
 perform private.rate_limit(u,'draft',10);
 if (select count(*) from public.items where user_id=u and state='draft')>=3 then raise exception 'DRAFT_LIMIT'; end if;
 if (select count(*) from public.items where user_id=u and state='saved')>=(case when private.is_premium(u) then 1000 else 10 end) then raise exception 'PURCHASE_LIMIT'; end if;
 insert into public.items(id,user_id,template_key) values(p_id,u,p_template); return p_id;
end $$;
create or replace function public.create_purchase_draft(p_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
begin return public.create_item_draft(p_id,'receipt'); end $$;

create function public.save_item(p_id uuid,p_revision integer,p_label text,p_notes text) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); old public.items;
begin
 perform private.rate_limit(u,'write',30);
 select * into old from public.items where id=p_id and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if old.revision<>p_revision then raise exception 'CONFLICT'; end if;
 if nullif(btrim(p_label),'') is null then raise exception 'INVALID_INPUT'; end if;
 if old.state='draft' and (select count(*) from public.items where user_id=u and state='saved')>=(case when private.is_premium(u) then 1000 else 10 end) then raise exception 'PURCHASE_LIMIT'; end if;
 update public.items set product_name=btrim(p_label),notes=nullif(p_notes,''),state='saved',revision=revision+1,updated_at=now() where id=p_id;
 return p_id;
end $$;

create function public.save_important_date(p_id uuid,p_item_id uuid,p_revision integer,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
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
 perform private.check_reminder_limit(u); perform private.schedule_date(p_id); return p_id;
end $$;

create function public.complete_date(p_id uuid,p_revision integer,p_completed date,p_next date) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); d public.important_dates; o public.date_occurrences; t date;
begin
 perform private.rate_limit(u,'write',30);
 select * into d from public.important_dates where id=p_id and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if d.revision<>p_revision then raise exception 'CONFLICT'; end if;
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 if p_completed is null or p_completed>t or p_completed<date '1900-01-01' or (p_next is not null and (p_next<=p_completed or p_next>date '2200-12-31')) then raise exception 'INVALID_INPUT'; end if;
 select * into o from public.date_occurrences where date_id=p_id and status='open';
 if not found then raise exception 'CONFLICT'; end if;
 update public.date_occurrences set status='completed',completed_on=p_completed where id=o.id;
 if p_next is not null then insert into public.date_occurrences(date_id,user_id,cycle,due_on) values(p_id,u,(select max(cycle)+1 from public.date_occurrences where date_id=p_id),p_next); end if;
 update public.important_dates set revision=revision+1,updated_at=now() where id=p_id;
 perform private.check_reminder_limit(u); perform private.schedule_date(p_id);
end $$;
create function public.archive_item(p_id uuid,p_revision integer,p_archive boolean) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); d record;
begin
 update public.items set archived_at=case when p_archive then now() end,revision=revision+1 where id=p_id and user_id=u and revision=p_revision;
 if not found then raise exception 'CONFLICT'; end if;
 perform private.check_reminder_limit(u);
 for d in select id from public.important_dates where item_id=p_id loop perform private.schedule_date(d.id); end loop;
end $$;
create function public.delete_item(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();
begin
 perform private.rate_limit(u,'write',30);
 delete from public.items where id=p_id and user_id=u;
 if not found then raise exception 'NOT_FOUND'; end if;
end $$;
create or replace function public.delete_purchase(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform public.delete_item(p_id); end $$;
create or replace function public.save_purchase(p_id uuid,p_revision integer,p_data jsonb,p_warranty jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); d public.important_dates;
begin
 if not exists(select 1 from public.items where id=p_id and user_id=u and template_key='receipt') then raise exception 'NOT_FOUND'; end if;
 perform public.save_item(p_id,p_revision,p_data->>'product_name',p_data->>'notes');
 update public.items set purchased_on=nullif(p_data->>'purchased_on','')::date,merchant=nullif(p_data->>'merchant',''),price_minor=nullif(p_data->>'price_minor','')::bigint,category=nullif(p_data->>'category','') where id=p_id;
 select * into d from public.important_dates where item_id=p_id and kind='warranty';
 if p_warranty is null then
   delete from public.important_dates where id=d.id;
 else
   perform public.save_important_date(coalesce(d.id,gen_random_uuid()),p_id,coalesce(d.revision,0),p_warranty||jsonb_build_object('kind','warranty','label','Warranty','due_on',p_warranty->>'expires_on','offsets',coalesce(p_warranty->'offsets',(select jsonb_agg(jsonb_build_object('unit',unit,'value',value)) from public.reminder_offsets where date_id=d.id),'[{"unit":"days","value":30},{"unit":"days","value":7},{"unit":"days","value":1}]'::jsonb)));
 end if; return p_id;
end $$;

-- Document parent column name and object keys stay stable for upload compatibility.
alter table public.documents drop constraint documents_kind_check;
alter table public.documents add check(kind in ('receipt','warranty','vehicle','service'));

create or replace function public.reserve_document(p_id uuid,p_purchase_id uuid,p_kind text,p_name text,p_bytes bigint) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := private.require_user(); d public.documents; lim bigint := case when private.is_premium(u) then 2147483648 else 104857600 end; k text;
begin
  if not exists(select 1 from public.items where id=p_purchase_id and user_id=u) then raise exception 'NOT_FOUND'; end if;
  if exists(select 1 from public.items where id=p_purchase_id and template_key in ('licence','passport','other')) then raise exception 'DOCUMENTS_NOT_ALLOWED'; end if;
  perform private.rate_limit(u,'upload',10);
  select * into d from public.documents where id=p_id and user_id=u and purchase_id=p_purchase_id;
  if found then
    if d.upload_expires_at<now() then raise exception 'UPLOAD_EXPIRED'; end if;
    if d.state='pending' then
      -- Every issued signed upload URL is valid for two hours from issuance.
      update public.documents set upload_expires_at=now()+interval '2 hours' where id=d.id returning * into d;
    end if;
    return to_jsonb(d);
  end if;
  if p_bytes<1 or p_bytes>10485760 then raise exception 'FILE_TOO_LARGE'; end if;
  if (select count(*) from public.documents where purchase_id=p_purchase_id)>=6 then raise exception 'FILE_COUNT_LIMIT'; end if;
  if coalesce((select sum(case when state='ready' then size_bytes else reserved_bytes end) from public.documents where user_id=u),0)+p_bytes>lim then raise exception 'STORAGE_LIMIT'; end if;
  k := u::text||'/'||p_purchase_id::text||'/'||p_id::text;
  insert into public.documents(id,purchase_id,user_id,kind,staging_key,object_key,original_name,reserved_bytes)
    values(p_id,p_purchase_id,u,p_kind,k||'/original',k||'/validated',left(p_name,255),p_bytes) returning * into d;
  return to_jsonb(d);
end $$;

create or replace function public.account_usage() returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := private.require_user(); t date;
begin
  select (now() at time zone timezone)::date into t from public.profiles where id=u;
  return jsonb_build_object(
    'purchases',(select count(*) from public.items where user_id=u and state='saved'),
    'reminders',(select count(*) from private.current_dates where user_id=u and reminders_enabled and archived_at is null and expires_on>=t),
    'storage_bytes',coalesce((select sum(case when state='ready' then size_bytes else reserved_bytes end) from public.documents where user_id=u),0),
    'premium',private.is_premium(u),
    'premium_until',(select premium_until from public.account_entitlements where user_id=u)
  );
end $$;

create or replace function public.request_account_deletion() returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := private.require_user(); last_login timestamptz;
begin
  select last_sign_in_at into last_login from auth.users where id=u;
  if last_login is null or last_login<now()-interval '10 minutes' then raise exception 'REAUTH_REQUIRED'; end if;
  update public.profiles set deletion_requested_at=now(),email_reminders_enabled=false where id=u;
  insert into private.account_deletions(user_id) values(u) on conflict do nothing;
  delete from public.documents where user_id=u;
  delete from public.items where user_id=u;
end $$;
create or replace function public.run_maintenance() returns jsonb language plpgsql security definer set search_path = '' as $$
declare objects jsonb; accounts jsonb; reviews integer;
begin
  delete from public.items where state='draft' and updated_at<now()-interval '24 hours';
  delete from public.documents where state='pending' and upload_expires_at<now();
  delete from private.rate_limit_buckets where window_start<now()-interval '2 days';
  delete from private.email_daily_quota where day<current_date-35;
  delete from private.email_events where created_at<now()-interval '35 days';
  update private.notification_jobs set frozen_payload=null where updated_at<now()-interval '2 days' and status not in ('sending','retry');
  update private.billing_orders set status='expired' where status='pending' and created_at<now()-interval '24 hours';
  select coalesce(jsonb_agg(to_jsonb(d)),'[]'::jsonb) into objects from (
    select id,bucket,object_key from private.object_deletions where next_attempt_at<=now() and not_before<=now() order by next_attempt_at limit 50
  ) d;
  select coalesce(jsonb_agg(a.user_id),'[]'::jsonb) into accounts from (select a.user_id from private.account_deletions a
    where completed_at is null and not exists(select 1 from private.object_deletions d where d.object_key like a.user_id::text||'/%')
    and not exists(select 1 from storage.objects s where s.name like a.user_id::text||'/%') limit 10) a;
  select count(*)::integer into reviews from private.billing_events where status='needs_review';
  return jsonb_build_object('objects',objects,'accounts',accounts,'billing_reviews',reviews,
    'unknown_notifications',(select count(*) from private.notification_jobs where status='unknown'));
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
    and (not w.reminders_enabled or not p.email_reminders_enabled or p.email_delivery_blocked or p.deletion_requested_at is not null
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
  if not w.reminders_enabled or not p.email_reminders_enabled or p.email_delivery_blocked or p.deletion_requested_at is not null
    or w.id is null or w.archived_at is not null or w.state<>'saved' or w.occurrence_id<>j.occurrence_id or not exists(select 1 from public.reminder_offsets r0 where r0.date_id=w.id and r0.value=j.offset_value and r0.unit=j.offset_unit) or w.expires_on<>j.expiration_date or w.expires_on<(now() at time zone p.timezone)::date or email is null
    or (j.frozen_payload is not null and j.frozen_payload->>'to'<>email)
  then update private.notification_jobs set status='cancelled',updated_at=now() where id=p_id; return null; end if;
  if p_payload->>'to'<>email then raise exception 'INVALID_INPUT'; end if;
  update private.notification_jobs set frozen_payload=coalesce(frozen_payload,p_payload) where id=p_id returning frozen_payload into p_payload;
  return p_payload;
end $$;
create or replace function public.finish_notification(p_id uuid,p_lease uuid,p_status text,p_provider_id text,p_error text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('accepted','retry','failed','unknown') then raise exception 'INVALID_INPUT'; end if;
  perform 1 from public.profiles where id in (
    select w.user_id from public.important_dates w join private.notification_jobs j on j.date_id=w.id where j.id=p_id
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
create or replace function public.record_email_event(p_id text,p_type text) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.profiles where id in (
    select w.user_id from public.important_dates w join private.notification_jobs j on j.date_id=w.id where j.provider_email_id=p_id
  ) for update;
  -- Persist early delivery events: a webhook can beat the send acknowledgment.
  insert into private.email_events(provider_id,event_type) values(p_id,p_type) on conflict do nothing;
  if p_type='email.delivered' then update private.notification_jobs set delivered_at=now(),status='delivered' where provider_email_id=p_id and status='accepted';
  elsif p_type in ('email.bounced','email.complained') then
    update private.notification_jobs set status='failed',last_error_code=p_type where provider_email_id=p_id;
    update public.profiles set email_delivery_blocked=true where id in (
      select w.user_id from public.important_dates w join private.notification_jobs j on j.date_id=w.id where j.provider_email_id=p_id
    );
  end if;
end $$;

revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function private.active_account() to authenticated;
revoke execute on function public.create_item_draft(uuid,text),public.save_item(uuid,integer,text,text),public.save_important_date(uuid,uuid,integer,jsonb),public.complete_date(uuid,integer,date,date),public.archive_item(uuid,integer,boolean),public.delete_item(uuid) from public,anon;
grant execute on function public.create_item_draft(uuid,text),public.save_item(uuid,integer,text,text),public.save_important_date(uuid,uuid,integer,jsonb),public.complete_date(uuid,integer,date,date),public.archive_item(uuid,integer,boolean),public.delete_item(uuid) to authenticated;
-- Reschedule only untouched jobs. Existing IDs, payloads and terminal outcomes survive.
do $$ declare d record; begin for d in select id from public.important_dates loop perform private.schedule_date(d.id); end loop; end $$;
create function public.save_item_with_date(p_id uuid,p_revision integer,p_label text,p_notes text,p_date jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); i public.items;
begin
 select * into i from public.items where id=p_id and user_id=u;
 if not found then raise exception 'NOT_FOUND'; end if;
 if i.state='draft' and i.template_key in ('licence','passport','aircon','other') and p_date is null then raise exception 'DATE_REQUIRED'; end if;
 perform public.save_item(p_id,p_revision,p_label,p_notes);
 if p_date is not null then perform public.save_important_date(gen_random_uuid(),p_id,0,p_date); end if;
 return p_id;
end $$;
revoke execute on function public.save_item_with_date(uuid,integer,text,text,jsonb) from public,anon;
grant execute on function public.save_item_with_date(uuid,integer,text,text,jsonb) to authenticated;
create function public.reminder_preview(p_item_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); result jsonb;
begin
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into result from (
 select d.id as date_id,(min(j.scheduled_at) at time zone p.timezone)::date as next_scheduled_on from private.current_dates d
 join private.notification_jobs j on j.occurrence_id=d.occurrence_id
 join public.profiles p on p.id=d.user_id
 where d.user_id=u and d.item_id=p_item_id and d.archived_at is null and d.reminders_enabled
 and p.email_reminders_enabled and not p.email_delivery_blocked
 and j.status in ('pending','retry','sending') group by d.id,p.timezone
 ) r; return result;
end $$;
revoke execute on function public.reminder_preview(uuid) from public,anon;
grant execute on function public.reminder_preview(uuid) to authenticated;
