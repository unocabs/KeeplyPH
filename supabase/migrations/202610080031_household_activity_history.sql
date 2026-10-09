-- Additive history/lifecycle release. Pause both workers during this transaction.
begin;

alter table public.important_dates add column recurrence_policy text not null default 'fixed'
 check(recurrence_policy in ('fixed','from_completion'));
alter table public.important_dates add constraint completion_policy_service_only
 check(recurrence_policy='fixed' or kind='service');
alter table public.date_occurrences drop constraint date_occurrences_status_check;
alter table public.date_occurrences add constraint date_occurrences_status_check
 check(status in ('open','completed','superseded','unconfirmed','skipped'));
alter table public.date_occurrences add constraint occurrence_owner_identity unique(id,user_id);

create table public.item_activities(
 id uuid primary key default gen_random_uuid(), user_id uuid not null,
 item_id uuid not null, occurrence_id uuid unique, scheduled_on date,
 activity_type text not null check(activity_type in ('payment','service','renewal','repair','completion','note','warranty_closed')),
 title text not null check(char_length(btrim(title)) between 1 and 160),
 completed_on date not null check(completed_on between date '1900-01-01' and date '2200-12-31'),
 amount_minor bigint check(amount_minor between 0 and 99999999999),
 currency text not null default 'PHP' check(currency='PHP'),
 notes text check(char_length(notes)<=5000), actor_id uuid references public.profiles(id) on delete set null,
 source text not null default 'recorded' check(source in ('recorded','legacy_completion')),
 revision integer not null default 1, voided_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(id,user_id),foreign key(item_id,user_id) references public.items(id,user_id) on delete cascade,
 foreign key(occurrence_id,user_id) references public.date_occurrences(id,user_id) on delete cascade,
 check((occurrence_id is null)=(scheduled_on is null))
);
create index activity_history_idx on public.item_activities(user_id,item_id,completed_on desc,created_at desc,id desc);
create table public.activity_documents(
 activity_id uuid not null references public.item_activities(id) on delete cascade,
 document_id uuid not null references public.documents(id) on delete cascade,
 primary key(activity_id,document_id)
);
create index activity_document_idx on public.activity_documents(document_id);
create table private.activity_revisions(
 id bigint generated always as identity primary key,
 activity_id uuid not null references public.item_activities(id) on delete cascade,
 actor_id uuid references public.profiles(id) on delete set null,
 before_data jsonb not null,after_data jsonb not null,reason text not null,
 created_at timestamptz not null default now()
);
create table private.occurrence_reviews(
 id uuid primary key,occurrence_id uuid not null references public.date_occurrences(id) on delete cascade,
 actor_id uuid not null references public.profiles(id) on delete cascade,
 reason text not null check(char_length(btrim(reason)) between 1 and 1000),resolution text not null check(resolution in ('skipped','reopened')),created_at timestamptz not null default now()
);
create table private.activity_requests(
 id uuid primary key,user_id uuid not null references public.profiles(id) on delete cascade,
 item_id uuid not null references public.items(id) on delete cascade,
 payload jsonb not null,result_id uuid not null references public.item_activities(id) on delete cascade
);

alter table public.item_activities enable row level security;
alter table public.activity_documents enable row level security;
create policy own_activities on public.item_activities for select to authenticated
 using(user_id=auth.uid() and private.active_account());
create policy own_activity_documents on public.activity_documents for select to authenticated
 using(exists(select 1 from public.item_activities a where a.id=activity_id and a.user_id=auth.uid()) and private.active_account());
revoke all on public.item_activities,public.activity_documents from public,anon,authenticated;
grant select on public.item_activities,public.activity_documents to authenticated;
grant all on public.item_activities,public.activity_documents to service_role;

-- Compatibility capture: only facts explicitly present in a completed occurrence.
create function private.capture_occurrence_activity() returns trigger
language plpgsql security definer set search_path='' as $$
declare d public.important_dates;
begin
 if new.status<>'completed' then return new; end if;
 select * into d from public.important_dates where id=new.date_id;
 insert into public.item_activities(user_id,item_id,occurrence_id,scheduled_on,activity_type,title,completed_on,actor_id,source)
 values(new.user_id,d.item_id,new.id,new.due_on,'completion',d.label,new.completed_on,auth.uid(),'legacy_completion')
 on conflict(occurrence_id) do nothing;
 return new;
