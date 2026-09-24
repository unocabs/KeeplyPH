begin;
alter table private.billing_orders drop constraint billing_orders_amount_minor_check;
alter table private.billing_orders add column product text not null default 'legacy_year' check(product in ('legacy_year','slots_30','slots_permanent'));
alter table private.billing_orders add column live boolean;
alter table private.billing_orders add check((product='legacy_year' and amount_minor=36000) or (product='slots_30' and amount_minor=2900) or (product='slots_permanent' and amount_minor=24900));
-- Only the server may create new price/mode-bound checkout intents.
create function public.create_pack_order(p_user uuid,p_id uuid,p_product text,p_live boolean) returns jsonb language plpgsql security definer set search_path='' as $$
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
 insert into private.billing_orders(id,user_id,product,amount_minor,live) values(p_id,p_user,p_product,case p_product when 'slots_30' then 2900 else 24900 end,p_live) returning * into b;
 return to_jsonb(b)||jsonb_build_object('create_checkout',true);
end $$;
-- Retire the old public annual checkout creation entry point.
revoke execute on function public.create_billing_order(uuid) from authenticated;
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
 perform private.trim_reminders(u);
end $$;
create function public.pending_checkouts(p_live boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 with selected as (select id from private.billing_orders where status in ('pending','expired') and credited_at is null and provider_checkout_id is not null and live=p_live and created_at>now()-interval '7 days' order by updated_at,id for update skip locked limit 1),
 checked as (update private.billing_orders b set updated_at=now() from selected s where b.id=s.id returning b.id,b.provider_checkout_id)
 select coalesce(jsonb_agg(to_jsonb(checked)),'[]'::jsonb) into result from checked;
 return result;
end $$;
-- Renewal notices share durable delivery/retry infrastructure, but have no item.
alter table private.notification_jobs alter column date_id drop not null;
alter table private.notification_jobs alter column occurrence_id drop not null;
alter table private.notification_jobs add column renewal_user uuid references public.profiles(id) on delete cascade;
alter table private.notification_jobs add column renewal_version integer;
alter table private.notification_jobs add column renewal_kind text check(renewal_kind in ('before','expired'));
alter table private.notification_jobs add column renewal_until timestamptz;
alter table private.notification_jobs add check((date_id is not null and occurrence_id is not null and renewal_user is null) or (date_id is null and occurrence_id is null and renewal_user is not null and renewal_kind is not null and renewal_version is not null and renewal_until is not null));
create unique index renewal_notice_identity on private.notification_jobs(renewal_user,renewal_version,renewal_kind) where renewal_user is not null;
create function private.renewal_eligible(j private.notification_jobs) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.reminder_packs b join public.profiles p on p.id=b.user_id join auth.users a on a.id=p.id
 where b.live=(select live from private.billing_settings) and b.user_id=j.renewal_user and not b.permanent and b.revision=j.renewal_version and b.paid_until=j.renewal_until
 and p.renewal_emails_enabled and not p.email_delivery_blocked and p.deletion_requested_at is null and a.email_confirmed_at is not null
 and ((j.renewal_kind='before' and now()<b.paid_until) or (j.renewal_kind='expired' and now()>=b.paid_until and now()<b.paid_until+interval '48 hours')))
