-- Quantity-bound checkout and prepaid terms. Existing packs remain five slots.
begin;
alter table private.billing_orders add column slot_count integer not null default 5 check(slot_count between 5 and 100 and slot_count%5=0);
alter table private.reminder_packs add column slot_count integer not null default 5 check(slot_count between 5 and 100 and slot_count%5=0);
-- Replace the old fixed-price constraint without depending on its generated name.
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='private.billing_orders'::regclass and contype='c' and pg_get_constraintdef(oid) like '%amount_minor%' loop
  execute format('alter table private.billing_orders drop constraint %I',c.conname);
 end loop;
end $$;
alter table private.billing_orders add constraint billing_orders_pack_price check(
 (product='legacy_year' and amount_minor=36000 and slot_count=5) or
 (product='slots_30' and amount_minor=2900*(slot_count/5)) or
 (product='slots_permanent' and amount_minor=24900*(slot_count/5)));

create or replace function private.slot_limit(u uuid) returns integer language sql stable security definer set search_path='' as $$
 select greatest(3+coalesce((select case when b.permanent then b.slot_count when b.paid_until>now() then
   coalesce((select max(o.slot_count) from private.billing_orders o where o.user_id=u and o.live=b.live and o.product='slots_30' and o.status='paid' and o.period_starts_at<=now() and o.period_ends_at>now()),5)
   else 0 end from private.reminder_packs b where b.user_id=u and b.live=(select live from private.billing_settings)),0),
   case when private.is_premium(u) then 1000 else 0 end)
$$;

-- A default preserves older callers while the previous overload is retired.
drop function public.create_pack_order(uuid,uuid,text,boolean);
create or replace function public.create_pack_order(p_user uuid,p_id uuid,p_product text,p_live boolean,p_slots integer default 5) returns jsonb language plpgsql security definer set search_path='' as $$
declare b private.billing_orders;
begin
 perform 1 from public.profiles where id=p_user and deletion_requested_at is null for update;
 if not found then raise exception 'ACCOUNT_UNAVAILABLE'; end if;
 if p_live<>(select live from private.billing_settings) then raise exception 'PAYMENT_MISMATCH'; end if;
 if p_product is null or p_product not in ('slots_30','slots_permanent') or p_slots is null or p_slots<5 or p_slots>100 or p_slots%5<>0 then raise exception 'INVALID_INPUT'; end if;
 if exists(select 1 from private.reminder_packs where user_id=p_user and live=p_live and permanent) and p_product='slots_30' then raise exception 'PACK_ALREADY_OWNED'; end if;
 if p_product='slots_permanent' and p_slots+coalesce((select slot_count from private.reminder_packs where user_id=p_user and live=p_live and permanent),0)>100 then raise exception 'SLOT_PACK_LIMIT'; end if;
 perform private.rate_limit(p_user,'checkout',5,3600);
 select * into b from private.billing_orders where user_id=p_user and product=p_product and live=p_live and slot_count=p_slots and status='pending' and created_at>now()-interval '24 hours' order by created_at desc limit 1;
 if found then return to_jsonb(b)||jsonb_build_object('create_checkout',false); end if;
 perform private.slot_event(p_user,'reminder_pack_checkout_started');
 insert into private.billing_orders(id,user_id,product,amount_minor,live,slot_count) values(p_id,p_user,p_product,(p_slots/5)*case p_product when 'slots_30' then 2900 else 24900 end,p_live,p_slots) returning * into b;
 return to_jsonb(b)||jsonb_build_object('create_checkout',true);
