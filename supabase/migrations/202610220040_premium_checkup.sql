-- Saved payday and minimal daily baselines for same-date comparisons.
begin;
create table private.household_checkup_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payday date not null
);
create table private.household_checkup_reviews (
 user_id uuid not null references auth.users(id) on delete cascade,
 reviewed_on date not null, captured_at timestamptz not null default now(),
 starts_on date not null, ends_on date not null, rows jsonb not null,
 primary key(user_id,reviewed_on), check(ends_on>=starts_on)
);
revoke all on private.household_checkup_preferences,private.household_checkup_reviews from public,anon,authenticated,service_role;

create function public.set_household_checkup_payday(p_payday date)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); t date;
begin
 if not private.household_premium(u) then raise exception 'PREMIUM_REQUIRED';end if;
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 if p_payday is null or p_payday<=t or p_payday>t+365 then raise exception 'INVALID_INPUT';end if;
 insert into private.household_checkup_preferences values(u,p_payday)
 on conflict(user_id) do update set payday=excluded.payday;
end $$;

-- Called by a POST after viewing the page. GET and prefetch never create history.
create function public.capture_household_checkup()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();t date;created boolean;
begin
 if not private.household_premium(u) then raise exception 'PREMIUM_REQUIRED';end if;
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 perform pg_advisory_xact_lock(hashtextextended(u::text,40));
 delete from private.household_checkup_reviews where user_id=u and reviewed_on<t-35;
 if exists(select 1 from private.household_checkup_reviews where user_id=u and reviewed_on=t) then
  return jsonb_build_object('created',false,'reviewed_on',t);
 end if;
 insert into private.household_checkup_reviews(user_id,reviewed_on,starts_on,ends_on,rows)
 select u,t,t,t+365,coalesce(jsonb_agg(jsonb_build_object(
 'item_id',r.item_id,'date_id',r.date_id,'due_on',r.due_on,
 'amount_minor',r.amount_minor,'estimated',r.certainty='estimated') order by r.due_on,r.date_id),'[]'::jsonb)
 from private.household_planning_rows(u,t,365) r where r.cost_expected
 on conflict(user_id,reviewed_on) do nothing;
 created:=found;
 return jsonb_build_object('created',created,'reviewed_on',t);
end $$;

