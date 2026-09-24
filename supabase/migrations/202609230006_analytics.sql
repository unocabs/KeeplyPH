alter table public.profiles add column analytics_enabled boolean not null default false;
-- First-party counts only. Never store item names, dates, files, IPs or referrer URLs.
create table private.product_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 event text not null check(event in ('item_saved','reminder_opted_in','date_completed')),
 template_key text not null check(template_key in ('receipt','car','motorcycle','licence','passport','aircon','other')),
 ordinal integer, occurred_at timestamptz not null default now()
);
create index product_events_user_idx on private.product_events(user_id,event,occurred_at);
create table private.measurement_state (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 saved_count integer not null default 0, first_save timestamptz, second_save timestamptz,
 cohort_week date, measured_horizons integer[] not null default '{}'
);
create table private.activation_totals (
 cohort_week date not null, horizon integer not null, eligible_users bigint not null default 0,
 second_item_on_later_day bigint not null default 0, primary key(cohort_week,horizon)
);
create function private.measure_item_save() returns trigger language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if new.state='saved' and old.state='draft' and (select analytics_enabled from public.profiles where id=new.user_id) then
 insert into private.measurement_state(user_id,saved_count,first_save,cohort_week) values(new.user_id,1,now(),date_trunc('week',now() at time zone 'Asia/Manila')::date)
 on conflict(user_id) do update set saved_count=measurement_state.saved_count+1,second_save=case when measurement_state.saved_count=1 then now() else measurement_state.second_save end returning saved_count into n;
 insert into private.product_events(user_id,event,template_key,ordinal) values(new.user_id,'item_saved',new.template_key,n);
 end if;return new;
end $$;
create trigger measure_item_save after update on public.items for each row execute function private.measure_item_save();
create function private.measure_date_action() returns trigger language plpgsql security definer set search_path='' as $$
declare t text;
begin
 if not (select analytics_enabled from public.profiles where id=new.user_id) then return new; end if;
 if tg_table_name='important_dates' then
  if new.reminders_enabled and not old.reminders_enabled then
   select template_key into t from public.items where id=new.item_id;
   insert into private.product_events(user_id,event,template_key) values(new.user_id,'reminder_opted_in',t);
  end if;
 elsif new.status='completed' and old.status<>'completed' then
  select i.template_key into t from public.items i join public.important_dates d on d.item_id=i.id where d.id=new.date_id;
  insert into private.product_events(user_id,event,template_key) values(new.user_id,'date_completed',t);
 end if;return new;
end $$;
create trigger measure_date_optin after update on public.important_dates for each row execute function private.measure_date_action();
create trigger measure_date_completion after update on public.date_occurrences for each row execute function private.measure_date_action();
create table private.public_funnel_counts (
 day date not null, page text not null check(page in ('home','warranty-tracker','vehicle-registration-reminder','document-expiry-tracker','add')),
 event text not null check(event in ('landing_view','template_cta_clicked')),
 template_key text not null check(template_key in ('none','receipt','car','motorcycle','licence','passport','aircon','other')),
 count bigint not null default 1, primary key(day,page,event,template_key)
);
create function public.record_funnel_count(p_page text,p_event text,p_template text) returns void language plpgsql security definer set search_path='' as $$
begin
 -- Global ceiling bounds anonymous write volume without tracking people.
 perform private.rate_limit('00000000-0000-0000-0000-000000000000','public_metrics',600,60);
 insert into private.public_funnel_counts(day,page,event,template_key) values(current_date,p_page,p_event,p_template)
 on conflict(day,page,event,template_key) do update set count=private.public_funnel_counts.count+1;
end $$;
revoke all on private.product_events,private.public_funnel_counts from public,anon,authenticated;
revoke execute on function private.measure_item_save(),private.measure_date_action() from public,anon,authenticated;
revoke execute on function public.record_funnel_count(text,text,text) from public,anon,authenticated;
grant execute on function public.record_funnel_count(text,text,text) to service_role;

create function public.update_analytics_preference(p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();
begin
 update public.profiles set analytics_enabled=p_enabled where id=u;
 if not p_enabled then delete from private.product_events where user_id=u;delete from private.measurement_state where user_id=u;end if;
end $$;
create function private.compact_analytics() returns void language plpgsql security definer set search_path='' as $$
declare m record; h integer; returned boolean;
begin
 perform pg_advisory_xact_lock(719420002);
 for m in select * from private.measurement_state where first_save is not null for update loop
 foreach h in array array[7,30,90] loop
 if m.first_save<=now()-make_interval(days=>h) and not(h=any(m.measured_horizons)) then
 returned:=coalesce((m.second_save at time zone 'Asia/Manila')::date>(m.first_save at time zone 'Asia/Manila')::date and m.second_save<=m.first_save+make_interval(days=>h),false);
 insert into private.activation_totals(cohort_week,horizon,eligible_users,second_item_on_later_day) values(m.cohort_week,h,1,case when returned then 1 else 0 end)
 on conflict(cohort_week,horizon) do update set eligible_users=activation_totals.eligible_users+1,second_item_on_later_day=activation_totals.second_item_on_later_day+excluded.second_item_on_later_day;
 update private.measurement_state set measured_horizons=array_append(measured_horizons,h) where user_id=m.user_id;
 end if;end loop;
 if m.first_save<=now()-interval '90 days' then update private.measurement_state set first_save=null,second_save=null,cohort_week=null where user_id=m.user_id;end if;
 end loop;
 delete from private.product_events where occurred_at<now()-interval '90 days';
 delete from private.public_funnel_counts where day<current_date-400;
end $$;
create view private.activation_report as select horizon as days,sum(eligible_users) eligible_users,sum(second_item_on_later_day) second_item_on_later_day from private.activation_totals group by horizon;
revoke all on private.measurement_state,private.activation_totals,private.activation_report from public,anon,authenticated;
revoke execute on function private.compact_analytics() from public,anon,authenticated;
revoke execute on function public.update_analytics_preference(boolean) from public,anon;
grant execute on function public.update_analytics_preference(boolean) to authenticated;

create or replace function public.run_maintenance() returns jsonb language plpgsql security definer set search_path = '' as $$
declare objects jsonb; accounts jsonb; reviews integer;
begin
  perform private.compact_analytics();
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
