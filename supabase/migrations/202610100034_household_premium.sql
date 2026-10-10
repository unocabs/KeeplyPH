-- Household planning access is independent of file allowances and historical alert purchases.
begin;
create table private.household_premium_periods (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 origin text not null check(origin in ('installation','payment')),order_id uuid unique references private.billing_orders(id),
 starts_at timestamptz not null,ends_at timestamptz not null,live boolean,
 revoked boolean not null default false,celebrated_at timestamptz,
 check(ends_at>=starts_at),check((origin='installation' and live is null and order_id is null) or (origin='payment' and live is not null and order_id is not null))
);
create unique index household_install_once on private.household_premium_periods(user_id) where origin='installation';
create index household_premium_owner on private.household_premium_periods(user_id,ends_at);
alter table private.household_premium_periods enable row level security;
revoke all on private.household_premium_periods from public,anon,authenticated;

create function private.household_premium_until(u uuid) returns timestamptz language sql stable security definer set search_path='' as $$
 select greatest((select premium_until from public.account_entitlements where user_id=u),
 (select paid_until from private.reminder_packs where user_id=u and live=(select live from private.billing_settings)),
 (select max(ends_at) from private.household_premium_periods where user_id=u and not revoked and (live is null or live=(select live from private.billing_settings))))
$$;
create function private.household_premium(u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(private.household_premium_until(u)>now(),false) or exists(select 1 from private.reminder_packs where user_id=u and permanent and live=(select live from private.billing_settings))
$$;
-- Alerts remain opt-in, without a paid item-capacity boundary. Existing selections are preserved.
create or replace function private.slot_limit(u uuid) returns integer language sql stable security definer set search_path='' as $$ select 2147483647 $$;
alter function public.account_usage() rename to account_usage_before_household_premium;
create function public.account_usage() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); result jsonb;
begin
 result:=public.account_usage_before_household_premium();
 return result||jsonb_build_object('household_premium',private.household_premium(u),'household_premium_until',private.household_premium_until(u),
 'installation_premium_claimed',exists(select 1 from private.household_premium_periods where user_id=u and origin='installation'));
end $$;
create function public.activate_installation_premium(p_installed boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); r private.household_premium_periods; beginning timestamptz; activated boolean:=false;
begin
 perform 1 from public.profiles where id=u and deletion_requested_at is null for update;
 if not found then raise exception 'ACCOUNT_UNAVAILABLE';end if;
 if p_installed is distinct from true then raise exception 'INSTALLATION_REQUIRED';end if;
 select * into r from private.household_premium_periods where user_id=u and origin='installation';
 if not found then
 beginning:=greatest(now(),coalesce(private.household_premium_until(u),now()));
 insert into private.household_premium_periods(user_id,origin,starts_at,ends_at) values(u,'installation',beginning,beginning+interval '720 hours') returning * into r;activated:=true;
 end if;
 return jsonb_build_object('id',r.id,'activated',activated,'starts_at',r.starts_at,'ends_at',r.ends_at,'celebrate',r.celebrated_at is null and r.ends_at>now());
