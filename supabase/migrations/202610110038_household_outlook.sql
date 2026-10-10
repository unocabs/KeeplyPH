-- Read-only Premium month analysis over the shared planning projection.
begin;

create function private.household_outlook(u uuid,t date,horizon integer,p_month date,p_before date,p_before_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with all_rows as materialized (
   select * from private.household_planning_rows(u,t,horizon)
 ), cost_groups as (
   select date_trunc('month',due_on)::date as month,jsonb_build_object(
     'total',count(*),'known_count',count(amount_minor),'positive_count',count(*) filter(where amount_minor>0),
     'unset_count',count(*) filter(where amount_minor is null),'total_minor',coalesce(sum(amount_minor),0)::text,
     'estimated_minor',coalesce(sum(amount_minor) filter(where certainty='estimated'),0)::text) costs
   from all_rows where cost_expected group by grouping sets((),date_trunc('month',due_on)::date)
 ), contributors as (
   select date_trunc('month',due_on)::date as month,item_id,date_id,product_name,label,sum(amount_minor) amount,
     jsonb_build_object('total',count(*),'known_count',count(amount_minor),'positive_count',count(*) filter(where amount_minor>0),
       'unset_count',count(*) filter(where amount_minor is null),'total_minor',sum(amount_minor)::text,
       'estimated_minor',coalesce(sum(amount_minor) filter(where certainty='estimated'),0)::text) costs,
     row_number() over(partition by date_trunc('month',due_on)::date order by sum(amount_minor) desc,date_id) rank
   from all_rows where cost_expected group by 1,item_id,date_id,product_name,label having sum(amount_minor)>0
 ), months as (
   select m::date as month,greatest(m::date,t) starts_on,least((m+interval '1 month'-interval '1 day')::date,t+horizon) ends_on,
     count(a.date_id) date_count,coalesce(c.costs->>'total_minor','0') total_minor,
     count(a.date_id) filter(where a.certainty='estimated') estimated_count,
     count(a.date_id) filter(where a.certainty='unverified') unverified_count,
     count(a.date_id) filter(where a.cost_expected and a.amount_minor is null) unset_count,
     coalesce(c.costs,'{"total":0,"known_count":0,"positive_count":0,"unset_count":0,"total_minor":"0","estimated_minor":"0"}'::jsonb) costs,
     (select coalesce(jsonb_agg(jsonb_build_object('item_id',r.item_id,'date_id',r.date_id,'product_name',r.product_name,'label',r.label,'costs',r.costs) order by r.amount desc,r.date_id),'[]'::jsonb)
       from contributors r where r.month=m::date and r.rank<=3) contributors
   from generate_series(date_trunc('month',t),date_trunc('month',t+horizon),interval '1 month') m
   left join all_rows a on date_trunc('month',a.due_on)::date=m::date
   left join cost_groups c on c.month=m::date
   group by m,c.costs
 ), selected as materialized (
   select * from all_rows where p_month is null or date_trunc('month',due_on)::date=p_month
 ), page as (
   select * from selected where p_before is null or (due_on,date_id)>(p_before,p_before_id)
   order by due_on,date_id limit 26
 )
 select jsonb_build_object('today',t,'ends_on',t+horizon,'days',horizon,'total',(select count(*) from all_rows),
   'total_minor',costs->>'total_minor','costs',costs,
   'positive_source_count',(select count(distinct date_id) from all_rows where cost_expected and amount_minor>0),
   'month',p_month,'filtered_total',(select count(*) from selected),
   'months',(select jsonb_agg(to_jsonb(m) order by month) from months m),
   'has_more',(select count(*)>25 from page),
   'rows',(select coalesce(jsonb_agg(to_jsonb(r) order by due_on,date_id),'[]'::jsonb) from (select * from page order by due_on,date_id limit 25) r)
 ) from cost_groups where month is null
$$;

create function public.household_outlook(p_days integer default 90,p_month date default null,p_before date default null,p_before_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();t date;
begin
 if not private.household_premium(u) then raise exception 'PREMIUM_REQUIRED';end if;
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 if p_days is null or p_days not in (30,90,365) or (p_before is null)<>(p_before_id is null)
   or (p_month is not null and (p_month<>date_trunc('month',p_month)::date or p_month<date_trunc('month',t)::date or p_month>t+p_days))
   then raise exception 'INVALID_INPUT';end if;
 return private.household_outlook(u,t,p_days,p_month,p_before,p_before_id);
end $$;

revoke all on function private.household_outlook(uuid,date,integer,date,date,uuid),public.household_outlook(integer,date,date,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.household_outlook(integer,date,date,uuid) to authenticated;
comment on function private.household_outlook(uuid,date,integer,date,date,uuid) is 'keeply:household-outlook-v1';
comment on function public.household_outlook(integer,date,date,uuid) is 'keeply:household-outlook-v1';
commit;