$$;
create function public.claim_renewal_jobs(p_limit integer default 2) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; remaining integer;
begin
 perform pg_advisory_xact_lock(719420001);
 insert into private.notification_jobs(renewal_user,renewal_version,renewal_kind,renewal_until,expiration_date,offset_value,offset_unit,scheduled_at,next_attempt_at)
 select b.user_id,b.revision,k.kind,b.paid_until,(b.paid_until at time zone p.timezone)::date,0,'days',
 b.paid_until-case when k.kind='before' then interval '3 days' else interval '0' end,
 b.paid_until-case when k.kind='before' then interval '3 days' else interval '0' end
 from private.reminder_packs b join public.profiles p on p.id=b.user_id cross join (values ('before'),('expired')) k(kind)
 where b.live=(select live from private.billing_settings) and not b.permanent and b.paid_until>now()-interval '48 hours' and p.deletion_requested_at is null and p.renewal_emails_enabled and not p.email_delivery_blocked
 on conflict do nothing;
 update private.notification_jobs j set status='cancelled',updated_at=now() where renewal_user is not null and status in ('pending','retry') and not private.renewal_eligible(j)
 and (renewal_kind<>'expired' or renewal_until<=now() or not exists(select 1 from private.reminder_packs b join public.profiles p on p.id=b.user_id where b.user_id=j.renewal_user and b.revision=j.renewal_version and not b.permanent and p.renewal_emails_enabled and not p.email_delivery_blocked and p.deletion_requested_at is null));
 update private.notification_jobs set status='unknown',last_error_code='acceptance_unresolved' where renewal_user is not null and status in ('sending','retry') and first_attempt_at<now()-interval '23 hours';
 update private.notification_jobs set status='retry',next_attempt_at=now() where renewal_user is not null and status='sending' and lease_until<now();
 insert into private.email_daily_quota(day) values((now() at time zone 'UTC')::date) on conflict do nothing;
 select greatest(0,90-reserved) into remaining from private.email_daily_quota where day=(now() at time zone 'UTC')::date;
 with candidates as (select id from private.notification_jobs j where renewal_user is not null and status in ('pending','retry') and next_attempt_at<=now() and private.renewal_eligible(j) order by next_attempt_at,id for update skip locked limit least(greatest(p_limit,0),remaining,2)),
 claimed as (update private.notification_jobs j set status='sending',lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes',first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1 from candidates c where j.id=c.id returning j.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'lease_token',j.lease_token,'expiration_date',j.expiration_date,'email',a.email,'payload',j.frozen_payload,'renewal_kind',j.renewal_kind)),'[]'::jsonb) into result from claimed j join auth.users a on a.id=j.renewal_user;
 update private.email_daily_quota set reserved=reserved+jsonb_array_length(result) where day=(now() at time zone 'UTC')::date;
 return result;
end $$;
create function public.prepare_renewal(p_id uuid,p_lease uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.notification_jobs; email text; u uuid;
begin
 select renewal_user into u from private.notification_jobs where id=p_id;
 perform 1 from public.profiles where id=u for update;
 select * into j from private.notification_jobs where id=p_id and lease_token=p_lease and status='sending' and lease_until>now() for update;
 if not found then return null; end if;
 select a.email into email from auth.users a where a.id=u;
 if not private.renewal_eligible(j) or email is null or (j.frozen_payload is not null and j.frozen_payload->>'to'<>email) then
 update private.notification_jobs set status='cancelled',updated_at=now() where id=p_id; return null; end if;
 if p_payload->>'to'<>email then raise exception 'INVALID_INPUT'; end if;
 update private.notification_jobs set frozen_payload=coalesce(frozen_payload,p_payload) where id=p_id returning frozen_payload into p_payload;
 return p_payload;
end $$;
create function public.update_renewal_preference(p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();
begin update public.profiles set renewal_emails_enabled=p_enabled where id=u; end $$;
create or replace function public.claim_notification_jobs(p_limit integer default 10,p_daily_limit integer default 90) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid; remaining integer; result jsonb;
begin
  -- Serialize daily allowance reservations; row leases still protect individual work.
  perform pg_advisory_xact_lock(719420001);
  for u in select distinct w.user_id from private.current_dates w join private.notification_jobs j on j.date_id=w.id
    where j.next_attempt_at<=now() and j.status in ('pending','retry','sending') loop perform private.trim_reminders(u); end loop;
  update private.notification_jobs set status='unknown',last_error_code='acceptance_unresolved',updated_at=now()
    where status in ('sending','retry') and first_attempt_at<now()-interval '23 hours';
  update private.notification_jobs set status='retry',next_attempt_at=now() where status='sending' and lease_until<now();
  update private.notification_jobs set status='cancelled',updated_at=now() where status in ('pending','retry') and date_id is not null and not exists(select 1 from private.current_dates d where d.occurrence_id=notification_jobs.occurrence_id);
  update private.notification_jobs j set status='cancelled',updated_at=now()
    from private.current_dates w,public.profiles p,public.items r
    where j.date_id=w.id and w.user_id=p.id and r.id=w.purchase_id and j.status in ('pending','retry')
    and (not private.covered(w.item_id) or not w.reminders_enabled or not p.email_reminders_enabled or p.email_delivery_blocked or p.deletion_requested_at is not null
      or r.state<>'saved' or r.archived_at is not null or w.id is null or w.archived_at is not null or w.state<>'saved' or w.occurrence_id<>j.occurrence_id or not exists(select 1 from public.reminder_offsets r0 where r0.date_id=w.id and r0.value=j.offset_value and r0.unit=j.offset_unit) or w.expires_on<>j.expiration_date or w.occurrence_id<>j.occurrence_id or not exists(select 1 from public.reminder_offsets r0 where r0.date_id=w.id and r0.value=j.offset_value and r0.unit=j.offset_unit));
  update private.notification_jobs j set status='skipped',updated_at=now()
    from private.current_dates w,public.profiles p where j.date_id=w.id and w.user_id=p.id
    and j.status in ('pending','retry') and w.expires_on<(now() at time zone p.timezone)::date;
  update private.notification_jobs j set status='skipped',updated_at=now()
    where j.status='pending' and j.scheduled_at<=now() and exists(
      select 1 from private.notification_jobs newer where newer.date_id=j.date_id and newer.occurrence_id=j.occurrence_id
      and newer.scheduled_at>j.scheduled_at and newer.scheduled_at<=now() and newer.status in ('pending','retry','sending','accepted','delivered')
    );
  insert into private.email_daily_quota(day) values((now() at time zone 'UTC')::date) on conflict do nothing;
  select greatest(0,least(p_daily_limit,90)-reserved) into remaining from private.email_daily_quota where day=(now() at time zone 'UTC')::date;
  with candidates as (
    select id from private.notification_jobs where date_id is not null and status in ('pending','retry') and next_attempt_at<=now()
    order by next_attempt_at,id for update skip locked limit least(greatest(p_limit,0),remaining,20)
  ), claimed as (
    update private.notification_jobs j set status='sending',lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes',
      first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1,updated_at=now()
    from candidates c where j.id=c.id returning j.*
  ) select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'lease_token',c.lease_token,'expiration_date',c.expiration_date,
      'offset_value',c.offset_value,'attempts',c.attempts,'payload',c.frozen_payload,'product_name',r.product_name,
      'purchase_id',r.id,'kind',w.label,'email',a.email)), '[]'::jsonb) into result
    from claimed c join private.current_dates w on w.id=c.date_id join public.items r on r.id=w.purchase_id join auth.users a on a.id=w.user_id;
  update private.email_daily_quota set reserved=reserved+jsonb_array_length(result) where day=(now() at time zone 'UTC')::date;
  return result;
