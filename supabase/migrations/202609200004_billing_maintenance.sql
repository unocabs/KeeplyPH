create table private.billing_orders (
  id uuid primary key, user_id uuid references public.profiles(id) on delete set null,
  amount_minor bigint not null default 36000 check(amount_minor=36000), currency text not null default 'PHP' check(currency='PHP'),
  status text not null default 'pending' check(status in ('pending','paid','expired','review','refunded')),
  provider_checkout_id text unique, provider_payment_id text unique, checkout_url text,
  credited_at timestamptz, period_starts_at timestamptz, period_ends_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index billing_orders_user_idx on private.billing_orders(user_id,created_at desc);
create table private.billing_events (
  event_id text primary key, order_id uuid references private.billing_orders(id) on delete set null,
  event_type text not null, provider_payment_id text not null, status text not null,
  created_at timestamptz not null default now()
);
create table private.account_deletions (
  user_id uuid primary key, requested_at timestamptz not null default now(), completed_at timestamptz
);

create function public.create_billing_order(p_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := private.require_user(); b private.billing_orders;
begin
  perform private.rate_limit(u,'checkout',5,3600);
  select * into b from private.billing_orders where user_id=u and status='pending' and created_at>now()-interval '24 hours' order by created_at desc limit 1;
  if found then return to_jsonb(b)||jsonb_build_object('create_checkout',false); end if;
  insert into private.billing_orders(id,user_id) values(p_id,u) returning * into b;
  return to_jsonb(b)||jsonb_build_object('create_checkout',true);
end $$;
create function public.get_billing_orders() returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := private.require_user(); result jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(b)),'[]'::jsonb) into result from (
    select id,amount_minor,currency,status,created_at,period_ends_at from private.billing_orders where user_id=u order by created_at desc limit 20
  ) b;
  return result;
end $$;
create function public.attach_checkout(p_id uuid,p_checkout_id text,p_url text) returns void language plpgsql security definer set search_path = '' as $$
begin
  update private.billing_orders set provider_checkout_id=p_checkout_id,checkout_url=p_url,updated_at=now()
    where id=p_id and provider_checkout_id is null and status='pending';
  if not found then raise exception 'CONFLICT'; end if;
end $$;
create function public.credit_payment(p_event_id text,p_order_id uuid,p_checkout_id text,p_payment_id text,p_amount bigint,p_currency text,p_live boolean) returns void language plpgsql security definer set search_path = '' as $$
declare b private.billing_orders; starting timestamptz;
begin
  select * into b from private.billing_orders where id=p_order_id for update;
  if not found or b.user_id is null then raise exception 'NOT_FOUND'; end if;
  if p_amount<>b.amount_minor or p_currency<>b.currency or (b.provider_checkout_id is not null and b.provider_checkout_id<>p_checkout_id)
    then raise exception 'PAYMENT_MISMATCH'; end if;
  -- Caller verifies environment/signature and retrieves payment directly from PayMongo.
  perform 1 from public.profiles where id=b.user_id and deletion_requested_at is null for update;
  if not found then raise exception 'ACCOUNT_UNAVAILABLE'; end if;
  if exists(select 1 from private.billing_events where event_id=p_event_id) then return; end if;
  insert into private.billing_events(event_id,order_id,event_type,provider_payment_id,status) values(p_event_id,b.id,'checkout_session.payment.paid',p_payment_id,'processed');
  if b.credited_at is not null then return; end if;
  if exists(select 1 from private.billing_orders where provider_payment_id=p_payment_id and id<>b.id) then raise exception 'PAYMENT_MISMATCH'; end if;
  select greatest(now(),coalesce(premium_until,now())) into starting from public.account_entitlements where user_id=b.user_id for update;
  update public.account_entitlements set premium_until=starting+interval '1 year',updated_at=now() where user_id=b.user_id;
  update private.billing_orders set status='paid',provider_checkout_id=p_checkout_id,provider_payment_id=p_payment_id,
    credited_at=now(),period_starts_at=starting,period_ends_at=starting+interval '1 year',updated_at=now() where id=b.id;
end $$;
create function public.record_billing_review(p_event_id text,p_payment_id text,p_type text) returns void language plpgsql security definer set search_path = '' as $$
declare b private.billing_orders;
begin
  select * into b from private.billing_orders where provider_payment_id=p_payment_id for update;
  insert into private.billing_events(event_id,order_id,event_type,provider_payment_id,status) values(p_event_id,b.id,left(p_type,100),p_payment_id,'needs_review') on conflict do nothing;
  -- Refund/dispute entitlement changes require reviewed handling; never silently
  -- subtract another paid order's time or destroy receipts.
  if b.id is not null then update private.billing_orders set status='review',updated_at=now() where id=b.id; end if;
end $$;
create function public.request_account_deletion() returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := private.require_user(); last_login timestamptz;
begin
  select last_sign_in_at into last_login from auth.users where id=u;
  if last_login is null or last_login<now()-interval '10 minutes' then raise exception 'REAUTH_REQUIRED'; end if;
  update public.profiles set deletion_requested_at=now(),email_reminders_enabled=false where id=u;
  insert into private.account_deletions(user_id) values(u) on conflict do nothing;
  delete from public.documents where user_id=u;
  delete from public.purchases where user_id=u;
end $$;
create function public.run_maintenance() returns jsonb language plpgsql security definer set search_path = '' as $$
declare objects jsonb; accounts jsonb; reviews integer;
begin
  delete from public.purchases where state='draft' and updated_at<now()-interval '24 hours';
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
create function public.complete_object_deletion(p_id uuid,p_success boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_success then delete from private.object_deletions where id=p_id and not_before<=now();
  else update private.object_deletions set attempts=attempts+1,next_attempt_at=now()+interval '1 hour' where id=p_id; end if;
end $$;
create function public.complete_account_deletion(p_user_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from auth.users where id=p_user_id) then raise exception 'ACCOUNT_STILL_EXISTS'; end if;
  update private.account_deletions set completed_at=now() where user_id=p_user_id;
end $$;
revoke all on all tables in schema private from public,anon,authenticated;
revoke execute on function public.create_billing_order(uuid),public.get_billing_orders(),public.request_account_deletion() from public,anon;
grant execute on function public.create_billing_order(uuid),public.get_billing_orders(),public.request_account_deletion() to authenticated;
revoke execute on function public.attach_checkout(uuid,text,text),public.credit_payment(text,uuid,text,text,bigint,text,boolean),public.record_billing_review(text,text,text),public.run_maintenance(),public.complete_object_deletion(uuid,boolean),public.complete_account_deletion(uuid) from public,anon,authenticated;
grant execute on function public.attach_checkout(uuid,text,text),public.credit_payment(text,uuid,text,text,bigint,text,boolean),public.record_billing_review(text,text,text),public.run_maintenance(),public.complete_object_deletion(uuid,boolean),public.complete_account_deletion(uuid) to service_role;
