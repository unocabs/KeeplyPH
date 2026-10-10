-- Shared projection foundation. Public response shapes and entitlement rules stay unchanged.
begin;

create function private.household_planning_rows(u uuid,t date,horizon integer)
returns table(item_id uuid,product_name text,date_id uuid,label text,occurrence_id uuid,due_on date,amount_minor bigint,certainty text,projected boolean,cost_expected boolean,kind text,reporting_category text)
language sql stable security definer set search_path='' as $$
 with recursive source as (
   select i.id item_id,i.product_name,d.id date_id,d.label,d.kind,
     private.reminder_category(i.template_key,i.reminder_preset) reporting_category,
     d.payment_amount_minor,d.payment_amount_certainty,d.recurrence_months,d.recurrence_anchor,d.recurrence_ends_on,d.recurrence_policy,
     o.id occurrence_id,o.due_on,o.expected_amount_minor,o.amount_certainty,
     coalesce(private.payment_date(i.reminder_preset,d.kind,d.label),false)
       or d.payment_amount_minor is not null or o.expected_amount_minor is not null cost_expected
   from public.items i
   join public.important_dates d on d.item_id=i.id and d.user_id=u
   join public.date_occurrences o on o.date_id=d.id and o.user_id=u and o.status='open'
   where i.user_id=u and i.state='saved' and i.archived_at is null
 ), future as (
   select s.date_id,private.next_recurring_date(s.recurrence_anchor,greatest(s.due_on,t-1),s.recurrence_months,s.recurrence_ends_on) due,1 n
   from source s where s.recurrence_months is not null and s.recurrence_policy='fixed'
   union all
   select f.date_id,private.next_recurring_date(s.recurrence_anchor,f.due,s.recurrence_months,s.recurrence_ends_on),f.n+1
   from future f join source s on s.date_id=f.date_id where f.due<t+horizon and f.n<13
 ), candidates as (
   select s.*,s.due_on planned_on,false projected from source s where s.due_on between t and t+horizon
   union all
   select s.*,f.due,true from source s join future f on f.date_id=s.date_id
   where f.due between t and t+horizon and not exists(
     select 1 from public.date_occurrences x
     where x.date_id=s.date_id and x.due_on=f.due and x.status in ('completed','skipped','superseded')
   )
 )
 select c.item_id,c.product_name,c.date_id,c.label,case when not c.projected then c.occurrence_id end,c.planned_on,
   case when not c.projected and c.amount_certainty is not null then c.expected_amount_minor else c.payment_amount_minor end,
   case when not c.projected and c.amount_certainty is not null then c.amount_certainty
     when c.payment_amount_minor is null then 'unset' else c.payment_amount_certainty end,
   c.projected,c.cost_expected,c.kind,c.reporting_category
 from candidates c
$$;

-- Keep both existing contracts as wrappers over the same authorised projection.
create or replace function private.household_planner_rows(u uuid,t date,horizon integer)
returns table(item_id uuid,product_name text,date_id uuid,label text,occurrence_id uuid,due_on date,amount_minor bigint,certainty text,projected boolean,cost_expected boolean,kind text)
language sql stable security definer set search_path='' as $$
 select r.item_id,r.product_name,r.date_id,r.label,r.occurrence_id,r.due_on,r.amount_minor,r.certainty,r.projected,r.cost_expected,r.kind
 from private.household_planning_rows(u,t,horizon) r
$$;

create or replace function private.payment_rows(u uuid,t date)
returns table(item_id uuid,product_name text,date_id uuid,label text,occurrence_id uuid,due_on date,amount_minor bigint,certainty text,projected boolean)
language sql stable security definer set search_path='' as $$
 select r.item_id,r.product_name,r.date_id,r.label,r.occurrence_id,r.due_on,r.amount_minor,r.certainty,r.projected
 from private.household_planning_rows(u,t,30) r where r.cost_expected
$$;

revoke all on function private.household_planning_rows(uuid,date,integer),private.household_planner_rows(uuid,date,integer),private.payment_rows(uuid,date)
 from public,anon,authenticated,service_role;
comment on function private.household_planning_rows(uuid,date,integer) is 'keeply:shared-household-planning-v1';
comment on function private.household_planner_rows(uuid,date,integer) is 'keeply:shared-household-planning-v1';
comment on function private.payment_rows(uuid,date) is 'keeply:shared-household-planning-v1';
commit;