end $$;
create function public.acknowledge_installation_premium(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin update private.household_premium_periods set celebrated_at=coalesce(celebrated_at,now()) where id=p_id and user_id=private.require_user() and origin='installation';end $$;
-- Retire the old acquisition offer; existing two-slot rewards remain in account history.
create or replace function public.claim_install_reward(p_endpoint text,p_installed boolean) returns jsonb language plpgsql security definer set search_path='' as $$
begin return public.activate_installation_premium(p_installed);end $$;

-- Keep historical and delayed checkouts valid. New checkouts sell only household premium.
alter table private.billing_orders drop constraint billing_orders_pack_price;
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='private.billing_orders'::regclass and contype='c' and pg_get_constraintdef(oid) like '%product%' loop execute format('alter table private.billing_orders drop constraint %I',c.conname);end loop;
end $$;
alter table private.billing_orders add constraint billing_orders_household_price check(
 (product='legacy_year' and amount_minor=36000 and slot_count=5) or
 (product='slots_30' and amount_minor=2900*(slot_count/5)) or
 (product='slots_permanent' and amount_minor=24900*(slot_count/5)) or
 (product='premium_30' and amount_minor=5900 and slot_count=5) or
 (product='premium_year' and amount_minor=49900 and slot_count=5));
create function public.create_premium_order(p_user uuid,p_id uuid,p_product text,p_live boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare b private.billing_orders;
begin
 perform 1 from public.profiles where id=p_user and deletion_requested_at is null for update;if not found then raise exception 'ACCOUNT_UNAVAILABLE';end if;
 if p_live is distinct from (select live from private.billing_settings) then raise exception 'PAYMENT_MISMATCH';end if;
 if p_product is null or p_product not in ('premium_30','premium_year') then raise exception 'INVALID_INPUT';end if;
 perform private.rate_limit(p_user,'checkout',5,3600);
 select * into b from private.billing_orders where user_id=p_user and live=p_live and status='pending' and created_at>now()-interval '24 hours' order by created_at desc limit 1;
 if found then
 if b.product<>p_product then raise exception 'CHECKOUT_PENDING';end if;
 return to_jsonb(b)||jsonb_build_object('create_checkout',false);end if;
 insert into private.billing_orders(id,user_id,product,amount_minor,live,slot_count) values(p_id,p_user,p_product,case p_product when 'premium_30' then 5900 else 49900 end,p_live,5) returning * into b;
 return to_jsonb(b)||jsonb_build_object('create_checkout',true);
end $$;
-- The server decides whether a pending checkout is still resumable in this billing environment.
create or replace function public.get_billing_orders() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();result jsonb;
begin
 select coalesce(jsonb_agg(to_jsonb(b)),'[]'::jsonb) into result from(
 select id,product,slot_count,amount_minor,currency,status,created_at,period_starts_at,period_ends_at,
 (status='pending' and created_at>now()-interval '24 hours' and live=(select live from private.billing_settings)) can_resume
 from private.billing_orders where user_id=u order by created_at desc,id limit 20)b;
 return result;
end $$;
-- Stop new slot orders, but retain fulfillment/refund support for previous purchases.
create or replace function public.create_pack_order(p_user uuid,p_id uuid,p_product text,p_live boolean,p_slots integer default 5) returns jsonb language plpgsql security definer set search_path='' as $$ begin raise exception 'OFFER_RETIRED';end $$;
alter function public.credit_payment(text,uuid,text,text,bigint,text,boolean) rename to credit_payment_before_household_premium;
create function public.credit_payment(p_event_id text,p_order_id uuid,p_checkout_id text,p_payment_id text,p_amount bigint,p_currency text,p_live boolean) returns void language plpgsql security definer set search_path='' as $$
declare b private.billing_orders;u uuid;beginning timestamptz;ending timestamptz;
begin
 select user_id into u from private.billing_orders where id=p_order_id;
 perform 1 from public.profiles where id=u and deletion_requested_at is null for update;if not found then raise exception 'ACCOUNT_UNAVAILABLE';end if;
 select * into b from private.billing_orders where id=p_order_id for update;
 if b.product not in ('premium_30','premium_year') then perform public.credit_payment_before_household_premium(p_event_id,p_order_id,p_checkout_id,p_payment_id,p_amount,p_currency,p_live);return;end if;
 if p_live is distinct from (select live from private.billing_settings) or b.live is distinct from p_live or p_amount is distinct from b.amount_minor or p_currency is distinct from b.currency or b.provider_checkout_id is distinct from p_checkout_id or p_payment_id is null or (b.provider_payment_id is not null and b.provider_payment_id<>p_payment_id) or exists(select 1 from private.billing_orders where provider_payment_id=p_payment_id and id<>b.id) then raise exception 'PAYMENT_MISMATCH';end if;
 if exists(select 1 from private.billing_events where event_id=p_event_id) or b.credited_at is not null then return;end if;
 beginning:=greatest(now(),coalesce(private.household_premium_until(u),now()));
 ending:=beginning+case b.product when 'premium_30' then interval '720 hours' else interval '1 year' end;
 insert into private.household_premium_periods(user_id,origin,order_id,starts_at,ends_at,live) values(u,'payment',b.id,beginning,ending,p_live);
 insert into private.billing_events(event_id,order_id,event_type,provider_payment_id,status) values(p_event_id,b.id,'checkout_session.payment.paid',p_payment_id,'processed');
 update private.billing_orders set status='paid',provider_payment_id=p_payment_id,credited_at=now(),period_starts_at=beginning,period_ends_at=ending,updated_at=now() where id=b.id;
end $$;
alter function public.revoke_refunded_order(text) rename to revoke_refunded_order_before_household_premium;
create function public.revoke_refunded_order(p_payment text) returns void language plpgsql security definer set search_path='' as $$
declare b private.billing_orders;u uuid;unused interval;
begin
 select user_id into u from private.billing_orders where provider_payment_id=p_payment;perform 1 from public.profiles where id=u for update;
 select * into b from private.billing_orders where provider_payment_id=p_payment for update;if not found or b.status='refunded' then return;end if;
 unused:=coalesce(greatest(interval '0',b.period_ends_at-greatest(now(),b.period_starts_at)),interval '0');
 if b.product not in ('premium_30','premium_year') then perform public.revoke_refunded_order_before_household_premium(p_payment);
 else update private.household_premium_periods set revoked=true where order_id=b.id;end if;
 update private.household_premium_periods set starts_at=starts_at-unused,ends_at=ends_at-unused where user_id=u and not revoked and starts_at>=b.period_ends_at and (live is null or live=b.live);
 update private.billing_orders set period_starts_at=period_starts_at-unused,period_ends_at=period_ends_at-unused where user_id=u and live=b.live and product in ('premium_30','premium_year') and status='paid' and id<>b.id and period_starts_at>=b.period_ends_at;
 update private.billing_orders set status='refunded',updated_at=now() where id=b.id;
end $$;

-- New warranty dates get one advance timing. Saved custom schedules stay intact.
alter function public.save_purchase(uuid,integer,jsonb,jsonb) rename to save_purchase_before_household_premium;
create function public.save_purchase(p_id uuid,p_revision integer,p_data jsonb,p_warranty jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();
begin
 perform 1 from public.profiles where id=u for update;
 if p_warranty is not null and not (p_warranty ? 'offsets') and not exists(select 1 from public.important_dates where item_id=p_id and user_id=u and kind='warranty') then
 p_warranty:=p_warranty||jsonb_build_object('offsets','[{"unit":"days","value":30}]'::jsonb);
 end if;
 return public.save_purchase_before_household_premium(p_id,p_revision,p_data,p_warranty);
end $$;
comment on function public.save_purchase(uuid,integer,jsonb,jsonb) is 'keeply:purchase-product-types-v1';
revoke all on function public.save_purchase_before_household_premium(uuid,integer,jsonb,jsonb),public.save_purchase(uuid,integer,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.save_purchase(uuid,integer,jsonb,jsonb) to authenticated;

-- One shared projection over every authorised record, not a dashboard preview.
create function private.household_planner_rows(u uuid,t date,horizon integer) returns table(item_id uuid,product_name text,date_id uuid,label text,occurrence_id uuid,due_on date,amount_minor bigint,certainty text,projected boolean,cost_expected boolean,kind text)
language sql stable security definer set search_path='' as $$
 with recursive source as (
 select i.id item_id,i.product_name,d.id date_id,d.label,d.kind,d.payment_amount_minor,d.payment_amount_certainty,d.recurrence_months,d.recurrence_anchor,d.recurrence_ends_on,d.recurrence_policy,
 o.id occurrence_id,o.due_on,o.expected_amount_minor,o.amount_certainty,
 (private.payment_date(i.reminder_preset,d.kind,d.label) or d.payment_amount_minor is not null or o.expected_amount_minor is not null) cost_expected
 from public.items i join public.important_dates d on d.item_id=i.id join public.date_occurrences o on o.date_id=d.id and o.status='open'
 where i.user_id=u and i.state='saved' and i.archived_at is null
 ), future as (
 select s.date_id,private.next_recurring_date(s.recurrence_anchor,greatest(s.due_on,t-1),s.recurrence_months,s.recurrence_ends_on) due,1 n from source s where s.recurrence_months is not null and s.recurrence_policy='fixed'
 union all select f.date_id,private.next_recurring_date(s.recurrence_anchor,f.due,s.recurrence_months,s.recurrence_ends_on),f.n+1 from future f join source s on s.date_id=f.date_id where f.due<t+horizon and f.n<13
 ), candidates as (
 select s.*,s.due_on planned_on,false projected from source s where s.due_on between t and t+horizon
 union all select s.*,f.due,true from source s join future f on f.date_id=s.date_id where f.due between t and t+horizon and not exists(select 1 from public.date_occurrences x where x.date_id=s.date_id and x.due_on=f.due and x.status in ('completed','skipped','superseded'))
 ) select c.item_id,c.product_name,c.date_id,c.label,case when not c.projected then c.occurrence_id end,c.planned_on,
 case when not c.projected and c.amount_certainty is not null then c.expected_amount_minor else c.payment_amount_minor end,
 case when not c.projected and c.amount_certainty is not null then c.amount_certainty when c.payment_amount_minor is null then 'unset' else c.payment_amount_certainty end,c.projected,c.cost_expected,c.kind from candidates c
$$;
create function public.household_planner(p_days integer default 30,p_month date default null,p_before date default null,p_before_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();t date;result jsonb;
begin
 if p_days is null or p_days not in (30,90,365) or (p_before is null)<>(p_before_id is null) or (p_month is not null and p_month<>date_trunc('month',p_month)::date) then raise exception 'INVALID_INPUT';end if;
 if p_days>30 and not private.household_premium(u) then raise exception 'PREMIUM_REQUIRED';end if;
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 with all_rows as materialized(select * from private.household_planner_rows(u,t,p_days)),months as(
 select m::date as month,count(a.date_id) date_count,coalesce(sum(a.amount_minor),0)::text total_minor,count(a.date_id) filter(where a.certainty='estimated') estimated_count,
 count(a.date_id) filter(where a.certainty='unverified') unverified_count,count(a.date_id) filter(where a.cost_expected and a.certainty='unset') unset_count
 from generate_series(date_trunc('month',t),date_trunc('month',t+p_days),interval '1 month') m left join all_rows a on date_trunc('month',a.due_on)=m group by m
 ),page as(select * from all_rows where (p_month is null or date_trunc('month',due_on)::date=p_month) and (p_before is null or (due_on,date_id)>(p_before,p_before_id)) order by due_on,date_id limit 26)
 select jsonb_build_object('today',t,'ends_on',t+p_days,'days',p_days,'total',count(*),'total_minor',coalesce(sum(amount_minor),0)::text,
 'months',(select jsonb_agg(to_jsonb(m) order by month) from months m),'has_more',(select count(*)>25 from page),
 'rows',(select coalesce(jsonb_agg(to_jsonb(x) order by due_on,date_id),'[]'::jsonb) from(select * from page order by due_on,date_id limit 25)x)) into result from all_rows;
 return result;
end $$;
revoke all on function private.household_premium_until(uuid),private.household_premium(uuid),private.household_planner_rows(uuid,date,integer),public.account_usage_before_household_premium(),public.credit_payment_before_household_premium(text,uuid,text,text,bigint,text,boolean),public.revoke_refunded_order_before_household_premium(text) from public,anon,authenticated,service_role;
revoke all on function public.account_usage(),public.activate_installation_premium(boolean),public.acknowledge_installation_premium(uuid),public.household_planner(integer,date,date,uuid) from public,anon,authenticated,service_role;
grant execute on function public.account_usage(),public.activate_installation_premium(boolean),public.acknowledge_installation_premium(uuid),public.household_planner(integer,date,date,uuid) to authenticated;
revoke all on function public.create_premium_order(uuid,uuid,text,boolean),public.credit_payment(text,uuid,text,text,bigint,text,boolean),public.revoke_refunded_order(text) from public,anon,authenticated,service_role;
grant execute on function public.create_premium_order(uuid,uuid,text,boolean),public.credit_payment(text,uuid,text,text,bigint,text,boolean),public.revoke_refunded_order(text) to service_role;
comment on function public.household_planner(integer,date,date,uuid) is 'keeply:household-premium-v1';
commit;
