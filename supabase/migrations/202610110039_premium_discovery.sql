-- Optional, account-scoped product measurement. No household content is collected.
begin;
create table private.premium_experiment_assignments (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 variant text not null check(variant in ('control','contextual')),
 assigned_at timestamptz not null default now()
);
create table private.premium_events (
 id uuid primary key,user_id uuid not null references public.profiles(id) on delete cascade,
 event text not null check(event in ('premium_preview_viewed','premium_details_opened','premium_sample_opened','installation_guide_opened','checkup_opened','checkup_preview_opened','checkup_insight_inspected','outlook_month_inspected','insight_source_opened','extended_planner_requested','extended_planner_used','calendar_30d_used','premium_expiry_viewed','installation_trial_activated','premium_purchase_verified')),
 surface text not null check(surface in ('dashboard','checkup','outlook','billing','gift')),
 horizon integer check(horizon in (30,90,365)),
 insight text check(insight in ('period','category','month','contributors')),
 variant text check(variant in ('control','contextual')),occurred_at timestamptz not null default now()
);
create index premium_events_owner_time on private.premium_events(user_id,occurred_at);
alter table private.premium_events enable row level security;
alter table private.premium_experiment_assignments enable row level security;
revoke all on private.premium_events,private.premium_experiment_assignments from public,anon,authenticated,service_role;

