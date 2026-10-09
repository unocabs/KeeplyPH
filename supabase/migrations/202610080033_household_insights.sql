-- Account-wide insights, explicit amount certainty and owner-scoped contextual readiness.
-- Requires all migrations through household core experience. Apply once before matching code.
begin;
alter table public.important_dates add column payment_amount_certainty text not null default 'unverified'
 check(payment_amount_certainty in ('estimated','unverified'));
alter table public.date_occurrences add column expected_amount_minor bigint check(expected_amount_minor between 0 and 99999999999),
 add column amount_certainty text check(amount_certainty in ('confirmed','estimated','unverified','unset')),
 add constraint expected_amount_pair check(case when amount_certainty is null or amount_certainty='unset' then expected_amount_minor is null else expected_amount_minor is not null end);
-- No historical prices, actors or confirmations are inferred.
create table public.item_readiness_preferences(
 item_id uuid not null,user_id uuid not null,criterion text not null check(criterion in ('purchase_date','warranty','important_date','registration','service_date','service_history')),
 state text not null check(state in ('unknown','not_applicable','dismissed')),updated_at timestamptz not null default now(),
 primary key(item_id,criterion),foreign key(item_id,user_id) references public.items(id,user_id) on delete cascade
);
alter table public.item_readiness_preferences enable row level security;
create policy readiness_owner_select on public.item_readiness_preferences for select to authenticated using(user_id=auth.uid() and private.active_account());
revoke all on public.item_readiness_preferences from public,anon,authenticated,service_role;
grant select on public.item_readiness_preferences to authenticated;

create function private.item_readiness(i public.items) returns jsonb language sql stable security definer set search_path='' as $$
 with criteria(key,complete) as (
 select 'purchase_date',i.purchased_on is not null where i.template_key='receipt'
 union all select 'warranty',exists(select 1 from public.important_dates d where d.item_id=i.id and d.kind='warranty') where i.template_key='receipt' and i.category in ('appliances','electronics')
 union all select 'registration',exists(select 1 from public.important_dates d where d.item_id=i.id and d.kind='registration') where i.template_key in ('car','motorcycle')
 union all select 'service_date',exists(select 1 from public.important_dates d where d.item_id=i.id and (d.kind='service' or private.reminder_category(i.template_key,i.reminder_preset)='maintenance')) where private.reminder_category(i.template_key,i.reminder_preset)='maintenance'
 union all select 'service_history',exists(select 1 from public.item_activities a where a.item_id=i.id and a.voided_at is null and a.activity_type='service') where i.template_key in ('car','motorcycle','aircon') or private.reminder_category(i.template_key,i.reminder_preset)='maintenance'
 union all select 'important_date',exists(select 1 from public.important_dates d where d.item_id=i.id) where i.template_key not in ('receipt','car','motorcycle','aircon') and private.reminder_category(i.template_key,i.reminder_preset)<>'maintenance'
 ) select coalesce(jsonb_agg(jsonb_build_object('key',c.key,'state',case when c.complete then 'complete' else coalesce(p.state,'missing') end) order by c.key),'[]'::jsonb)
 from criteria c left join public.item_readiness_preferences p on p.item_id=i.id and p.user_id=i.user_id and p.criterion=c.key
$$;
create function public.set_readiness_preference(p_item uuid,p_revision integer,p_criterion text,p_state text) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();i public.items;
begin
 perform 1 from public.profiles where id=u for update;
 perform private.rate_limit(u,'insight_write',60);
 select * into i from public.items where id=p_item and user_id=u for update;
 if not found then raise exception 'NOT_FOUND';end if;
 if i.archived_at is not null or i.state<>'saved' then raise exception 'ITEM_ARCHIVED';end if;
 if p_revision is null or i.revision<>p_revision then raise exception 'CONFLICT';end if;
 if p_state is null or p_state not in ('missing','unknown','not_applicable','dismissed') or not exists(select 1 from jsonb_array_elements(private.item_readiness(i)) c where c->>'key'=p_criterion) then raise exception 'INVALID_INPUT';end if;
 if p_state='missing' then delete from public.item_readiness_preferences where item_id=i.id and criterion=p_criterion;
 else insert into public.item_readiness_preferences(item_id,user_id,criterion,state) values(i.id,u,p_criterion,p_state)
 on conflict(item_id,criterion) do update set state=excluded.state,updated_at=now();end if;
 update public.items set revision=revision+1,updated_at=now() where id=i.id;