end $$;
create or replace function public.record_email_event(p_id text,p_type text) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.profiles where id in (
    select coalesce(w.user_id,j.renewal_user) from private.notification_jobs j left join public.important_dates w on j.date_id=w.id where j.provider_email_id=p_id
  ) for update;
  -- Persist early delivery events: a webhook can beat the send acknowledgment.
  insert into private.email_events(provider_id,event_type) values(p_id,p_type) on conflict do nothing;
  if p_type='email.delivered' then update private.notification_jobs set delivered_at=now(),status='delivered' where provider_email_id=p_id and status='accepted';
  elsif p_type in ('email.bounced','email.complained') then
    update private.notification_jobs set status='failed',last_error_code=p_type where provider_email_id=p_id;
    update public.profiles set email_delivery_blocked=true where id in (
      select coalesce(w.user_id,j.renewal_user) from private.notification_jobs j left join public.important_dates w on j.date_id=w.id where j.provider_email_id=p_id
    );
  end if;
end $$;
revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function private.active_account() to authenticated;
revoke execute on function public.create_pack_order(uuid,uuid,text,boolean),public.pending_checkouts(boolean),public.claim_renewal_jobs(integer),public.prepare_renewal(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_pack_order(uuid,uuid,text,boolean),public.pending_checkouts(boolean),public.claim_renewal_jobs(integer),public.prepare_renewal(uuid,uuid,jsonb) to service_role;
revoke execute on function public.update_renewal_preference(boolean) from public,anon;
grant execute on function public.update_renewal_preference(boolean) to authenticated;
commit;
