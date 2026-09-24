-- Keeply's dedicated application schema. Identity is owned by Supabase Auth.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'Asia/Manila',
  email_reminders_enabled boolean not null default true,
  email_delivery_blocked boolean not null default false,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.account_entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  premium_until timestamptz, updated_at timestamptz not null default now()
);
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  state text not null default 'draft' check (state in ('draft','saved')),
  product_name text check (char_length(product_name) between 1 and 160),
  purchased_on date, merchant text check (char_length(merchant) <= 160),
  price_minor bigint check (price_minor between 0 and 999999999999),
  currency text not null default 'PHP' check (currency = 'PHP'),
  category text check (category in ('electronics','appliances','home','clothing','other')),
  notes text check (char_length(notes) <= 5000),
  revision integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,user_id), check (state <> 'saved' or nullif(btrim(product_name),'') is not null)
);
create index purchases_recent_idx on public.purchases(user_id,state,created_at desc,id);
create index purchases_date_idx on public.purchases(user_id,purchased_on,id);
create index purchases_category_idx on public.purchases(user_id,category);
create table public.warranties (
  id uuid primary key default gen_random_uuid(), purchase_id uuid not null unique,
  user_id uuid not null, starts_on date, expires_on date not null,
  serial_number text check (char_length(serial_number) <= 160),
  notes text check (char_length(notes) <= 5000),
  reminders_enabled boolean not null default false,
  reminders_enabled_at timestamptz,
  reminder_disabled_reason text check (reminder_disabled_reason in ('user','plan_limit')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (purchase_id,user_id) references public.purchases(id,user_id) on delete cascade,
  check (starts_on is null or expires_on >= starts_on)
);
create index warranties_owner_expiry_idx on public.warranties(user_id,expires_on);
create index warranties_due_idx on public.warranties(expires_on,id) where reminders_enabled;
create table private.rate_limit_buckets (
  user_id uuid not null, action text not null, window_start timestamptz not null, count integer not null,
  primary key(user_id,action,window_start)
);

create function private.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,display_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),160));
  insert into public.account_entitlements(user_id) values(new.id);
  return new;
end $$;
create trigger keeply_new_user after insert on auth.users for each row execute function private.create_profile();

create function private.active_account() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and deletion_requested_at is null)
$$;
create function private.require_user() returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  perform 1 from public.profiles where id=u and deletion_requested_at is null for update;
  if not found then raise exception 'ACCOUNT_UNAVAILABLE'; end if;
  return u;
end $$;
create function private.is_premium(u uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select premium_until > now() from public.account_entitlements where user_id=u),false)
$$;
create function private.rate_limit(u uuid, a text, max_count integer, seconds integer default 60) returns void language plpgsql security definer set search_path = '' as $$
declare n integer; w timestamptz := to_timestamp(floor(extract(epoch from now())/seconds)*seconds);
begin
  insert into private.rate_limit_buckets(user_id,action,window_start,count) values(u,a,w,1)
  on conflict(user_id,action,window_start) do update set count=private.rate_limit_buckets.count+1 returning count into n;
  if n>max_count then raise exception 'RATE_LIMITED'; end if;
end $$;

alter table public.profiles enable row level security;
alter table public.account_entitlements enable row level security;
alter table public.purchases enable row level security;
alter table public.warranties enable row level security;
create policy own_profile on public.profiles for select to authenticated using(id=(select auth.uid()) and deletion_requested_at is null);
create policy own_entitlement on public.account_entitlements for select to authenticated using(user_id=(select auth.uid()) and (select private.active_account()));
create policy own_purchase on public.purchases for select to authenticated using(user_id=(select auth.uid()) and (select private.active_account()));
create policy own_warranty on public.warranties for select to authenticated using(user_id=(select auth.uid()) and (select private.active_account()));
revoke all on public.profiles,public.account_entitlements,public.purchases,public.warranties from anon,authenticated;
grant select on public.profiles,public.account_entitlements,public.purchases,public.warranties to authenticated;
grant all on public.profiles,public.account_entitlements,public.purchases,public.warranties to service_role;

