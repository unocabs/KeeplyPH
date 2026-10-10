-- Premium analysis over the existing shared projection. No household data is rewritten.
begin;

create function private.household_spending_checkup(u uuid,t date,p_week date,p_category text,p_before date,p_before_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with all_rows as materialized (
   select * from private.household_planning_rows(u,t,30) where cost_expected
 ), weeks as (
   select t+n starts_on,least(t+n+6,t+30) ends_on,count(a.date_id) total,
     count(a.amount_minor) known_count,count(a.date_id) filter(where a.amount_minor>0) positive_count,
     count(a.date_id) filter(where a.certainty='unset') unset_count,
     coalesce(sum(a.amount_minor),0)::text total_minor,
     coalesce(sum(a.amount_minor) filter(where a.certainty='estimated'),0)::text estimated_minor
   from generate_series(0,28,7) n left join all_rows a on a.due_on between t+n and least(t+n+6,t+30)
   group by n
 ), categories as (
   select reporting_category category,count(*) total,count(amount_minor) known_count,
     count(*) filter(where amount_minor>0) positive_count,count(*) filter(where certainty='unset') unset_count,
     coalesce(sum(amount_minor),0)::text total_minor,
     coalesce(sum(amount_minor) filter(where certainty='estimated'),0)::text estimated_minor
   from all_rows group by reporting_category
 ), selected as materialized (
   select * from all_rows where (p_week is null or due_on between p_week and least(p_week+6,t+30))
     and (p_category is null or reporting_category=p_category)
 ), page as (
   select * from selected where p_before is null or (due_on,date_id)>(p_before,p_before_id)
   order by due_on,date_id limit 26
 )
 select jsonb_build_object(
   'today',t,'ends_on',t+30,'currency','PHP','total',count(*),
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

create function public.household_spending_checkup(p_week date default null,p_category text default null,p_before date default null,p_before_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();t date;
begin
 if not private.household_premium(u) then raise exception 'PREMIUM_REQUIRED';end if;
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 if (p_before is null)<>(p_before_id is null)
   or (p_category is not null and p_category not in ('bills','maintenance','purchases','subscriptions','loans','vehicles','insurance','health','education','documents','custom'))
   or (p_week is not null and (p_week<t or p_week>t+28 or (p_week-t)%7<>0)) then raise exception 'INVALID_INPUT';end if;
 return private.household_spending_checkup(u,t,p_week,p_category,p_before,p_before_id);
end $$;

revoke all on function private.household_spending_checkup(uuid,date,date,text,date,uuid),public.household_spending_checkup(date,text,date,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.household_spending_checkup(date,text,date,uuid) to authenticated;
comment on function private.household_spending_checkup(uuid,date,date,text,date,uuid) is 'keeply:household-spending-checkup-v1';
comment on function public.household_spending_checkup(date,text,date,uuid) is 'keeply:household-spending-checkup-v1';
commit;
