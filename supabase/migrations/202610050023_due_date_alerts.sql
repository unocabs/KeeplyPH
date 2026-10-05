-- Due-date alerts use the existing zero-day timing and delivery queues.
-- Apply after the prerequisite check; do not rewrite historical migrations.
begin;
create or replace function private.save_important_date_base(p_id uuid,p_item_id uuid,p_revision integer,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
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
 if jsonb_typeof(p_data->'offsets') is distinct from 'array' or jsonb_array_length(p_data->'offsets') not between 0 and 4 then raise exception 'INVALID_INPUT'; end if;
 if enabled and jsonb_array_length(p_data->'offsets')=0 then raise exception 'INVALID_INPUT'; end if;
 if (select count(*) from jsonb_array_elements(p_data->'offsets') as timing(value)
     where timing.value->>'unit'<>'days' or (timing.value->>'value')::integer<>0)>3 then raise exception 'INVALID_INPUT'; end if;
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
 if enabled and not d.reminders_enabled then perform private.try_coverage(p_item_id,u); end if;
 perform private.trim_reminders(u); perform private.schedule_date(p_id); return p_id;
end $$;

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
   perform public.save_important_date(coalesce(d.id,gen_random_uuid()),p_id,coalesce(d.revision,0),p_warranty||jsonb_build_object('kind','warranty','label','Warranty','due_on',p_warranty->>'expires_on','offsets',coalesce(p_warranty->'offsets',(select jsonb_agg(jsonb_build_object('unit',unit,'value',value)) from public.reminder_offsets where date_id=d.id),'[{"unit":"days","value":30},{"unit":"days","value":7},{"unit":"days","value":1},{"unit":"days","value":0}]'::jsonb)));
 end if; return p_id;
end $$;


-- Keep every saved advance timing. Adding a timing does not enable a date or
-- allocate coverage, change revisions, or invalidate an occurrence's snooze.
insert into public.reminder_offsets(date_id,unit,value)
select id,'days',0 from public.important_dates
on conflict(date_id,unit,value) do nothing;

do $$
declare d record;
begin
 for d in select id from private.current_dates where reminders_enabled
 loop perform private.schedule_date(d.id); end loop;
end $$;

comment on function private.save_important_date_base(uuid,uuid,integer,jsonb) is 'keeply:due-date-alerts-v1';
revoke all on function private.save_important_date_base(uuid,uuid,integer,jsonb) from public,anon,authenticated,service_role;
commit;