end $$;
-- Preserve the existing date-write implementation and old-client compatibility.
alter function public.save_important_date(uuid,uuid,integer,jsonb) rename to save_important_date_before_insights;
alter function public.save_important_date_before_insights(uuid,uuid,integer,jsonb) set schema private;
revoke all on function private.save_important_date_before_insights(uuid,uuid,integer,jsonb) from public,anon,authenticated,service_role;
create function public.save_important_date(p_id uuid,p_item_id uuid,p_revision integer,p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();old public.important_dates;certainty text;
begin
 perform 1 from public.profiles where id=u for update;
 if p_revision is null or p_revision<0 then raise exception 'INVALID_INPUT';end if;
 select * into old from public.important_dates where id=p_id and item_id=p_item_id and user_id=u for update;
 certainty:=case when p_data ? 'payment_amount_certainty' then p_data->>'payment_amount_certainty'
 when p_data ? 'payment_amount_minor' and (p_data->>'payment_amount_minor')::bigint is distinct from old.payment_amount_minor then 'unverified'
 else coalesce(old.payment_amount_certainty,'unverified') end;
 if certainty is null or certainty not in ('estimated','unverified') then raise exception 'INVALID_INPUT';end if;
 perform private.save_important_date_before_insights(p_id,p_item_id,p_revision,p_data);
 update public.important_dates set payment_amount_certainty=certainty where id=p_id and user_id=u;
 return p_id;
end $$;
create function public.set_occurrence_amount(p_occurrence uuid,p_revision integer,p_amount bigint,p_certainty text) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();d public.important_dates;o public.date_occurrences;i public.items;
begin
 perform 1 from public.profiles where id=u for update;
 perform private.rate_limit(u,'insight_write',60);
 select * into o from public.date_occurrences where id=p_occurrence and user_id=u;
 if not found then raise exception 'NOT_FOUND';end if;
 select * into d from public.important_dates where id=o.date_id and user_id=u for update;
 select * into i from public.items where id=d.item_id and user_id=u;
 if i.archived_at is not null or i.state<>'saved' then raise exception 'ITEM_ARCHIVED';end if;
 if p_revision is null or d.revision<>p_revision then raise exception 'CONFLICT';end if;
 select * into o from public.date_occurrences where id=p_occurrence and user_id=u for update;
 if o.status not in ('open','unconfirmed') then raise exception 'ALREADY_COMPLETED';end if;
 if p_certainty is null or p_certainty not in ('confirmed','estimated','unverified','unset','inherit') or
 (p_certainty in ('unset','inherit') and p_amount is not null) or (p_certainty not in ('unset','inherit') and (p_amount is null or p_amount<0 or p_amount>99999999999)) then raise exception 'INVALID_INPUT';end if;
 update public.date_occurrences set expected_amount_minor=p_amount,amount_certainty=case when p_certainty='inherit' then null else p_certainty end where id=o.id;
 update public.important_dates set revision=revision+1,updated_at=now() where id=d.id;
end $$;
-- JSON includes readiness checks on both lists and detail, without exposing preference writes.
alter function private.item_json(public.items) rename to item_json_before_insights;
create function private.item_json(i public.items) returns jsonb language sql stable security definer set search_path='' as $$
 select private.item_json_before_insights(i)||jsonb_build_object('readiness_checks',private.item_readiness(i))
$$;
create function private.payment_date(preset text,kind text,label text) returns boolean language sql immutable set search_path='' as $$
 select kind='other' and (private.reminder_category('other',preset) in ('bills','loans','subscriptions') or preset in ('tuition','school-fees') or
 label=case preset when 'life-insurance' then 'Life Insurance premium payment' when 'health-insurance' then 'Health Insurance / HMO premium payment'
 when 'vehicle-insurance' then 'Vehicle Insurance premium payment' when 'home-insurance' then 'Home / Property Insurance premium payment'
 when 'travel-insurance' then 'Travel Insurance premium payment' when 'other-insurance' then 'Other Insurance premium payment' end)
$$;
create function private.payment_rows(u uuid,t date) returns table(item_id uuid,product_name text,date_id uuid,label text,occurrence_id uuid,due_on date,amount_minor bigint,certainty text,projected boolean)
language sql stable security definer set search_path='' as $$
 with source as (
 select i.id item_id,i.product_name,d.id date_id,d.label,d.payment_amount_minor,d.payment_amount_certainty,d.recurrence_months,d.recurrence_anchor,d.recurrence_ends_on,d.recurrence_policy,
 o.id occurrence_id,o.due_on,o.expected_amount_minor,o.amount_certainty
 from public.items i join public.important_dates d on d.item_id=i.id join public.date_occurrences o on o.date_id=d.id and o.status='open'
 where i.user_id=u and i.state='saved' and i.archived_at is null and (private.payment_date(i.reminder_preset,d.kind,d.label) or d.payment_amount_minor is not null or o.expected_amount_minor is not null)
 ), candidates as (
 select s.*,s.due_on planned_on,false projected from source s where s.due_on between t and t+30
 union all select s.*,n.due,true from source s
 cross join lateral(select private.next_recurring_date(s.recurrence_anchor,greatest(s.due_on,t-1),s.recurrence_months,s.recurrence_ends_on) first_due) f
 cross join lateral(values(f.first_due),(private.next_recurring_date(s.recurrence_anchor,f.first_due,s.recurrence_months,s.recurrence_ends_on))) n(due)
 where s.recurrence_months is not null and s.recurrence_policy='fixed' and n.due between t and t+30
 and not exists(select 1 from public.date_occurrences x where x.date_id=s.date_id and x.due_on=n.due and x.status in ('completed','skipped','superseded'))
 ) select c.item_id,c.product_name,c.date_id,c.label,case when not c.projected then c.occurrence_id end,c.planned_on,
 case when not c.projected and c.amount_certainty is not null then c.expected_amount_minor else c.payment_amount_minor end,
 case when not c.projected and c.amount_certainty is not null then c.amount_certainty when c.payment_amount_minor is null then 'unset' else c.payment_amount_certainty end,c.projected from candidates c
$$;
create function public.household_payment_plan(p_before date default null,p_before_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();t date;result jsonb;
begin
 if (p_before is null)<>(p_before_id is null) then raise exception 'INVALID_INPUT';end if;
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 with all_rows as materialized(select * from private.payment_rows(u,t)),page as(
 select * from all_rows where p_before is null or (due_on,date_id)>(p_before,p_before_id) order by due_on,date_id limit 26)
 select jsonb_build_object('today',t,'ends_on',t+30,'currency','PHP','total',count(*),
 'confirmed_minor',coalesce(sum(amount_minor) filter(where certainty='confirmed'),0)::text,
 'estimated_minor',coalesce(sum(amount_minor) filter(where certainty='estimated'),0)::text,
 'unverified_minor',coalesce(sum(amount_minor) filter(where certainty='unverified'),0)::text,
 'unset_count',count(*) filter(where certainty='unset'),
 'confirmed_count',count(*) filter(where certainty='confirmed'),'estimated_count',count(*) filter(where certainty='estimated'),'unverified_count',count(*) filter(where certainty='unverified'),
 'has_more',(select count(*)>25 from page),
 'rows',(select coalesce(jsonb_agg(to_jsonb(x) order by due_on,date_id),'[]'::jsonb) from(select * from page order by due_on,date_id limit 25)x)) into result from all_rows;
 return result;
end $$;
create function public.household_insights() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();t date;ready jsonb;week jsonb;
begin
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 with records as materialized(select i.id,i.product_name,private.item_readiness(i) checks from public.items i where i.user_id=u and i.state='saved' and i.archived_at is null),
 checks as(select r.id,r.product_name,c->>'key' key,c->>'state' state from records r cross join lateral jsonb_array_elements(r.checks)c)
 select jsonb_build_object('total',(select count(*) from records),'ready',(select count(*) from records r where not exists(select 1 from jsonb_array_elements(r.checks)c where c->>'state' not in ('complete','not_applicable'))),
 'unknown',count(*) filter(where state='unknown'),'dismissed',count(*) filter(where state='dismissed'),
 'rows',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from(select id item_id,product_name,key from checks where state='missing' order by id,key limit 3)x)) into ready from checks;
 select jsonb_build_object('ends_on',t+6,'payment_count',(select count(*) from private.payment_rows(u,t) where due_on<=t+6),
 'date_count',(select count(*) from private.current_dates where user_id=u and state='saved' and archived_at is null and expires_on between t and t+6),
 'overdue_count',(select count(*) from private.current_dates where user_id=u and state='saved' and archived_at is null and expires_on<t),
 'unconfirmed_count',(select count(*) from public.date_occurrences o join public.important_dates d on d.id=o.date_id join public.items i on i.id=d.item_id where o.user_id=u and o.status='unconfirmed' and i.state='saved' and i.archived_at is null),
 'services',(select coalesce(jsonb_agg(to_jsonb(x) order by due_on,date_id),'[]'::jsonb) from(select d.item_id,i.product_name,d.id date_id,d.label,d.expires_on due_on from private.current_dates d join public.items i on i.id=d.item_id where d.user_id=u and d.state='saved' and d.archived_at is null and (d.kind='service' or private.reminder_category(i.template_key,i.reminder_preset)='maintenance') and d.expires_on between t and t+6 order by d.expires_on,d.id limit 2)x)) into week;
 return jsonb_build_object('today',t,'readiness',ready,'week',week,'payments',public.household_payment_plan());
end $$;
-- Search literal text across owner-visible records, current/past dates, active history and ready file names.
create function private.item_search_matches(i public.items,q text,scope text) returns boolean language sql stable security definer set search_path='' as $$
 select strpos(lower(concat_ws(' ',i.product_name,i.template_key,replace(i.reminder_preset,'-',' '),private.reminder_category(i.template_key,i.reminder_preset),i.notes,i.merchant,i.purchased_on::text)),lower(q))>0
 or exists(select 1 from public.important_dates d where d.item_id=i.id and (scope not in ('maintenance','insurance') or private.reminder_date_matches(i.template_key,i.reminder_preset,d.kind,scope)) and strpos(lower(concat_ws(' ',d.label,d.notes,d.starts_on::text)),lower(q))>0)
 or exists(select 1 from public.date_occurrences o join public.important_dates d on d.id=o.date_id where d.item_id=i.id and (scope not in ('maintenance','insurance') or private.reminder_date_matches(i.template_key,i.reminder_preset,d.kind,scope)) and strpos(o.due_on::text,q)>0)
 or exists(select 1 from public.item_activities a where a.item_id=i.id and a.user_id=i.user_id and a.voided_at is null and (scope not in ('maintenance','insurance') or (a.occurrence_id is null and (scope='maintenance' and a.activity_type in ('service','repair') or private.reminder_category(i.template_key,i.reminder_preset)=scope)) or exists(select 1 from public.date_occurrences o join public.important_dates d on d.id=o.date_id where o.id=a.occurrence_id and private.reminder_date_matches(i.template_key,i.reminder_preset,d.kind,scope))) and strpos(lower(concat_ws(' ',a.title,a.notes,a.completed_on::text)),lower(q))>0)
 or exists(select 1 from public.documents f where f.purchase_id=i.id and f.user_id=i.user_id and f.state='ready' and strpos(lower(f.original_name),lower(q))>0)
$$;
create or replace function public.list_items(p_filter text default 'all',p_query text default '',p_template text default 'all',p_cursor timestamptz default null,p_cursor_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); t date; result jsonb;
begin
 perform private.trim_reminders(u);
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 select coalesce(jsonb_agg(private.item_json(i) order by i.created_at desc,i.id desc),'[]'::jsonb) into result from (
 select i.* from public.items i where i.user_id=u
 and (p_template='all' or i.template_key=p_template or 'category:'||private.reminder_category(i.template_key,i.reminder_preset)=p_template
   or (p_template in ('category:maintenance','category:insurance') and exists(
     select 1 from public.important_dates d where d.item_id=i.id
     and private.reminder_date_matches(i.template_key,i.reminder_preset,d.kind,substring(p_template from 10)))))
 and private.item_search_matches(i,left(btrim(coalesce(p_query,'')),160),case when p_template in ('category:maintenance','category:insurance') then substring(p_template from 10) else 'all' end)
 and (p_cursor is null or (i.created_at,i.id)<(p_cursor,p_cursor_id))
 and case p_filter when 'archived' then i.archived_at is not null when 'drafts' then i.state='draft'
 else i.state='saved' and i.archived_at is null and
 case p_filter when 'reminders' then private.covered(i.id) when 'uncovered' then not private.covered(i.id)
 when 'upcoming' then exists(select 1 from private.current_dates d where d.item_id=i.id and (p_template not in ('category:maintenance','category:insurance') or private.reminder_date_matches(i.template_key,i.reminder_preset,d.kind,substring(p_template from 10))) and d.expires_on between t and t+30)
 when 'overdue' then exists(select 1 from private.current_dates d where d.item_id=i.id and (p_template not in ('category:maintenance','category:insurance') or private.reminder_date_matches(i.template_key,i.reminder_preset,d.kind,substring(p_template from 10))) and d.expires_on<t)
 when 'incomplete' then exists(select 1 from jsonb_array_elements(private.item_readiness(i)) c where c->>'state' not in ('complete','not_applicable'))
 when 'dates' then exists(select 1 from private.current_dates d where d.item_id=i.id and (p_template not in ('category:maintenance','category:insurance') or private.reminder_date_matches(i.template_key,i.reminder_preset,d.kind,substring(p_template from 10)))) else true end end
 order by i.created_at desc,i.id desc limit 25) i;
 return result;
end $$;
revoke all on function private.item_readiness(public.items),private.item_json(public.items),private.item_json_before_insights(public.items),private.payment_date(text,text,text),private.payment_rows(uuid,date),private.item_search_matches(public.items,text,text) from public,anon,authenticated,service_role;
revoke all on function public.set_readiness_preference(uuid,integer,text,text),public.save_important_date(uuid,uuid,integer,jsonb),public.set_occurrence_amount(uuid,integer,bigint,text),public.household_payment_plan(date,uuid),public.household_insights() from public,anon,authenticated,service_role;
grant execute on function public.set_readiness_preference(uuid,integer,text,text),public.save_important_date(uuid,uuid,integer,jsonb),public.set_occurrence_amount(uuid,integer,bigint,text),public.household_payment_plan(date,uuid),public.household_insights() to authenticated;
comment on function public.household_insights() is 'keeply:household-insights-v1';
comment on function public.list_items(text,text,text,timestamptz,uuid) is 'keeply:expanded-search-v1';
commit;
