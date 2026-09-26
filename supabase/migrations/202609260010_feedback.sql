begin;
create table private.feedback_settings (
 singleton boolean primary key default true check(singleton), promotion_enabled boolean not null default true
);
insert into private.feedback_settings default values;
create table private.feedback (
 user_id uuid not null references public.profiles(id) on delete cascade,
 id uuid not null, kind text not null check(kind in ('problem','suggestion','general')),
 summary text not null check(char_length(summary) between 5 and 120),
 notes text not null default '' check(char_length(notes)<=2000),
 status text not null default 'new' check(status in ('new','reviewing','resolved')),
 reward_granted boolean not null default false, created_at timestamptz not null default now(),
 primary key(user_id,id)
);
create index feedback_retention_idx on private.feedback(created_at);
create table private.feedback_claims (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 feedback_id uuid not null, live boolean not null,
 claimed_at timestamptz not null default now(), starts_at timestamptz not null, ends_at timestamptz not null,
 check(ends_at>=starts_at)
);
alter table private.feedback enable row level security;
alter table private.feedback_claims enable row level security;
alter table private.feedback_settings enable row level security;
revoke all on private.feedback,private.feedback_claims,private.feedback_settings from public,anon,authenticated;
-- Access is via owner-scoped RPCs only; the private schema stays unexposed.
create function public.feedback_status() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); c private.feedback_claims; permanent boolean; enabled boolean;
begin
 select * into c from private.feedback_claims where user_id=u;
 select coalesce(bool_or(b.permanent),false) into permanent from private.reminder_packs b where b.user_id=u and b.live=(select live from private.billing_settings);
 select promotion_enabled into enabled from private.feedback_settings;
 return jsonb_build_object('claimed',c.user_id is not null,'permanent',permanent,'eligible',enabled and c.user_id is null and not permanent,
 'expires_at',case when c.live=(select live from private.billing_settings) then c.ends_at else null end);
end $$;
create function public.submit_feedback(p_id uuid,p_kind text,p_summary text,p_notes text,p_expect_reward boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); f private.feedback; s jsonb; starting timestamptz; ending timestamptz; mode boolean; granted boolean:=false;
begin
 p_summary:=regexp_replace(coalesce(p_summary,''),'^\s+|\s+$','','g');
 p_notes:=regexp_replace(coalesce(p_notes,''),'^\s+|\s+$','','g');
 select * into f from private.feedback where user_id=u and id=p_id;
 if found then
  if f.kind is distinct from p_kind or f.summary<>p_summary or f.notes<>p_notes then raise exception 'FEEDBACK_REPLAY_CONFLICT'; end if;
  return public.feedback_status()||jsonb_build_object('reward_granted',f.reward_granted);
 end if;
 if p_id is null or p_kind is null or p_kind not in ('problem','suggestion','general') or char_length(p_summary) not between 5 and 120 or char_length(p_notes)>2000 then raise exception 'INVALID_INPUT'; end if;
 s:=public.feedback_status();
 if p_expect_reward is distinct from (s->>'eligible')::boolean then raise exception 'FEEDBACK_OFFER_CHANGED'; end if;
 if (s->>'eligible')::boolean and char_length(p_notes)<30 then raise exception 'FEEDBACK_NOTES_REQUIRED'; end if;
 perform private.rate_limit(u,'feedback',5,86400);
 insert into private.feedback(user_id,id,kind,summary,notes) values(u,p_id,p_kind,p_summary,p_notes);
 if (s->>'eligible')::boolean then
  -- require_user locks the profile, serializing this claim with payments and refunds.
  perform private.trim_reminders(u);
  select live into mode from private.billing_settings;
  insert into private.reminder_packs(user_id,live) values(u,mode) on conflict(user_id) do update
   set live=excluded.live,permanent=false,paid_until=null,revision=reminder_packs.revision+1 where reminder_packs.live<>excluded.live;
  select greatest(now(),coalesce(paid_until,now())) into starting from private.reminder_packs where user_id=u;
  ending:=starting+interval '720 hours';
  insert into private.feedback_claims(user_id,feedback_id,live,starts_at,ends_at) values(u,p_id,mode,starting,ending);
  update private.reminder_packs set paid_until=ending,revision=revision+1 where user_id=u;
  update private.feedback set reward_granted=true where user_id=u and id=p_id;
  granted:=true;
  perform private.trim_reminders(u);
 end if;
 return public.feedback_status()||jsonb_build_object('reward_granted',granted);
end $$;
-- Promotional periods participate in the prepaid timeline but remain distinct from purchases.
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
  update private.reminder_packs set permanent=false,paid_until=greatest(
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
create function public.purge_old_feedback() returns void language sql security definer set search_path='' as $$
 delete from private.feedback where created_at<now()-interval '12 months';
$$;
revoke execute on function public.feedback_status(),public.submit_feedback(uuid,text,text,text,boolean),public.purge_old_feedback() from public,anon,authenticated;
grant execute on function public.feedback_status(),public.submit_feedback(uuid,text,text,text,boolean) to authenticated;
grant execute on function public.purge_old_feedback() to service_role;
commit;
