begin;
-- Detail/history reads remain bounded even after years of recurring dates.
create function public.item_detail(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); i public.items; result jsonb;
begin
 perform private.trim_reminders(u);
 select * into i from public.items where id=p_id and user_id=u;
 if not found then return null; end if;
 result:=private.item_json(i);
 return result||jsonb_build_object('documents',coalesce((select jsonb_agg(to_jsonb(d)) from public.documents d where d.purchase_id=i.id),'[]'::jsonb),
 'dates',coalesce((select jsonb_agg(to_jsonb(d)||jsonb_build_object(
 'occurrences',coalesce((select jsonb_agg(to_jsonb(o) order by o.cycle desc) from (select * from public.date_occurrences where date_id=d.id order by cycle desc limit 20) o),'[]'::jsonb),
 'offsets',coalesce((select jsonb_agg(jsonb_build_object('unit',r.unit,'value',r.value)) from public.reminder_offsets r where r.date_id=d.id),'[]'::jsonb)))
 from public.important_dates d where d.item_id=i.id),'[]'::jsonb));
end $$;
create function public.date_history(p_id uuid,p_before integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); result jsonb;
begin
 if not exists(select 1 from public.important_dates where id=p_id and user_id=u) then raise exception 'NOT_FOUND'; end if;
 select coalesce(jsonb_agg(to_jsonb(o) order by o.cycle desc),'[]'::jsonb) into result from
 (select * from public.date_occurrences where date_id=p_id and user_id=u and cycle<p_before order by cycle desc limit 20) o;
 return result;
