-- One permanent setup reward per account, independent of purchased packs and billing mode.
begin;
create table private.install_reward_claims (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 claimed_at timestamptz not null default now()
);
alter table private.install_reward_claims enable row level security;
revoke all on private.install_reward_claims from public,anon,authenticated;
create or replace function private.slot_limit(u uuid) returns integer language sql stable security definer set search_path='' as $$
 select greatest(3+coalesce((select case when b.permanent then b.slot_count when b.paid_until>now() then
   coalesce((select max(o.slot_count) from private.billing_orders o where o.user_id=u and o.live=b.live and o.product='slots_30' and o.status='paid' and o.period_starts_at<=now() and o.period_ends_at>now()),5)
   else 0 end from private.reminder_packs b where b.user_id=u and b.live=(select live from private.billing_settings)),0),
   case when private.is_premium(u) then 1000 else 0 end)
   + case when exists(select 1 from private.install_reward_claims where user_id=u) then 2 else 0 end
$$;

create or replace function public.account_usage() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); n integer; t date;
begin
 perform private.trim_reminders(u);
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 select count(*) into n from public.items where user_id=u and private.covered(id);
 return jsonb_build_object(
 'purchases',(select count(*) from public.items where user_id=u and state='saved'),
 'install_reward_claimed',exists(select 1 from private.install_reward_claims where user_id=u),
 'bonus_slots',case when exists(select 1 from private.install_reward_claims where user_id=u) then 2 else 0 end,
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
-- Installation/display mode is a client signal, not browser attestation.
-- The database independently enforces authentication, owned registration and one claim.
create function public.claim_install_reward(p_endpoint text,p_installed boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); granted boolean;
begin
 if exists(select 1 from private.install_reward_claims where user_id=u) then
  return jsonb_build_object('claimed',true,'granted',false);
 end if;
 if p_installed is distinct from true or not exists(
  select 1 from private.push_subscriptions s join public.profiles p on p.id=s.user_id
  where s.user_id=u and s.endpoint=p_endpoint and p.push_reminders_enabled
 ) then raise exception 'SETUP_REQUIRED'; end if;
 insert into private.install_reward_claims(user_id) values(u) on conflict(user_id) do nothing;
 granted:=found;
 perform private.trim_reminders(u);
 return jsonb_build_object('claimed',true,'granted',granted);
end $$;
revoke execute on function public.claim_install_reward(text,boolean) from public,anon;
grant execute on function public.claim_install_reward(text,boolean) to authenticated;
commit;
