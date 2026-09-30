-- Preserve existing schedules while allowing optional end dates and shared repeat controls.
begin;
alter table public.important_dates drop constraint valid_recurrence;
alter table public.important_dates add constraint valid_recurrence check (
  (recurrence_months is null and recurrence_anchor is null and recurrence_ends_on is null)
  or (recurrence_months is not null and recurrence_anchor is not null
      and recurrence_anchor between date '1900-01-01' and date '2200-12-31'
      and (recurrence_ends_on is null or recurrence_ends_on between recurrence_anchor and date '2200-12-31'))
);

create or replace function private.next_recurring_date(anchor_date date, after_date date, months integer, end_date date)
returns date language plpgsql immutable set search_path='' as $$
declare n integer; candidate date;
begin
 if anchor_date is null or after_date is null or months is null or months not in (1,3,6,12) then return null; end if;
 n:=greatest(0,floor(((extract(year from after_date)-extract(year from anchor_date))*12
      +extract(month from after_date)-extract(month from anchor_date))/months)::integer);
 candidate:=(anchor_date+make_interval(months=>n*months))::date;
 if candidate<=after_date then candidate:=(anchor_date+make_interval(months=>(n+1)*months))::date; end if;
 return case when candidate<=coalesce(end_date,date '2200-12-31') then candidate end;
end $$;


create or replace function public.save_important_date(p_id uuid,p_item_id uuid,p_revision integer,p_data jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); old public.important_dates; active_due date;
 months integer; anchor_date date; end_date date; amount bigint; due date:=(p_data->>'due_on')::date;
begin
 -- Lock the account before date rows, as coverage changes do.
 perform 1 from public.profiles where id=u for update;
 select * into old from public.important_dates where id=p_id and user_id=u and item_id=p_item_id for update;
 select due_on into active_due from public.date_occurrences where date_id=old.id and status='open';
 months:=case when p_data ? 'recurrence_months' then (p_data->>'recurrence_months')::integer else old.recurrence_months end;
 end_date:=case when p_data ? 'recurrence_ends_on' then (p_data->>'recurrence_ends_on')::date else old.recurrence_ends_on end;
 amount:=case when p_data ? 'payment_amount_minor' then (p_data->>'payment_amount_minor')::bigint else old.payment_amount_minor end;
 if amount is not null and (amount<0 or amount>99999999999 or (p_data->>'payment_amount_minor')::numeric<>amount) then raise exception 'INVALID_INPUT'; end if;
 if months is not null then
   if months not in (1,3,6,12) or (end_date is not null and (end_date<due or end_date>date '2200-12-31'))
     or exists(select 1 from jsonb_array_elements(p_data->'offsets') r where r->>'unit'<>'days' or (r->>'value')::integer>27)
   then raise exception 'INVALID_INPUT'; end if;
   anchor_date:=case when old.recurrence_months=months and active_due=due then old.recurrence_anchor else due end;
 else anchor_date:=null; end_date:=null;
 end if;
 -- Clear old metadata inside this transaction before a possible kind change.
 -- The base save still checks ownership/revision; any failure rolls this back.
 update public.important_dates set recurrence_months=null,recurrence_anchor=null,recurrence_ends_on=null
   where id=old.id and user_id=u;
 perform private.save_important_date_base(p_id,p_item_id,p_revision,p_data);
 update public.important_dates set recurrence_months=months,recurrence_anchor=anchor_date,recurrence_ends_on=end_date,payment_amount_minor=amount where id=p_id and user_id=u;
 return p_id;
end $$;