create function public.premium_measurement_context(p_experiment boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();v text:='contextual';
begin
 perform 1 from public.profiles where id=u and analytics_enabled and deletion_requested_at is null for update;
 if not found then return jsonb_build_object('enabled',false,'variant','contextual');end if;
 if p_experiment is true then
  insert into private.premium_experiment_assignments(user_id,variant)
   values(u,case when get_byte(decode(replace(u::text,'-',''),'hex'),0)%2=0 then 'control' else 'contextual' end)
   on conflict(user_id) do nothing;
  select variant into v from private.premium_experiment_assignments where user_id=u;
 end if;
 return jsonb_build_object('enabled',true,'variant',v);
end $$;

create function public.record_premium_event(p_id uuid,p_event text,p_surface text,p_horizon integer default null,p_insight text default null,p_experiment boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();v text;
begin
 if p_id is null or p_event is null or p_surface is null
  or p_event not in ('premium_preview_viewed','premium_details_opened','premium_sample_opened','installation_guide_opened','checkup_opened','checkup_preview_opened','checkup_insight_inspected','outlook_month_inspected','insight_source_opened','extended_planner_requested','extended_planner_used','calendar_30d_used','premium_expiry_viewed')
  or p_surface not in ('dashboard','checkup','outlook','billing','gift')
  or (p_horizon is not null and p_horizon not in (30,90,365))
  or (p_insight is not null and p_insight not in ('period','category','month','contributors'))
  then raise exception 'INVALID_INPUT';end if;
 perform 1 from public.profiles where id=u and analytics_enabled and deletion_requested_at is null for update;
 if not found then return;end if;
 if p_event='checkup_opened' and not private.household_premium(u) then return;end if;
 if p_event='extended_planner_used' and (not private.household_premium(u) or p_horizon is null or p_horizon not in (90,365)) then return;end if;
 if exists(select 1 from private.premium_events where id=p_id) then return;end if;
 perform private.rate_limit(u,'premium_metrics',120,60);
 if p_experiment is true then select variant into v from private.premium_experiment_assignments where user_id=u;end if;
 insert into private.premium_events(id,user_id,event,surface,horizon,insight,variant)
 values(p_id,u,p_event,p_surface,p_horizon,p_insight,v) on conflict(id) do nothing;
end $$;

-- Conversion is recorded only when an authoritative grant is created, not on a return URL.
create function private.measure_premium_grant() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where id=new.user_id and analytics_enabled and deletion_requested_at is null for update;
 if found then
  insert into private.premium_events(id,user_id,event,surface,variant)
  values(new.id,new.user_id,case new.origin when 'installation' then 'installation_trial_activated' else 'premium_purchase_verified' end,
   case new.origin when 'installation' then 'gift' else 'billing' end,
   (select variant from private.premium_experiment_assignments where user_id=new.user_id)) on conflict(id) do nothing;
 end if;return new;
end $$;
create trigger measure_premium_grant after insert on private.household_premium_periods for each row execute function private.measure_premium_grant();

alter function public.update_analytics_preference(boolean) rename to update_analytics_preference_before_premium_discovery;
create function public.update_analytics_preference(p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();
begin
 perform public.update_analytics_preference_before_premium_discovery(p_enabled);
 if not p_enabled then
  delete from private.premium_events where user_id=u;
  delete from private.premium_experiment_assignments where user_id=u;
 end if;
end $$;
alter function private.compact_analytics() rename to compact_analytics_before_premium_discovery;
create function private.compact_analytics() returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.compact_analytics_before_premium_discovery();
 delete from private.premium_events where occurred_at<now()-interval '90 days';
end $$;

alter function public.account_usage() rename to account_usage_before_premium_discovery;
create function public.account_usage() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();result jsonb;trial_end timestamptz;
begin
 result:=public.account_usage_before_premium_discovery();
 select ends_at into trial_end from private.household_premium_periods where user_id=u and origin='installation' and not revoked;
 return result||jsonb_build_object('installation_premium_ends_at',trial_end,
  'installation_premium_expired',coalesce(not (result->>'household_premium')::boolean and trial_end<=now() and trial_end=(result->>'household_premium_until')::timestamptz,false));
end $$;

create view private.premium_engagement_daily as
 select (occurred_at at time zone 'UTC')::date as day,event,surface,horizon,insight,variant,count(*) events,count(distinct user_id) accounts
 from private.premium_events group by 1,2,3,4,5,6;
-- This bounded report is observational. Purchases use the current verified, non-refunded ledger.
create view private.premium_conversion_report as
 with exposed as (
  select user_id,variant,min(occurred_at) first_exposure from private.premium_events
   where event='premium_preview_viewed' and surface='dashboard' group by user_id,variant
 ), outcomes as (
  select e.*,
   exists(select 1 from private.billing_orders b where b.user_id=e.user_id and b.product in ('premium_30','premium_year') and b.provider_checkout_id is not null and b.live=(select live from private.billing_settings) and b.created_at>=e.first_exposure) checkout_started,
   exists(select 1 from private.premium_events p where p.user_id=e.user_id and p.event='checkup_opened' and p.occurred_at>=e.first_exposure) engaged,
   (select count(*) from private.billing_orders b where b.user_id=e.user_id and b.product in ('premium_30','premium_year') and b.status='paid' and b.credited_at is not null and b.live=(select live from private.billing_settings) and b.created_at>=e.first_exposure) purchases,
   exists(select 1 from private.household_premium_periods t where t.user_id=e.user_id and t.origin='installation' and not t.revoked
    and exists(select 1 from private.billing_orders b where b.user_id=e.user_id and b.product in ('premium_30','premium_year') and b.status='paid' and b.credited_at is not null and b.live=(select live from private.billing_settings) and b.created_at>=greatest(t.starts_at,e.first_exposure))) trial_converted
  from exposed e
 ) select variant,count(*) exposed_accounts,count(*) filter(where checkout_started) checkout_accounts,count(*) filter(where engaged) checkup_accounts,
 count(*) filter(where purchases>0) verified_buyers,count(*) filter(where purchases>1) repeat_buyers,
 count(*) filter(where trial_converted) trial_to_paid_accounts from outcomes group by variant;
revoke all on private.premium_engagement_daily,private.premium_conversion_report from public,anon,authenticated,service_role;
revoke all on function public.premium_measurement_context(boolean),public.record_premium_event(uuid,text,text,integer,text,boolean),
 private.measure_premium_grant(),public.update_analytics_preference_before_premium_discovery(boolean),public.update_analytics_preference(boolean),
 private.compact_analytics_before_premium_discovery(),private.compact_analytics(),public.account_usage_before_premium_discovery(),public.account_usage()
 from public,anon,authenticated,service_role;
grant execute on function public.premium_measurement_context(boolean),public.record_premium_event(uuid,text,text,integer,text,boolean),public.update_analytics_preference(boolean),public.account_usage() to authenticated;
comment on function public.account_usage() is 'keeply:premium-discovery-v1';
comment on function public.record_premium_event(uuid,text,text,integer,text,boolean) is 'keeply:premium-discovery-v1';
commit;