create function private.checkup_range(u uuid,t date,e date,p_week date,p_category text,p_before date,p_before_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with all_rows as materialized (
   select * from private.household_planning_rows(u,t,e-t) where cost_expected
 ), weeks as (
   select t+n starts_on,least(t+n+6,e) ends_on,count(a.date_id) total,
     count(a.amount_minor) known_count,count(a.date_id) filter(where a.amount_minor>0) positive_count,
     count(a.date_id) filter(where a.certainty='unset') unset_count,
     coalesce(sum(a.amount_minor),0)::text total_minor,
     coalesce(sum(a.amount_minor) filter(where a.certainty='estimated'),0)::text estimated_minor
   from generate_series(0,e-t,7) n left join all_rows a on a.due_on between t+n and least(t+n+6,e)
   group by n
 ), categories as (
   select reporting_category category,count(*) total,count(amount_minor) known_count,
     count(*) filter(where amount_minor>0) positive_count,count(*) filter(where certainty='unset') unset_count,
     coalesce(sum(amount_minor),0)::text total_minor,
     coalesce(sum(amount_minor) filter(where certainty='estimated'),0)::text estimated_minor
   from all_rows group by reporting_category
 ), selected as materialized (
   select * from all_rows where (p_week is null or due_on between p_week and least(p_week+6,e))
     and (p_category is null or reporting_category=p_category)
 ), page as (
   select * from selected where p_before is null or (due_on,date_id)>(p_before,p_before_id)
   order by due_on,date_id limit 26
 )
 select jsonb_build_object(
   'today',t,'ends_on',e,'currency','PHP','total',count(*),
   'source_count',count(distinct date_id),'positive_source_count',count(distinct date_id) filter(where amount_minor>0),
   'confirmed_minor',coalesce(sum(amount_minor) filter(where certainty='confirmed'),0)::text,
   'estimated_minor',coalesce(sum(amount_minor) filter(where certainty='estimated'),0)::text,
   'unverified_minor',coalesce(sum(amount_minor) filter(where certainty='unverified'),0)::text,
   'confirmed_count',count(*) filter(where certainty='confirmed'),
   'estimated_count',count(*) filter(where certainty='estimated'),
   'unverified_count',count(*) filter(where certainty='unverified'),
   'unset_count',count(*) filter(where certainty='unset'),
   'weeks',(select jsonb_agg(to_jsonb(w) order by starts_on) from weeks w),
   'categories',(select coalesce(jsonb_agg(to_jsonb(c) order by category),'[]'::jsonb) from categories c),
   'week',p_week,'category',p_category,'filtered_total',(select count(*) from selected),
   'has_more',(select count(*)>25 from page),
   'rows',(select coalesce(jsonb_agg(to_jsonb(r) order by due_on,date_id),'[]'::jsonb) from (select * from page order by due_on,date_id limit 25) r)
 ) from all_rows
$$;

create function private.checkup_changes(u uuid,t date,e date,p_page integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare baseline private.household_checkup_reviews; result jsonb;
begin
 -- Yesterday's most recent checkup remains stable throughout today. On first use,
 -- today's first snapshot can serve as the baseline on a subsequent visit.
 select * into baseline from private.household_checkup_reviews where user_id=u and reviewed_on between t-35 and t
 order by (starts_on<=t and ends_on>=e) desc,(reviewed_on<t) desc,reviewed_on desc limit 1;
 if not found then return jsonb_build_object('status','first_use');end if;
 if baseline.starts_on>t or baseline.ends_on<e then return jsonb_build_object('status','outside_coverage');end if;
 with previous as materialized (
  select * from jsonb_to_recordset(baseline.rows) as r(item_id uuid,date_id uuid,due_on date,amount_minor bigint,estimated boolean)
  where due_on between t and e
 ), current_rows as materialized (
  select * from private.household_planning_rows(u,t,e-t) where cost_expected
 ), changes as materialized (
  select coalesce(a.item_id,b.item_id) item_id,coalesce(a.date_id,b.date_id) date_id,coalesce(a.due_on,b.due_on) due_on,
   b.date_id is not null before_present,a.date_id is not null after_present,
   b.amount_minor::text before_minor,a.amount_minor::text after_minor,
   b.estimated before_estimated,a.certainty='estimated' after_estimated,
   case when b.date_id is null then 'added' when a.date_id is null then 'removed'
    when b.amount_minor is null then 'amount_added' when a.amount_minor is null then 'amount_removed'
    when b.amount_minor<>a.amount_minor then 'amount_changed' else 'estimate_changed' end reason
  from current_rows a full join previous b using(date_id,due_on)
  where a.date_id is null or b.date_id is null or a.amount_minor is distinct from b.amount_minor
   or (a.certainty='estimated') is distinct from b.estimated
 ), page as (
  select c.*,coalesce(i.product_name,'Removed household expense') product_name,
   coalesce(d.label,'Original record no longer available') label,i.id is not null and d.id is not null record_available
  from changes c left join public.items i on i.id=c.item_id and i.user_id=u
  left join public.important_dates d on d.id=c.date_id and d.user_id=u
  order by c.due_on,c.date_id limit 25 offset p_page*25
 )
 select jsonb_build_object('status','available','reviewed_on',baseline.reviewed_on,'captured_at',baseline.captured_at,
  'previous_minor',(select coalesce(sum(amount_minor),0)::text from previous),
  'current_minor',(select coalesce(sum(amount_minor),0)::text from current_rows),
  'previous_missing',(select count(*) filter(where amount_minor is null) from previous),
  'current_missing',(select count(*) filter(where amount_minor is null) from current_rows),
  'previous_known',(select count(amount_minor) from previous),'current_known',(select count(amount_minor) from current_rows),
  'change_count',(select count(*) from changes),'page',p_page,'has_more',(select count(*)>(p_page+1)*25 from changes),
  'rows',(select coalesce(jsonb_agg(to_jsonb(p) order by due_on,date_id),'[]'::jsonb) from page p)
 ) into result;
 return result;
end $$;

create function public.household_checkup_plan(p_mode text default 'saved',p_week date default null,p_category text default null,p_before date default null,p_before_id uuid default null,p_change_page integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=private.require_user();t date;e date;payday date;result jsonb;mode text;
begin
 if not private.household_premium(u) then raise exception 'PREMIUM_REQUIRED';end if;
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 select p.payday into payday from private.household_checkup_preferences p where user_id=u;
 mode:=case when p_mode<>'30' and payday>t and payday<=t+365 then 'payday' else '30' end;
 e:=case when mode='payday' then payday-1 else t+30 end;
 if p_mode is null or p_mode not in ('saved','30','payday') or p_change_page is null or p_change_page<0 or p_change_page>100000
  or (p_before is null)<>(p_before_id is null)
  or (p_category is not null and p_category not in ('bills','maintenance','purchases','subscriptions','loans','vehicles','insurance','health','education','documents','custom'))
  or (p_week is not null and (p_week<t or p_week>e or (p_week-t)%7<>0)) then raise exception 'INVALID_INPUT';end if;
 result:=private.checkup_range(u,t,e,p_week,p_category,p_before,p_before_id);
 return result||jsonb_build_object('mode',mode,'saved_payday',payday,'expired_payday',payday<=t,
 'after_payday_count',case when mode='payday' and payday<=t+30 then
 (select count(*) from private.household_planning_rows(u,t,30) where cost_expected and due_on>=payday) else 0 end,
 'comparison',private.checkup_changes(u,t,e,p_change_page));
end $$;

-- Daily maintenance also removes snapshots for households that stop visiting.
alter function private.compact_analytics() rename to compact_analytics_before_checkup;
create function private.compact_analytics() returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.compact_analytics_before_checkup();
 delete from private.household_checkup_reviews where captured_at<now()-interval '36 days';
end $$;

revoke all on function private.checkup_range(uuid,date,date,date,text,date,uuid),private.checkup_changes(uuid,date,date,integer),
 private.compact_analytics_before_checkup(),private.compact_analytics(),public.set_household_checkup_payday(date),
 public.capture_household_checkup(),public.household_checkup_plan(text,date,text,date,uuid,integer)
 from public,anon,authenticated,service_role;
grant execute on function public.set_household_checkup_payday(date),public.capture_household_checkup(),public.household_checkup_plan(text,date,text,date,uuid,integer) to authenticated;
comment on function public.household_checkup_plan(text,date,text,date,uuid,integer) is 'keeply:premium-checkup-v1';
commit;