end $$;
create or replace function public.credit_payment(p_event_id text,p_order_id uuid,p_checkout_id text,p_payment_id text,p_amount bigint,p_currency text,p_live boolean) returns void language plpgsql security definer set search_path='' as $$
declare b private.billing_orders; starting timestamptz; ending timestamptz; u uuid;
begin
 select user_id into u from private.billing_orders where id=p_order_id;
 perform 1 from public.profiles where id=u and deletion_requested_at is null for update;
 if not found then raise exception 'ACCOUNT_UNAVAILABLE'; end if;
 select * into b from private.billing_orders where id=p_order_id for update;
 if p_live<>(select live from private.billing_settings) then raise exception 'PAYMENT_MISMATCH'; end if;
 if p_amount<>b.amount_minor or p_currency<>b.currency or b.provider_checkout_id is distinct from p_checkout_id or (b.live is not null and b.live<>p_live) then raise exception 'PAYMENT_MISMATCH'; end if;
 if b.provider_payment_id is not null and b.provider_payment_id<>p_payment_id then raise exception 'PAYMENT_MISMATCH'; end if;
 if exists(select 1 from private.billing_orders where provider_payment_id=p_payment_id and id<>b.id) then raise exception 'PAYMENT_MISMATCH'; end if;
 if exists(select 1 from private.billing_events where event_id=p_event_id) or b.credited_at is not null then return; end if;
 insert into private.billing_events(event_id,order_id,event_type,provider_payment_id,status) values(p_event_id,b.id,'checkout_session.payment.paid',p_payment_id,'processed');
 if b.product='legacy_year' then
  select greatest(now(),coalesce(premium_until,now())) into starting from public.account_entitlements where user_id=u;
  ending:=starting+interval '1 year';
  update public.account_entitlements set premium_until=ending,updated_at=now() where user_id=u;
 else
  -- Observe a lapse before extending access; do not resume missed alerts across the gap.
  perform private.trim_reminders(u);
  insert into private.reminder_packs(user_id,live) values(u,p_live) on conflict(user_id) do update set live=excluded.live,permanent=false,paid_until=null,slot_count=5,revision=reminder_packs.revision+1 where reminder_packs.live<>excluded.live;
  if (b.product='slots_30' and exists(select 1 from private.reminder_packs where user_id=u and permanent)) or (b.product='slots_permanent' and b.slot_count+coalesce((select slot_count from private.reminder_packs where user_id=u and permanent),0)>100) then
   update private.billing_orders set status='review',provider_payment_id=p_payment_id,credited_at=now() where id=b.id;
   update private.billing_events set status='needs_review' where event_id=p_event_id;
   return;
  end if;
  select case when b.product='slots_permanent' then now() else greatest(now(),coalesce(paid_until,now())) end into starting from private.reminder_packs where user_id=u;
  ending:=case when b.product='slots_30' then starting+interval '720 hours' else null end;
  update private.reminder_packs set paid_until=ending,slot_count=case when b.product='slots_permanent' and permanent then slot_count+b.slot_count else b.slot_count end,permanent=(b.product='slots_permanent'),revision=revision+1 where user_id=u;
 end if;
 update private.billing_orders set status='paid',provider_payment_id=p_payment_id,credited_at=now(),period_starts_at=starting,period_ends_at=ending,updated_at=now() where id=b.id;
 perform private.slot_event(u,'reminder_pack_purchased');
 perform private.trim_reminders(u);