end $$;
create trigger occurrence_activity after insert or update of status,completed_on on public.date_occurrences
 for each row execute function private.capture_occurrence_activity();
insert into public.item_activities(user_id,item_id,occurrence_id,scheduled_on,activity_type,title,completed_on,source)
 select o.user_id,d.item_id,o.id,o.due_on,'completion',d.label,o.completed_on,'legacy_completion'
 from public.date_occurrences o join public.important_dates d on d.id=o.date_id where o.status='completed';

create function private.link_activity_documents(p_activity uuid,p_item uuid,u uuid,p_documents jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare doc uuid;
begin
 if jsonb_typeof(p_documents)<>'array' or jsonb_array_length(p_documents)>6 then raise exception 'INVALID_INPUT'; end if;
 for doc in select value::uuid from jsonb_array_elements_text(p_documents) loop
   if not exists(select 1 from public.documents where id=doc and user_id=u and purchase_id=p_item and state='ready')
   then raise exception 'INVALID_DOCUMENT'; end if;
 end loop;
 delete from public.activity_documents where activity_id=p_activity;
 insert into public.activity_documents select p_activity,value::uuid from jsonb_array_elements_text(p_documents) on conflict do nothing;
end $$;

create function private.validate_activity(p_data jsonb,t date) returns void
language plpgsql immutable set search_path='' as $$
declare amount numeric;
begin
 if jsonb_typeof(p_data)<>'object' or p_data->>'title' is null or char_length(btrim(p_data->>'title')) not between 1 and 160
 or p_data->>'completed_on' is null or (p_data->>'completed_on')::date not between date '1900-01-01' and least(t,date '2200-12-31')
 or p_data->>'activity_type' is null or p_data->>'activity_type' not in ('payment','service','renewal','repair','completion','note','warranty_closed')
 or char_length(coalesce(p_data->>'notes',''))>5000 or coalesce(p_data->>'currency','PHP')<>'PHP'
 then raise exception 'INVALID_INPUT'; end if;
 amount:=(p_data->>'amount_minor')::numeric;
 if amount is not null and (amount<>trunc(amount) or amount not between 0 and 99999999999) then raise exception 'INVALID_INPUT'; end if;
end $$;

-- One transaction and account-first locks, matching the existing scheduler.
create function public.complete_occurrence(p_request uuid,p_occurrence uuid,p_revision integer,p_data jsonb,p_next date default null,p_policy text default 'fixed') returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();o public.date_occurrences;d public.important_dates;i public.items;t date;
 request_data jsonb; previous private.activity_requests; a public.item_activities; next_date date; anchor date;result_id uuid;before_data jsonb;
begin
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 perform private.validate_activity(p_data,t);
 if p_revision is null or p_revision<1 or p_request is null or p_policy is null or p_policy not in ('fixed','from_completion','manual','stop') then raise exception 'INVALID_INPUT'; end if;
 request_data:=jsonb_build_object('occurrence',p_occurrence,'data',p_data,'next',p_next,'policy',p_policy);
 select * into previous from private.activity_requests where id=p_request;
 if found then
   if previous.user_id<>u then raise exception 'NOT_FOUND'; end if;
   if previous.payload<>request_data then raise exception 'REQUEST_CONFLICT'; end if;
   return previous.result_id;
 end if;
 select * into o from public.date_occurrences where id=p_occurrence and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 select * into d from public.important_dates where id=o.date_id and user_id=u for update;
 select * into i from public.items where id=d.item_id and user_id=u;
 if i.state<>'saved' or i.archived_at is not null then raise exception 'ITEM_ARCHIVED'; end if;
 select * into a from public.item_activities where occurrence_id=o.id;
 if found and a.voided_at is null then raise exception 'ALREADY_COMPLETED'; end if;
 if d.revision<>p_revision or o.status not in ('open','unconfirmed') then raise exception 'CONFLICT'; end if;
 if o.status='unconfirmed' and (p_next is not null or p_policy not in ('fixed','from_completion')) then raise exception 'INVALID_INPUT'; end if;
 if d.kind='warranty' and (p_next is not null or p_policy not in ('fixed','stop')) then raise exception 'INVALID_INPUT'; end if;
 if p_policy='from_completion' and d.kind<>'service' then raise exception 'INVALID_INPUT'; end if;
 if p_policy='stop' and p_next is not null then raise exception 'INVALID_INPUT'; end if;
 if p_next is not null and (p_next<=(p_data->>'completed_on')::date or p_next>date '2200-12-31') then raise exception 'INVALID_INPUT'; end if;
 perform private.rate_limit(u,'write',30);
 result_id:=coalesce(a.id,p_request);
 if a.id is null then
   insert into public.item_activities(id,user_id,item_id,occurrence_id,scheduled_on,activity_type,title,completed_on,amount_minor,notes,actor_id)
   values(result_id,u,d.item_id,o.id,o.due_on,p_data->>'activity_type',btrim(p_data->>'title'),(p_data->>'completed_on')::date,(p_data->>'amount_minor')::bigint,nullif(p_data->>'notes',''),u);
 else
   before_data:=to_jsonb(a)||jsonb_build_object('document_ids',(select coalesce(jsonb_agg(document_id),'[]'::jsonb) from public.activity_documents where activity_id=a.id));
   update public.item_activities set activity_type=p_data->>'activity_type',title=btrim(p_data->>'title'),completed_on=(p_data->>'completed_on')::date,
    amount_minor=(p_data->>'amount_minor')::bigint,notes=nullif(p_data->>'notes',''),voided_at=null,revision=revision+1,updated_at=now() where id=a.id;
 end if;
 perform private.link_activity_documents(result_id,d.item_id,u,coalesce(p_data->'document_ids','[]'::jsonb));
 if a.id is not null then
   insert into private.activity_revisions(activity_id,actor_id,before_data,after_data,reason)
   select a.id,u,before_data,to_jsonb(x)||jsonb_build_object('document_ids',coalesce(p_data->'document_ids','[]'::jsonb)),'Completion recorded again after removal' from public.item_activities x where id=a.id;
 end if;
 update public.date_occurrences set status='completed',completed_on=(p_data->>'completed_on')::date,snoozed_on=null where id=o.id;
 if o.status='open' then
   if p_policy='stop' then
     update public.important_dates set recurrence_months=null,recurrence_anchor=null,recurrence_ends_on=null,recurrence_policy='fixed' where id=d.id;
   elsif p_policy='manual' then
     next_date:=p_next;
     if d.recurrence_months is not null then raise exception 'INVALID_INPUT'; end if;
   elsif d.recurrence_months is not null then
     anchor:=case when p_policy='from_completion' then (p_data->>'completed_on')::date else d.recurrence_anchor end;
     next_date:=private.next_recurring_date(anchor,case when p_policy='from_completion' then anchor else o.due_on end,d.recurrence_months,d.recurrence_ends_on);
     if p_next is not null then raise exception 'INVALID_INPUT'; end if;
     if p_policy='from_completion' and d.recurrence_ends_on is not null and d.recurrence_ends_on<anchor then next_date:=null;
     else update public.important_dates set recurrence_anchor=anchor,recurrence_policy=p_policy where id=d.id; end if;
   else
     next_date:=p_next;
     if p_policy='from_completion' and p_next is null and d.interval_months is not null then
       next_date:=((p_data->>'completed_on')::date+make_interval(months=>d.interval_months))::date;
     end if;
   end if;
   if next_date is not null then
     if next_date>date '2200-12-31' then raise exception 'INVALID_INPUT'; end if;
     insert into public.date_occurrences(date_id,user_id,cycle,due_on)
     values(d.id,u,(select max(cycle)+1 from public.date_occurrences where date_id=d.id),next_date);
   end if;
 end if;
 update public.important_dates set revision=revision+1,updated_at=now() where id=d.id;
 perform private.trim_reminders(u);perform private.schedule_date(d.id);
 insert into private.activity_requests values(p_request,u,d.item_id,request_data,result_id);
 return result_id;
end $$;

create function public.save_item_activity(p_id uuid,p_item uuid,p_revision integer,p_data jsonb,p_reason text default null,p_request uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();a public.item_activities;i public.items;t date; request_data jsonb;previous private.activity_requests;after_data jsonb;before_data jsonb;
begin
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 perform private.validate_activity(p_data,t);
 select * into i from public.items where id=p_item and user_id=u;
 if not found then raise exception 'NOT_FOUND'; end if;
 if i.state<>'saved' or i.archived_at is not null then raise exception 'ITEM_ARCHIVED'; end if;
 if p_id is null or p_revision is null or p_revision<0 then raise exception 'INVALID_INPUT'; end if;
 if p_revision>0 and p_request is not null then
   request_data:=jsonb_build_object('activity',p_id,'revision',p_revision,'data',p_data,'reason',p_reason);
   select * into previous from private.activity_requests where id=p_request;
   if found then
     if previous.user_id<>u then raise exception 'NOT_FOUND'; end if;
     if previous.payload<>request_data then raise exception 'REQUEST_CONFLICT'; end if;
     return previous.result_id;
   end if;
 end if;
 select * into a from public.item_activities where id=p_id and user_id=u for update;
 if p_revision=0 then
   request_data:=jsonb_build_object('item',p_item,'data',p_data);
   select * into previous from private.activity_requests where id=p_id;
   if found then
     if previous.user_id<>u then raise exception 'NOT_FOUND'; end if;
     if previous.payload<>request_data then raise exception 'REQUEST_CONFLICT'; end if;
     return previous.result_id;
   end if;
   if a.id is not null then raise exception 'CONFLICT'; end if;
   insert into public.item_activities(id,user_id,item_id,activity_type,title,completed_on,amount_minor,notes,actor_id)
   values(p_id,u,p_item,p_data->>'activity_type',btrim(p_data->>'title'),(p_data->>'completed_on')::date,(p_data->>'amount_minor')::bigint,nullif(p_data->>'notes',''),u);
   perform private.link_activity_documents(p_id,p_item,u,coalesce(p_data->'document_ids','[]'::jsonb));
   insert into private.activity_requests values(p_id,u,p_item,request_data,p_id);
 else
   if a.id is null or a.item_id<>p_item then raise exception 'NOT_FOUND'; end if;
   if a.revision<>p_revision or a.voided_at is not null then raise exception 'CONFLICT'; end if;
   if char_length(btrim(coalesce(p_reason,''))) not between 1 and 1000 then raise exception 'REASON_REQUIRED'; end if;
   before_data:=to_jsonb(a)||jsonb_build_object('document_ids',(select coalesce(jsonb_agg(document_id),'[]'::jsonb) from public.activity_documents where activity_id=a.id));
   update public.item_activities set activity_type=p_data->>'activity_type',title=btrim(p_data->>'title'),completed_on=(p_data->>'completed_on')::date,
    amount_minor=(p_data->>'amount_minor')::bigint,notes=nullif(p_data->>'notes',''),revision=revision+1,updated_at=now() where id=p_id;
   perform private.link_activity_documents(p_id,p_item,u,coalesce(p_data->'document_ids','[]'::jsonb));
   if a.occurrence_id is not null then
     update public.date_occurrences set completed_on=(p_data->>'completed_on')::date where id=a.occurrence_id and status='completed';
   end if;
   select to_jsonb(x)||jsonb_build_object('document_ids',coalesce(p_data->'document_ids','[]'::jsonb)) into after_data from public.item_activities x where id=p_id;
   insert into private.activity_revisions(activity_id,actor_id,before_data,after_data,reason) values(p_id,u,before_data,after_data,btrim(p_reason));
   if p_request is not null then insert into private.activity_requests values(p_request,u,p_item,request_data,p_id); end if;
 end if;
 perform private.rate_limit(u,'write',30);
 return p_id;
end $$;

create function public.activity_corrections(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();result jsonb;
begin
 if not exists(select 1 from public.item_activities where id=p_id and user_id=u) then raise exception 'NOT_FOUND'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('created_at',r.created_at,'reason',r.reason,'before',r.before_data,'after',r.after_data) order by r.id desc),'[]'::jsonb)
 into result from (select * from private.activity_revisions where activity_id=p_id order by id desc limit 20) r;
 return result;
end $$;

create function public.unconfirmed_occurrence_summary(p_before date default null,p_before_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();result jsonb;total bigint;more boolean;
begin
 select count(*) into total from public.date_occurrences o join public.important_dates d on d.id=o.date_id join public.items i on i.id=d.item_id
 where o.user_id=u and o.status='unconfirmed' and i.state='saved' and i.archived_at is null;
 if (p_before is null)<>(p_before_id is null) then raise exception 'INVALID_INPUT'; end if;
 with page as (
   select o.id as occurrence_id,o.due_on,d.id as date_id,d.label,i.id as item_id,i.product_name
   from public.date_occurrences o join public.important_dates d on d.id=o.date_id join public.items i on i.id=d.item_id
   where o.user_id=u and o.status='unconfirmed' and i.state='saved' and i.archived_at is null
   and (p_before is null or (o.due_on,o.id)>(p_before,p_before_id)) order by o.due_on,o.id limit 21
 ), visible as(select * from page order by due_on,occurrence_id limit 20)
 select (select count(*)>20 from page),coalesce((select jsonb_agg(to_jsonb(x) order by x.due_on,x.occurrence_id) from visible x),'[]'::jsonb) into more,result;
 return jsonb_build_object('total',total,'rows',result,'has_more',more);
end $$;

create function public.void_item_activity(p_id uuid,p_revision integer,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();a public.item_activities;after_data jsonb;before_data jsonb;
begin
 select * into a from public.item_activities where id=p_id and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if p_revision is null or p_revision<1 then raise exception 'INVALID_INPUT'; end if;
 if a.voided_at is not null then return; end if;
 if a.revision<>p_revision then raise exception 'CONFLICT'; end if;
 if char_length(btrim(coalesce(p_reason,''))) not between 1 and 1000 then raise exception 'REASON_REQUIRED'; end if;
 perform private.rate_limit(u,'write',30);
 before_data:=to_jsonb(a)||jsonb_build_object('document_ids',(select coalesce(jsonb_agg(document_id),'[]'::jsonb) from public.activity_documents where activity_id=a.id));
 update public.item_activities set voided_at=now(),revision=revision+1,updated_at=now() where id=p_id;
 if a.occurrence_id is not null then
   update public.date_occurrences set status='unconfirmed',completed_on=null where id=a.occurrence_id;
   update public.important_dates set revision=revision+1,updated_at=now() where id=(select date_id from public.date_occurrences where id=a.occurrence_id);
 end if;
 select to_jsonb(x)||jsonb_build_object('document_ids',(select coalesce(jsonb_agg(document_id),'[]'::jsonb) from public.activity_documents where activity_id=a.id)) into after_data from public.item_activities x where id=p_id;
 insert into private.activity_revisions(activity_id,actor_id,before_data,after_data,reason) values(p_id,u,before_data,after_data,btrim(p_reason));
end $$;

create function public.skip_unconfirmed_occurrence(p_request uuid,p_occurrence uuid,p_revision integer,p_reason text,p_reopen boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();o public.date_occurrences;d public.important_dates;r private.occurrence_reviews;
begin
 if p_request is null or p_revision is null or p_revision<1 or char_length(btrim(coalesce(p_reason,''))) not between 1 and 1000 then raise exception 'REASON_REQUIRED'; end if;
 select * into r from private.occurrence_reviews where id=p_request;
 if found then
   if r.actor_id<>u then raise exception 'NOT_FOUND'; end if;
   if r.occurrence_id<>p_occurrence or r.reason<>btrim(p_reason) or r.resolution<>(case when p_reopen then 'reopened' else 'skipped' end) then raise exception 'REQUEST_CONFLICT'; end if;
   return;
 end if;
 select * into o from public.date_occurrences where id=p_occurrence and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 select * into d from public.important_dates where id=o.date_id and user_id=u for update;
 if exists(select 1 from public.items where id=d.item_id and (state<>'saved' or archived_at is not null)) then raise exception 'ITEM_ARCHIVED'; end if;
 if p_reopen is null or o.status<>(case when p_reopen then 'skipped' else 'unconfirmed' end) or d.revision<>p_revision then raise exception 'CONFLICT'; end if;
 perform private.rate_limit(u,'write',30);
 update public.date_occurrences set status=case when p_reopen then 'unconfirmed' else 'skipped' end where id=o.id;
 update public.important_dates set revision=revision+1,updated_at=now() where id=d.id;
 insert into private.occurrence_reviews(id,occurrence_id,actor_id,reason,resolution) values(p_request,p_occurrence,u,btrim(p_reason),case when p_reopen then 'reopened' else 'skipped' end);
end $$;

create function public.item_activity_history(p_item uuid,p_before timestamptz default null,p_before_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();result jsonb;more boolean;cursor_day date;
begin
 if not exists(select 1 from public.items where id=p_item and user_id=u) then raise exception 'NOT_FOUND'; end if;
 if (p_before is null)<>(p_before_id is null) then raise exception 'INVALID_INPUT'; end if;
 if p_before_id is not null then
   select completed_on into cursor_day from public.item_activities where id=p_before_id and item_id=p_item and user_id=u and created_at=p_before;
   if not found then raise exception 'INVALID_INPUT'; end if;
 end if;
 with page as (select * from public.item_activities where item_id=p_item and user_id=u
   and (p_before is null or (completed_on,created_at,id)<(cursor_day,p_before,p_before_id)) order by completed_on desc,created_at desc,id desc limit 21),
 visible as(select * from page order by completed_on desc,created_at desc,id desc limit 20)
 select (select count(*)>20 from page),coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('document_ids',
   coalesce((select jsonb_agg(document_id) from public.activity_documents where activity_id=a.id),'[]'::jsonb)) order by a.completed_on desc,a.created_at desc,a.id desc) from visible a),'[]'::jsonb)
 into more,result;
 return jsonb_build_object('activities',result,'has_more',more);
end $$;

create function private.normalize_recurrence_policy() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.kind<>'service' then new.recurrence_policy:='fixed'; end if;
 return new;
end $$;
create trigger normalize_recurrence_policy before update of kind on public.important_dates
 for each row execute function private.normalize_recurrence_policy();

-- Replace only the advancement eligibility; fixed schedules keep their exact behavior.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.advance_recurring_dates()'::regprocedure);
 if position('x.recurrence_months is not null' in definition)=0 then raise exception 'Unexpected recurring worker definition'; end if;
 definition:=replace(definition,'x.recurrence_months is not null','x.recurrence_months is not null and x.recurrence_policy=''fixed''');
 execute definition;
end $$;

revoke all on function private.normalize_recurrence_policy(),private.capture_occurrence_activity(),private.link_activity_documents(uuid,uuid,uuid,jsonb),private.validate_activity(jsonb,date) from public,anon,authenticated,service_role;
revoke all on function public.unconfirmed_occurrence_summary(date,uuid),public.activity_corrections(uuid),public.complete_occurrence(uuid,uuid,integer,jsonb,date,text),public.save_item_activity(uuid,uuid,integer,jsonb,text,uuid),public.void_item_activity(uuid,integer,text),public.skip_unconfirmed_occurrence(uuid,uuid,integer,text,boolean),public.item_activity_history(uuid,timestamptz,uuid) from public,anon,authenticated,service_role;
grant execute on function public.unconfirmed_occurrence_summary(date,uuid),public.activity_corrections(uuid),public.complete_occurrence(uuid,uuid,integer,jsonb,date,text),public.save_item_activity(uuid,uuid,integer,jsonb,text,uuid),public.void_item_activity(uuid,integer,text),public.skip_unconfirmed_occurrence(uuid,uuid,integer,text,boolean),public.item_activity_history(uuid,timestamptz,uuid) to authenticated;
comment on function public.complete_occurrence(uuid,uuid,integer,jsonb,date,text) is 'keeply:household-history-v1';
commit;