end $$;
alter table private.product_events drop constraint product_events_event_check;
alter table private.product_events add check(event in ('item_saved','reminder_opted_in','date_completed','reminder_limit_reached','item_saved_without_reminder','upgrade_cta_viewed','upgrade_cta_clicked','reminder_pack_checkout_started','reminder_pack_purchased','reminder_enabled','reminder_disabled','reminder_slot_reassigned'));
create function private.slot_event(u uuid,e text,i uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if (select analytics_enabled and deletion_requested_at is null from public.profiles where id=u) then
 insert into private.product_events(user_id,event,template_key) values(u,e,coalesce((select template_key from public.items where id=i and user_id=u),'other'));
 end if;
end $$;
create function public.record_upgrade_event(p_event text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();
begin
 if p_event not in ('upgrade_cta_viewed','upgrade_cta_clicked') then raise exception 'INVALID_INPUT'; end if;
 perform private.rate_limit(u,'upgrade_metrics',20);
 perform private.slot_event(u,p_event);
end $$;
-- A verified complete refund removes only the unused benefit linked to this order.
create function public.revoke_refunded_order(p_payment text) returns void language plpgsql security definer set search_path='' as $$
declare b private.billing_orders; u uuid; unused interval;
begin
 select user_id into u from private.billing_orders where provider_payment_id=p_payment;
 perform 1 from public.profiles where id=u for update;
 select * into b from private.billing_orders where provider_payment_id=p_payment for update;
 if not found or b.status='refunded' then return; end if;
 if b.period_starts_at is null then update private.billing_orders set status='refunded' where id=b.id; return; end if;
 if b.product='legacy_year' then
  update private.billing_orders set status='review' where id=b.id; return;
 end if;
 if b.product='slots_permanent' then
  update private.reminder_packs set permanent=false,paid_until=(select max(period_ends_at) from private.billing_orders where user_id=u and live=b.live and product='slots_30' and status='paid'),revision=revision+1 where user_id=u and live=b.live;
 else
  unused:=greatest(interval '0',b.period_ends_at-greatest(now(),b.period_starts_at));
  update private.reminder_packs set paid_until=paid_until-unused,revision=revision+1 where user_id=u and live=b.live and not permanent;
  -- Move later prepaid periods along with the removed unused period.
  update private.billing_orders set period_starts_at=period_starts_at-unused,period_ends_at=period_ends_at-unused
    where user_id=u and live=b.live and product='slots_30' and status='paid' and period_starts_at>=b.period_ends_at and id<>b.id;
 end if;
 update private.billing_orders set status='refunded',updated_at=now() where id=b.id;
 perform private.trim_reminders(u);
end $$;
create or replace function private.try_coverage(p_id uuid,u uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.items where id=p_id and (coverage_requested_at is not null or archived_at is not null)) then return; end if;
 perform private.trim_reminders(u);
 if (select count(*) from public.items where user_id=u and private.covered(id))<private.slot_limit(u) then
  update public.items set coverage_requested_at=clock_timestamp() where id=p_id and user_id=u and state='saved' and archived_at is null and coverage_requested_at is null;
 else perform private.slot_event(u,'reminder_limit_reached',p_id); end if;
 perform private.trim_reminders(u);
end $$;
create or replace function public.set_item_coverage(p_id uuid,p_revision integer,p_enabled boolean,p_replace uuid default null,p_replace_revision integer default null) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); i public.items; d record;
begin
 select * into i from public.items where id=p_id and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if i.revision<>p_revision then raise exception 'CONFLICT'; end if;
 if p_enabled then
  if i.state<>'saved' or i.archived_at is not null or not exists(select 1 from public.important_dates where item_id=p_id and reminders_enabled) then raise exception 'DATE_REQUIRED'; end if;
  if p_replace is not null then
   if p_replace=p_id then raise exception 'INVALID_INPUT'; end if;
   update public.items set coverage_requested_at=null,revision=revision+1 where id=p_replace and user_id=u and revision=p_replace_revision and private.covered(id);
   if not found then raise exception 'CONFLICT'; end if;
   -- The target takes the released priority, ahead of capacity-paused selections.
   update public.items set coverage_requested_at=coalesce((select min(coverage_requested_at)-interval '1 microsecond' from public.items where user_id=u),now()),revision=revision+1 where id=p_id;
  else
   if not private.covered(p_id) and (select count(*) from public.items where user_id=u and private.covered(id))>=private.slot_limit(u) then raise exception 'REMINDER_LIMIT'; end if;
   update public.items set coverage_requested_at=coalesce(coverage_requested_at,clock_timestamp()),revision=revision+1 where id=p_id;
  end if;
 else update public.items set coverage_requested_at=null,revision=revision+1 where id=p_id;
 end if;
 perform private.slot_event(u,case when p_replace is not null then 'reminder_slot_reassigned' when p_enabled then 'reminder_enabled' else 'reminder_disabled' end,p_id);
 perform private.trim_reminders(u);
 for d in select id from public.important_dates where user_id=u and item_id in (p_id,p_replace) loop perform private.schedule_date(d.id); end loop;
end $$;
create or replace function public.save_item_with_date(p_id uuid,p_revision integer,p_label text,p_notes text,p_date jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); i public.items;
begin
 select * into i from public.items where id=p_id and user_id=u;
 if not found then raise exception 'NOT_FOUND'; end if;
 if i.state='draft' and i.template_key in ('licence','passport','aircon','other') and p_date is null then raise exception 'DATE_REQUIRED'; end if;
 perform public.save_item(p_id,p_revision,p_label,p_notes);
 if p_date is not null then perform public.save_important_date(gen_random_uuid(),p_id,0,p_date); end if;
 if p_date is not null and (p_date->>'reminders_enabled')::boolean and not private.covered(p_id) then perform private.slot_event(u,'item_saved_without_reminder',p_id); end if;
 return p_id;
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
  insert into private.reminder_packs(user_id,live) values(u,p_live) on conflict(user_id) do update set live=excluded.live,permanent=false,paid_until=null,revision=reminder_packs.revision+1 where reminder_packs.live<>excluded.live;
  if exists(select 1 from private.reminder_packs where user_id=u and permanent) then
   update private.billing_orders set status='review',provider_payment_id=p_payment_id,credited_at=now() where id=b.id;
   update private.billing_events set status='needs_review' where event_id=p_event_id;
   return;
  end if;
  select greatest(now(),coalesce(paid_until,now())) into starting from private.reminder_packs where user_id=u;
  ending:=case when b.product='slots_30' then starting+interval '720 hours' else null end;
  update private.reminder_packs set paid_until=ending,permanent=(b.product='slots_permanent'),revision=revision+1 where user_id=u;
 end if;
 update private.billing_orders set status='paid',provider_payment_id=p_payment_id,credited_at=now(),period_starts_at=starting,period_ends_at=ending,updated_at=now() where id=b.id;
 perform private.slot_event(u,'reminder_pack_purchased');
 perform private.trim_reminders(u);
end $$;
create or replace function public.create_pack_order(p_user uuid,p_id uuid,p_product text,p_live boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare b private.billing_orders;
begin
 perform 1 from public.profiles where id=p_user and deletion_requested_at is null for update;
 if not found then raise exception 'ACCOUNT_UNAVAILABLE'; end if;
 if p_live<>(select live from private.billing_settings) then raise exception 'PAYMENT_MISMATCH'; end if;
 if p_product not in ('slots_30','slots_permanent') then raise exception 'INVALID_INPUT'; end if;
 if exists(select 1 from private.reminder_packs where user_id=p_user and live=p_live and permanent) then raise exception 'PACK_ALREADY_OWNED'; end if;
 perform private.rate_limit(p_user,'checkout',5,3600);
 select * into b from private.billing_orders where user_id=p_user and product=p_product and live=p_live and status='pending' and created_at>now()-interval '24 hours' order by created_at desc limit 1;
 if found then return to_jsonb(b)||jsonb_build_object('create_checkout',false); end if;
 perform private.slot_event(p_user,'reminder_pack_checkout_started');
 insert into private.billing_orders(id,user_id,product,amount_minor,live) values(p_id,p_user,p_product,case p_product when 'slots_30' then 2900 else 24900 end,p_live) returning * into b;
 return to_jsonb(b)||jsonb_build_object('create_checkout',true);
end $$;
create or replace function public.finish_notification(p_id uuid,p_lease uuid,p_status text,p_provider_id text,p_error text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('accepted','retry','failed','unknown') then raise exception 'INVALID_INPUT'; end if;
  perform 1 from public.profiles where id in (
    select coalesce(w.user_id,j.renewal_user) from private.notification_jobs j left join public.important_dates w on j.date_id=w.id where j.id=p_id
  ) for update;
  update private.notification_jobs set status=case when p_status='retry' and attempts>=6 then 'unknown' else p_status end,
    provider_email_id=coalesce(p_provider_id,provider_email_id),accepted_at=case when p_status='accepted' then now() else accepted_at end,
    last_error_code=left(p_error,80),lease_until=null,
    next_attempt_at=now()+case when attempts<=1 then interval '15 minutes' when attempts=2 then interval '1 hour' when attempts=3 then interval '4 hours' else interval '12 hours' end,
    updated_at=now()
    where id=p_id and lease_token=p_lease and status='sending';
  if p_provider_id is not null then
    perform public.record_email_event(p_provider_id,e.event_type) from private.email_events e where e.provider_id=p_provider_id;
  end if;
end $$;
revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function private.active_account() to authenticated;
revoke execute on function public.item_detail(uuid),public.date_history(uuid,integer),public.record_upgrade_event(text) from public,anon;
grant execute on function public.item_detail(uuid),public.date_history(uuid,integer),public.record_upgrade_event(text) to authenticated;
revoke execute on function public.revoke_refunded_order(text) from public,anon,authenticated;
grant execute on function public.revoke_refunded_order(text) to service_role;
create function public.apply_verified_refund(p_payment text,p_amount bigint,p_currency text,p_live boolean) returns void language plpgsql security definer set search_path='' as $$
declare b private.billing_orders;
begin
 select * into b from private.billing_orders where provider_payment_id=p_payment;
 if not found then raise exception 'NOT_FOUND'; end if;
 if (b.live is not null and b.live<>p_live) or b.currency<>p_currency then raise exception 'PAYMENT_MISMATCH'; end if;
 if b.amount_minor=p_amount then perform public.revoke_refunded_order(p_payment); end if;
 -- Partial refunds remain in the existing review queue for an explicit resolution.
end $$;
revoke execute on function public.apply_verified_refund(text,bigint,text,boolean) from public,anon,authenticated;
grant execute on function public.apply_verified_refund(text,bigint,text,boolean) to service_role;
commit;