-- All application writes go through small owner-scoped RPCs. No direct DML grants.
create function public.create_purchase_draft(p_id uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := private.require_user(); lim integer := case when private.is_premium(u) then 1000 else 10 end;
begin
  if exists(select 1 from public.purchases where id=p_id and user_id=u) then return p_id; end if;
  perform private.rate_limit(u,'draft',10);
  if (select count(*) from public.purchases where user_id=u and state='draft')>=3 then raise exception 'DRAFT_LIMIT'; end if;
  if (select count(*) from public.purchases where user_id=u and state='saved')>=lim then raise exception 'PURCHASE_LIMIT'; end if;
  insert into public.purchases(id,user_id) values(p_id,u);
  return p_id;
end $$;

create function public.save_purchase(p_id uuid,p_revision integer,p_data jsonb,p_warranty jsonb default null) returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := private.require_user(); old public.purchases; lim integer := case when private.is_premium(u) then 1000 else 10 end;
  remind boolean := coalesce((p_warranty->>'reminders_enabled')::boolean,false); today date;
begin
  perform private.rate_limit(u,'write',30);
  select * into old from public.purchases where id=p_id and user_id=u for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if old.revision<>p_revision then raise exception 'CONFLICT'; end if;
  if old.state='draft' and (select count(*) from public.purchases where user_id=u and state='saved')>=lim then raise exception 'PURCHASE_LIMIT'; end if;
  select (now() at time zone timezone)::date into today from public.profiles where id=u;
  if p_warranty is not null and remind and (p_warranty->>'expires_on')::date>=today and not private.is_premium(u)
    and (select count(*) from public.warranties where user_id=u and purchase_id<>p_id and reminders_enabled and expires_on>=today)>=3
  then raise exception 'REMINDER_LIMIT'; end if;
  update public.purchases set state='saved', product_name=nullif(btrim(p_data->>'product_name'),''),
    purchased_on=nullif(p_data->>'purchased_on','')::date, merchant=nullif(btrim(p_data->>'merchant'),''),
    price_minor=nullif(p_data->>'price_minor','')::bigint, category=nullif(p_data->>'category',''),
    notes=nullif(p_data->>'notes',''),revision=revision+1,updated_at=now() where id=p_id and user_id=u;
  if p_warranty is null then delete from public.warranties where purchase_id=p_id and user_id=u;
  else
    insert into public.warranties(purchase_id,user_id,starts_on,expires_on,serial_number,notes,reminders_enabled,reminders_enabled_at)
    values(p_id,u,nullif(p_warranty->>'starts_on','')::date,(p_warranty->>'expires_on')::date,
      nullif(p_warranty->>'serial_number',''),nullif(p_warranty->>'notes',''),remind,case when remind then now() end)
    on conflict(purchase_id) do update set starts_on=excluded.starts_on,expires_on=excluded.expires_on,
      serial_number=excluded.serial_number,notes=excluded.notes,reminders_enabled=excluded.reminders_enabled,
      reminders_enabled_at=case when excluded.reminders_enabled and not public.warranties.reminders_enabled then now() else public.warranties.reminders_enabled_at end,
      reminder_disabled_reason=case when excluded.reminders_enabled then null else 'user' end,updated_at=now();
  end if;
  return p_id;
end $$;

create function public.delete_purchase(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := private.require_user();
begin
  perform private.rate_limit(u,'write',30);
  delete from public.purchases where id=p_id and user_id=u;
  if not found then raise exception 'NOT_FOUND'; end if;
end $$;
create function public.update_preferences(p_name text,p_timezone text,p_email_enabled boolean) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := private.require_user();
begin
  perform private.rate_limit(u,'write',30);
  if char_length(p_name)>160 or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then raise exception 'INVALID_INPUT'; end if;
  update public.profiles set display_name=btrim(p_name),timezone=p_timezone,email_reminders_enabled=p_email_enabled,updated_at=now() where id=u;
end $$;

revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function private.active_account() to authenticated;
revoke execute on function public.create_purchase_draft(uuid), public.save_purchase(uuid,integer,jsonb,jsonb),public.delete_purchase(uuid),public.update_preferences(text,text,boolean) from public,anon;
grant execute on function public.create_purchase_draft(uuid), public.save_purchase(uuid,integer,jsonb,jsonb),public.delete_purchase(uuid),public.update_preferences(text,text,boolean) to authenticated;
