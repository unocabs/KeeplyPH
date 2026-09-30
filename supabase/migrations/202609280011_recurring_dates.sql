-- Shared recurrence for custom important dates; loans are onboarding presets.
begin;
alter table public.important_dates
 add column recurrence_months integer check (recurrence_months in (1,3,6,12)),
 add column recurrence_anchor date,
 add column recurrence_ends_on date,
 add column payment_amount_minor bigint check (payment_amount_minor between 0 and 99999999999),
 add constraint valid_recurrence check (
   (recurrence_months is null and recurrence_anchor is null and recurrence_ends_on is null)
   or (recurrence_months is not null and recurrence_anchor is not null and recurrence_ends_on is not null
       and kind='other' and recurrence_anchor between date '1900-01-01' and date '2200-12-31'
       and recurrence_ends_on between recurrence_anchor and date '2200-12-31'));
alter table public.date_occurrences drop constraint date_occurrences_status_check;
alter table public.date_occurrences add constraint date_occurrences_status_check
 check (status in ('open','completed','superseded','unconfirmed'));
create index recurring_dates_idx on public.important_dates(id) where recurrence_months is not null;

create function private.next_recurring_date(anchor_date date, after_date date, months integer, end_date date)
returns date language plpgsql immutable set search_path='' as $$
declare n integer; candidate date;
begin
 if anchor_date is null or after_date is null or months is null or months not in (1,3,6,12) or end_date is null then return null; end if;
 n:=greatest(0,floor(((extract(year from after_date)-extract(year from anchor_date))*12
      +extract(month from after_date)-extract(month from anchor_date))/months)::integer);
 candidate:=(anchor_date+make_interval(months=>n*months))::date;
 if candidate<=after_date then candidate:=(anchor_date+make_interval(months=>(n+1)*months))::date; end if;
 return case when candidate<=end_date then candidate end;
end $$;

-- Keep the existing ownership, quota, revision and one-off save implementation.
alter function public.save_important_date(uuid,uuid,integer,jsonb) rename to save_important_date_base;
alter function public.save_important_date_base(uuid,uuid,integer,jsonb) set schema private;
revoke all on function private.save_important_date_base(uuid,uuid,integer,jsonb) from public,anon,authenticated,service_role;
create function public.save_important_date(p_id uuid,p_item_id uuid,p_revision integer,p_data jsonb)
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
   if months not in (1,3,6,12) or p_data->>'kind'<>'other' or end_date is null or end_date<due or end_date>date '2200-12-31'
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

-- Completion follows the original anchor, never the day someone marked it done.
alter function public.complete_date(uuid,integer,date,date) rename to complete_date_base;
alter function public.complete_date_base(uuid,integer,date,date) set schema private;
revoke all on function private.complete_date_base(uuid,integer,date,date) from public,anon,authenticated,service_role;
create function public.complete_date(p_id uuid,p_revision integer,p_completed date,p_next date)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); d public.important_dates; due date; next_date date;
begin
 perform 1 from public.profiles where id=u for update;
 select * into d from public.important_dates where id=p_id and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if d.recurrence_months is not null then
   if p_next is not null then raise exception 'INVALID_INPUT'; end if;
   select due_on into due from public.date_occurrences where date_id=p_id and status='open';
   next_date:=private.next_recurring_date(d.recurrence_anchor,due,d.recurrence_months,d.recurrence_ends_on);
   -- A late completion must not silently erase intervening unpaid dates.
   -- The recurring worker will catch those up as unconfirmed.
   if p_completed is not null and next_date<=p_completed then
     perform private.complete_date_base(p_id,p_revision,p_completed,null);
     insert into public.date_occurrences(date_id,user_id,cycle,due_on)
       values(p_id,u,(select max(cycle)+1 from public.date_occurrences where date_id=p_id),next_date);
     perform private.schedule_date(p_id);
   else perform private.complete_date_base(p_id,p_revision,p_completed,next_date);
   end if;
 else perform private.complete_date_base(p_id,p_revision,p_completed,p_next);
 end if;
end $$;

-- Runs independently of email opt-in and coverage. No completed/paid status is inferred.
-- One active date and its upcoming alerts share the existing item slot.
create function public.advance_recurring_dates() returns integer language plpgsql security definer set search_path='' as $$
declare candidate record; d public.important_dates; o public.date_occurrences; today_local date;
 next_date date; advanced integer:=0; steps integer;
begin
 for candidate in
   select x.id,x.user_id from public.important_dates x
   join public.date_occurrences c on c.date_id=x.id and c.status='open'
   join public.profiles p on p.id=x.user_id join public.items i on i.id=x.item_id
   where x.recurrence_months is not null and c.due_on<(now() at time zone p.timezone)::date
     and p.deletion_requested_at is null and i.state='saved' and i.archived_at is null
   order by c.due_on,x.id limit 40
 loop
   -- Consistent account-first locks; another worker may already be handling this owner.
   perform 1 from public.profiles where id=candidate.user_id and deletion_requested_at is null for update skip locked;
   if not found then continue; end if;
   select x.* into d from public.important_dates x join public.items i on i.id=x.item_id
     where x.id=candidate.id and x.recurrence_months is not null and i.archived_at is null and i.state='saved' for update of x;
   if not found then continue; end if;
   select (now() at time zone timezone)::date into today_local from public.profiles where id=d.user_id;
   steps:=0;
   loop
     select * into o from public.date_occurrences where date_id=d.id and status='open';
     exit when not found or o.due_on>=today_local or steps>=120;
     update public.date_occurrences set status='unconfirmed' where id=o.id;
     next_date:=private.next_recurring_date(d.recurrence_anchor,o.due_on,d.recurrence_months,d.recurrence_ends_on);
     if next_date is not null then
       insert into public.date_occurrences(date_id,user_id,cycle,due_on)
         values(d.id,d.user_id,(select max(cycle)+1 from public.date_occurrences where date_id=d.id),next_date);
     end if;
     steps:=steps+1;
   end loop;
   if steps>0 then
     update public.important_dates set revision=revision+1,updated_at=now() where id=d.id;
     perform private.trim_reminders(d.user_id);
     perform private.schedule_date(d.id);
     advanced:=advanced+1;
   end if;
 end loop;
 return advanced;
end $$;
revoke all on function private.next_recurring_date(date,date,integer,date) from public,anon,authenticated;
revoke all on function public.advance_recurring_dates() from public,anon,authenticated;
grant execute on function public.advance_recurring_dates() to service_role;
revoke all on function public.save_important_date(uuid,uuid,integer,jsonb),public.complete_date(uuid,integer,date,date) from public,anon;
grant execute on function public.save_important_date(uuid,uuid,integer,jsonb),public.complete_date(uuid,integer,date,date) to authenticated;
commit;
