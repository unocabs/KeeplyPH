-- Expandable queue-backed preview. Apply after the existing migrations through 202610050023.
begin;
create or replace function public.dashboard_timeline_items() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); t date; overview jsonb; result jsonb;
begin
 -- Retain the existing dashboard selection and coverage reconciliation.
 overview:=public.dashboard_items();
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 with selected as (
   select (value->>'id')::uuid id from jsonb_array_elements(overview)
   union
   -- Eleven distinct reminders support ten expanded rows and overflow detection
   -- even when one reminder owns several dates. Use actual open occurrences.
   select item_id from (
     select item_id,min(expires_on) due from private.current_dates
     where user_id=u and state='saved' and archived_at is null and expires_on between t and t+30
     group by item_id order by min(expires_on),item_id limit 11
   ) upcoming
 ), jobs as (
   select j.date_id,j.scheduled_at,'email'::text channel
   from private.notification_jobs j join private.current_dates d on d.occurrence_id=j.occurrence_id
   where d.user_id=u and d.item_id in(select id from selected)
   and j.status in('pending','retry','sending') and private.email_job_eligible(j)
   union all
   select j.date_id,j.scheduled_at,'push'::text
   from private.push_jobs j join private.current_dates d on d.occurrence_id=j.occurrence_id
   where d.user_id=u and d.item_id in(select id from selected)
   and j.status in('pending','retry','sending') and private.push_job_eligible(j)
   -- SMS remains postponed in the application; do not advertise an unavailable channel.
 ), alerts as (
   select distinct j.date_id,(j.scheduled_at at time zone p.timezone)::date alert_on,j.channel
   from jobs j join public.profiles p on p.id=u
   where (j.scheduled_at at time zone p.timezone)::date between t and t+30
 )
 select coalesce(jsonb_agg(payload order by i.created_at desc,i.id desc),'[]'::jsonb) into result
 from public.items i join selected s on s.id=i.id
 cross join lateral (select private.item_json(i) item) original
 cross join lateral (select original.item || jsonb_build_object('dates',(
   select coalesce(jsonb_agg(value || jsonb_build_object('scheduled_alerts',(
     select coalesce(jsonb_agg(jsonb_build_object('on',a.alert_on,'channel',a.channel) order by a.alert_on,a.channel),'[]'::jsonb)
     from alerts a where a.date_id=(value->>'id')::uuid
   ))),'[]'::jsonb) from jsonb_array_elements(original.item->'dates')
 )) payload) enriched
 where i.user_id=u;
 return result;
end $$;
revoke all on function public.dashboard_timeline_items() from public,anon,authenticated,service_role;
grant execute on function public.dashboard_timeline_items() to authenticated;
commit;