end $$;
create or replace function public.revoke_refunded_order(p_payment text) returns void language plpgsql security definer set search_path='' as $$
declare b private.billing_orders; u uuid; unused interval;
begin
 select user_id into u from private.billing_orders where provider_payment_id=p_payment;
 perform 1 from public.profiles where id=u for update;
 select * into b from private.billing_orders where provider_payment_id=p_payment for update;
 if not found or b.status='refunded' then return; end if;
 if b.period_starts_at is null then update private.billing_orders set status='refunded' where id=b.id; return; end if;
 if b.product='legacy_year' then update private.billing_orders set status='review' where id=b.id; return; end if;
 if b.product='slots_permanent' then
  update private.reminder_packs set permanent=exists(select 1 from private.billing_orders where user_id=u and live=b.live and product='slots_permanent' and status='paid' and id<>b.id),
   slot_count=coalesce((select sum(slot_count)::integer from private.billing_orders where user_id=u and live=b.live and product='slots_permanent' and status='paid' and id<>b.id),5),paid_until=greatest(
   (select max(period_ends_at) from private.billing_orders where user_id=u and live=b.live and product='slots_30' and status='paid'),
   (select ends_at from private.feedback_claims where user_id=u and live=b.live)),revision=revision+1 where user_id=u and live=b.live;
 else
  unused:=greatest(interval '0',b.period_ends_at-greatest(now(),b.period_starts_at));
  update private.reminder_packs set paid_until=paid_until-unused,revision=revision+1 where user_id=u and live=b.live and not permanent;
  update private.billing_orders set period_starts_at=period_starts_at-unused,period_ends_at=period_ends_at-unused
   where user_id=u and live=b.live and product='slots_30' and status='paid' and period_starts_at>=b.period_ends_at and id<>b.id;
  -- Bring a later reward forward with the removed paid period; preserve all 30 reward days.
  update private.feedback_claims set starts_at=starts_at-unused,ends_at=ends_at-unused
   where user_id=u and live=b.live and starts_at>=b.period_ends_at;
 end if;
 update private.billing_orders set status='refunded',updated_at=now() where id=b.id;
 perform private.trim_reminders(u);
end $$;
create or replace function public.account_usage() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); n integer; t date;
begin
 perform private.trim_reminders(u);
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 select count(*) into n from public.items where user_id=u and private.covered(id);
 return jsonb_build_object(
 'purchases',(select count(*) from public.items where user_id=u and state='saved'),
 'reminders',n,'slot_limit',private.slot_limit(u),
 'uncovered',(select count(*) from public.items where user_id=u and state='saved' and archived_at is null and not private.covered(id)),
 'storage_bytes',coalesce((select sum(case when state='ready' then size_bytes else reserved_bytes end) from public.documents where user_id=u),0),
 'storage_limit_bytes',case when private.is_premium(u) then 2147483648 else 104857600 end,
 'premium',private.is_premium(u),'premium_until',(select premium_until from public.account_entitlements where user_id=u),
 'paid_until',(select paid_until from private.reminder_packs where live=(select live from private.billing_settings) and user_id=u),'permanent',coalesce((select permanent from private.reminder_packs where live=(select live from private.billing_settings) and user_id=u),false),
 'temporary_active',coalesce((select not permanent and paid_until>now() from private.reminder_packs where user_id=u and live=(select live from private.billing_settings)),false),
 'permanent_slots',coalesce((select slot_count from private.reminder_packs where user_id=u and live=(select live from private.billing_settings) and permanent),0),
 'renewal_slots',coalesce((select slot_count from private.billing_orders where user_id=u and live=(select live from private.billing_settings) and product='slots_30' and status='paid' order by period_ends_at desc limit 1),5),
 'renewal_emails_enabled',(select renewal_emails_enabled from public.profiles where id=u),
 'upcoming',(select count(*) from private.current_dates where user_id=u and state='saved' and archived_at is null and expires_on between t and t+30),
 'overdue',(select count(*) from private.current_dates where user_id=u and state='saved' and archived_at is null and expires_on<t));
end $$;
create or replace function public.get_billing_orders() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); result jsonb;
begin
 select coalesce(jsonb_agg(to_jsonb(b)),'[]'::jsonb) into result from (
   select id,product,slot_count,amount_minor,currency,status,created_at,period_starts_at,period_ends_at
   from private.billing_orders where user_id=u order by created_at desc,id limit 20
 ) b;
 return result;
end $$;
revoke execute on function public.create_pack_order(uuid,uuid,text,boolean,integer) from public,anon,authenticated;
grant execute on function public.create_pack_order(uuid,uuid,text,boolean,integer) to service_role;
commit;