-- Retain the existing atomic save, ownership checks and optimistic revision checks.
alter table public.items add column reminder_preset text;
alter table public.items add constraint valid_reminder_preset check (
  reminder_preset is null or (template_key='other' and reminder_preset in ('life-insurance','health-insurance','vehicle-insurance','home-insurance','travel-insurance','other-insurance','internet-bill','mobile-bill','rent','association-dues','other-bill','streaming','software','gym','professional-membership','other-subscription','appliance-service','home-maintenance','pest-control','other-service','medical-appointment','dental-appointment','checkup','vaccination','other-appointment','tuition','enrollment','school-fees','other-school-deadline','personal-loan','home-loan','car-loan','motorcycle-loan','salary-government-loan','credit-card-installment','business-loan','digital-online-loan','other-loan','umid','national-id','prc-license','postal-id','pwd-solo-parent-id','other-id','police-clearance','nbi-clearance','water-bill','electric-bill','car-payment'))
);
alter function public.save_item_with_date(uuid,integer,text,text,jsonb) rename to save_item_with_date_base;
alter function public.save_item_with_date_base(uuid,integer,text,text,jsonb) set schema private;
revoke all on function private.save_item_with_date_base(uuid,integer,text,text,jsonb) from public,anon,authenticated,service_role;
create function public.save_item_with_date(p_id uuid,p_revision integer,p_label text,p_notes text,p_date jsonb default null,p_preset text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();
begin
 perform private.save_item_with_date_base(p_id,p_revision,p_label,p_notes,p_date);
 if p_preset is not null then
   update public.items set reminder_preset=nullif(p_preset,'') where id=p_id and user_id=u;
 end if;
 return p_id;
end $$;
revoke all on function public.save_item_with_date(uuid,integer,text,text,jsonb,text) from public,anon;
grant execute on function public.save_item_with_date(uuid,integer,text,text,jsonb,text) to authenticated;

create function private.reminder_category(template text,preset text) returns text
language sql immutable set search_path='' as $$
 select case
 when preset in ('life-insurance','health-insurance','vehicle-insurance','home-insurance','travel-insurance','other-insurance') then 'insurance'
 when preset in ('electric-bill','water-bill','internet-bill','mobile-bill','rent','association-dues','other-bill') then 'bills'
 when preset in ('personal-loan','home-loan','car-loan','motorcycle-loan','salary-government-loan','credit-card-installment','business-loan','digital-online-loan','other-loan','car-payment') then 'loans'
 when preset in ('streaming','software','gym','professional-membership','other-subscription') then 'subscriptions'
 when preset in ('prc-license','postal-id','pwd-solo-parent-id','umid','national-id','other-id','nbi-clearance','police-clearance') then 'documents'
 when preset in ('appliance-service','home-maintenance','pest-control','other-service') then 'maintenance'
 when preset in ('medical-appointment','dental-appointment','checkup','vaccination','other-appointment') then 'health'
 when preset in ('tuition','enrollment','school-fees','other-school-deadline') then 'education'
 else case template when 'receipt' then 'purchases' when 'car' then 'vehicles'
 when 'motorcycle' then 'vehicles' when 'licence' then 'documents' when 'passport' then 'documents'
 when 'aircon' then 'maintenance' else 'custom' end end
$$;
revoke all on function private.reminder_category(text,text) from public,anon,authenticated,service_role;

create or replace function public.list_items(p_filter text default 'all',p_query text default '',p_template text default 'all',p_cursor timestamptz default null,p_cursor_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); t date; result jsonb;
begin
 perform private.trim_reminders(u);
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 select coalesce(jsonb_agg(private.item_json(i) order by i.created_at desc,i.id desc),'[]'::jsonb) into result from (
 select i.* from public.items i where i.user_id=u
 and (p_template='all' or i.template_key=p_template or 'category:'||private.reminder_category(i.template_key,i.reminder_preset)=p_template)
 and (p_query='' or replace(i.reminder_preset,'-',' ') ilike '%'||left(p_query,160)||'%' or private.reminder_category(i.template_key,i.reminder_preset) ilike '%'||left(p_query,160)||'%' or i.product_name ilike '%'||left(p_query,160)||'%' or i.template_key ilike '%'||left(p_query,160)||'%' or exists(select 1 from private.current_dates d where d.item_id=i.id and (d.label ilike '%'||left(p_query,160)||'%' or d.expires_on::text=left(p_query,160))))
 and (p_cursor is null or (i.created_at,i.id)<(p_cursor,p_cursor_id))
 and case p_filter when 'archived' then i.archived_at is not null when 'drafts' then i.state='draft'
 else i.state='saved' and i.archived_at is null and
 case p_filter when 'reminders' then private.covered(i.id) when 'uncovered' then not private.covered(i.id)
 when 'upcoming' then exists(select 1 from private.current_dates d where d.item_id=i.id and d.expires_on between t and t+30)
 when 'overdue' then exists(select 1 from private.current_dates d where d.item_id=i.id and d.expires_on<t)
 when 'dates' then exists(select 1 from private.current_dates d where d.item_id=i.id) else true end end
 order by i.created_at desc,i.id desc limit 25) i;
 return result;
end $$;
commit;
