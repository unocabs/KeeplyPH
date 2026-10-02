begin;
-- Consent is independent of deadline and renewal alerts. Existing accounts stay opted out.
alter table public.profiles add column suggestion_emails_enabled boolean not null default false;
alter table private.email_daily_quota add column suggestion_reserved integer not null default 0;
create table private.reminder_idea_enrollments (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 id uuid not null default gen_random_uuid(), enrolled_at timestamptz not null default now(),
 next_eligible_at timestamptz not null default now()+interval '2 days', step integer not null default 0,
 last_sent_at timestamptz
);
create table private.reminder_idea_jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 enrollment_id uuid not null, step integer not null, theme text not null, variant integer not null default 0,
 content_version integer not null default 1,
 status text not null default 'pending' check(status in ('pending','sending','retry','accepted','delivered','failed','unknown','cancelled')),
 scheduled_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '23 hours',
 next_attempt_at timestamptz not null default now(), first_attempt_at timestamptz, attempts integer not null default 0,
 lease_token uuid, lease_until timestamptz, frozen_payload jsonb,
 provider_email_id text unique, accepted_at timestamptz, delivered_at timestamptz, last_error_code text,
 unique(user_id,enrollment_id,step)
);
create index reminder_idea_due on private.reminder_idea_jobs(next_attempt_at) where status in ('pending','retry','sending');
create index reminder_idea_history on private.reminder_idea_jobs(user_id,accepted_at);
alter table private.reminder_idea_enrollments enable row level security;
alter table private.reminder_idea_jobs enable row level security;
revoke all on private.reminder_idea_enrollments,private.reminder_idea_jobs from public,anon,authenticated;

create function public.update_email_preferences(p_email boolean,p_suggestions boolean) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); old_enabled boolean;
begin
 if p_email is null or p_suggestions is null then raise exception 'INVALID_INPUT'; end if;
 select suggestion_emails_enabled into old_enabled from public.profiles where id=u for update;
 update public.profiles set email_reminders_enabled=p_email,suggestion_emails_enabled=p_suggestions,updated_at=now() where id=u;
 if p_suggestions and not old_enabled then
  insert into private.reminder_idea_enrollments(user_id) values(u)
  on conflict(user_id) do update set id=gen_random_uuid(),enrolled_at=now(),next_eligible_at=greatest(now()+interval '2 days',coalesce(reminder_idea_enrollments.last_sent_at+interval '14 days',now())),step=0;
 end if;
 if not p_suggestions then update private.reminder_idea_jobs set status='cancelled' where user_id=u and status in ('pending','retry','sending'); end if;
 -- Preserve existing deadline scheduling and timezone behavior.
 perform public.update_preferences((select display_name from public.profiles where id=u),(select timezone from public.profiles where id=u),p_email);
end $$;
create function public.unsubscribe_reminder_ideas(p_user uuid,p_enrollment uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where id=p_user for update;
 if not exists(select 1 from private.reminder_idea_enrollments where user_id=p_user and id=p_enrollment) then return; end if;
 update public.profiles set suggestion_emails_enabled=false,updated_at=now() where id=p_user;
 update private.reminder_idea_jobs set status='cancelled' where user_id=p_user and status in ('pending','retry','sending');
end $$;

create function private.reminder_idea_category(template text,preset text) returns text language sql immutable set search_path='' as $$
 select case
 when preset in ('personal-loan','home-loan','car-loan','motorcycle-loan','salary-government-loan','credit-card-installment','business-loan','digital-online-loan','other-loan','car-payment') then 'loans'
 when preset in ('electric-bill','water-bill','internet-bill','mobile-bill','rent','association-dues','other-bill') then 'bills'
 when preset in ('life-insurance','health-insurance','vehicle-insurance','home-insurance','travel-insurance','other-insurance') then 'insurance'
 when preset in ('streaming','software','gym','professional-membership','other-subscription') then 'subscriptions'
 when preset in ('prc-license','postal-id','pwd-solo-parent-id','umid','national-id','other-id','nbi-clearance','police-clearance') then 'documents'
 when preset in ('appliance-service','home-maintenance','pest-control','other-service') then 'maintenance'
 when preset in ('medical-appointment','dental-appointment','checkup','vaccination','other-appointment') then 'health'
 when preset in ('tuition','enrollment','school-fees','other-school-deadline') then 'education'
 when template in ('car','motorcycle') then 'vehicles'
 when template in ('licence','passport') then 'documents'
 when template='receipt' then 'purchases'
 when template='aircon' then 'maintenance' else 'custom' end
$$;
create function private.choose_reminder_idea(u uuid,s integer) returns text language plpgsql stable security definer set search_path='' as $$
declare result text; preferred text;
begin
 if s=0 and not exists(select 1 from public.items where user_id=u and state='saved' and archived_at is null)
 and not exists(select 1 from private.reminder_idea_jobs where user_id=u and theme='start' and first_attempt_at>now()-interval '28 days' and status in ('accepted','delivered','unknown')) then return 'start'; end if;
 preferred:=case s when 0 then 'loans' when 1 then 'loans' when 2 then 'vehicles' when 3 then 'bills' when 4 then 'custom' else null end;
 select c.theme into result from (values ('loans',1),('vehicles',2),('bills',3),('custom',4),('insurance',5),('subscriptions',6),('documents',7),('purchases',8),('maintenance',9),('health',10),('education',11)) c(theme,ordinal)
 where not exists(select 1 from private.reminder_idea_jobs j where j.user_id=u and j.theme=c.theme and j.first_attempt_at>now()-interval '28 days' and j.status in ('accepted','delivered','unknown'))
 order by
 (select count(*) from public.items i where i.user_id=u and i.state='saved' and i.archived_at is null and private.reminder_idea_category(i.template_key,i.reminder_preset)=c.theme),
 case when c.theme=preferred then 0 else 1 end,
 (select max(j.first_attempt_at) from private.reminder_idea_jobs j where j.user_id=u and j.theme=c.theme and j.status in ('accepted','delivered','unknown')) nulls first,
 c.ordinal limit 1;
 return result;
end $$;
create function private.reminder_idea_eligible(u uuid,enrollment uuid,own_job uuid default null) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join auth.users a on a.id=p.id join private.reminder_idea_enrollments e on e.user_id=p.id
 where p.id=u and e.id=enrollment and p.suggestion_emails_enabled and not p.email_delivery_blocked and p.deletion_requested_at is null and a.email_confirmed_at is not null and a.email is not null
 and (now() at time zone p.timezone)::time>=time '10:00' and (now() at time zone p.timezone)::time<time '12:00'
 and not exists(select 1 from public.items i where i.user_id=u and i.state='saved' and i.created_at>now()-interval '48 hours')
 and not exists(select 1 from private.notification_jobs j left join public.important_dates d on d.id=j.date_id where coalesce(d.user_id,j.renewal_user)=u and greatest(j.accepted_at,j.first_attempt_at)>now()-interval '48 hours' and j.status in ('sending','accepted','delivered','unknown'))
 and not exists(select 1 from private.reminder_idea_jobs j where j.user_id=u and j.id is distinct from own_job and j.status in ('sending','retry','accepted','delivered','unknown') and j.first_attempt_at>now()-case when now()<e.enrolled_at+interval '31 days' then interval '7 days' else interval '14 days' end)
 and (e.last_sent_at is null or e.last_sent_at<=now()-case when now()<e.enrolled_at+interval '31 days' then interval '7 days' else interval '14 days' end))
$$;

create function public.claim_reminder_idea_jobs(p_limit integer default 1) returns jsonb language plpgsql security definer set search_path='' as $$
declare e private.reminder_idea_enrollments; j private.reminder_idea_jobs; remaining integer; chosen_theme text; results jsonb:='[]'; v integer; campaign_step integer; recovery_user uuid;
begin
 -- Same lock as deadline and renewal reservations: leave 80 of the 90 daily sends available to them.
 perform pg_advisory_xact_lock(719420001);
 -- Keep account-before-job lock order during recovery, as consent changes and preparation do.
 for recovery_user in select p.id from public.profiles p where exists(
  select 1 from private.reminder_idea_jobs recovery_job where recovery_job.user_id=p.id and
   ((recovery_job.status in ('sending','retry') and recovery_job.first_attempt_at<now()-interval '23 hours')
    or (recovery_job.status='sending' and recovery_job.lease_until<now())
    or (recovery_job.status in ('pending','retry') and recovery_job.expires_at<=now())))
 order by p.id for update skip locked limit 200 loop
  update private.reminder_idea_jobs set status='unknown',last_error_code='acceptance_unresolved',lease_until=null where user_id=recovery_user and status in ('sending','retry') and first_attempt_at<now()-interval '23 hours';
  update private.reminder_idea_jobs set status='retry',next_attempt_at=now() where user_id=recovery_user and status='sending' and lease_until<now();
  update private.reminder_idea_jobs set status='cancelled' where user_id=recovery_user and status in ('pending','retry') and expires_at<=now();
 end loop;
 insert into private.email_daily_quota(day) values((now() at time zone 'UTC')::date) on conflict do nothing;
 select greatest(0,least(90-reserved,10-suggestion_reserved,greatest(p_limit,0),2)) into remaining from private.email_daily_quota where day=(now() at time zone 'UTC')::date;
 -- Suggestions yield to due transactional backlog, even before the reserved allowance is exhausted.
 if remaining=0 or exists(select 1 from private.notification_jobs where status in ('pending','retry','sending') and next_attempt_at<=now()) then return results; end if;
 for e in select e0.* from private.reminder_idea_enrollments e0 join public.profiles p on p.id=e0.user_id
 where p.suggestion_emails_enabled and not p.email_delivery_blocked and p.deletion_requested_at is null
 and (now() at time zone p.timezone)::time>=time '10:00' and (now() at time zone p.timezone)::time<time '12:00' and (e0.next_eligible_at<=now() or exists(select 1 from private.reminder_idea_jobs j0 where j0.user_id=p.id and j0.status='retry' and j0.next_attempt_at<=now()))
 and (private.reminder_idea_eligible(e0.user_id,e0.id) or exists(select 1 from private.reminder_idea_jobs pending where pending.user_id=e0.user_id and pending.enrollment_id=e0.id and pending.status='retry' and pending.next_attempt_at<=now() and private.reminder_idea_eligible(e0.user_id,e0.id,pending.id)))
 order by e0.next_eligible_at,e0.user_id for update of p skip locked limit 100 loop
  exit when remaining<=0;
  select * into j from private.reminder_idea_jobs where user_id=e.user_id and enrollment_id=e.id and status='retry' and next_attempt_at<=now() order by scheduled_at limit 1 for update skip locked;
  if found then
   if not private.reminder_idea_eligible(e.user_id,e.id,j.id) then continue; end if;
  else
   if e.next_eligible_at>now() or not private.reminder_idea_eligible(e.user_id,e.id) then continue; end if;
   campaign_step:=greatest(e.step,case when now()>=e.enrolled_at+interval '31 days' then 5 else greatest(0,floor(extract(epoch from (now()-e.enrolled_at-interval '2 days'))/604800)::integer) end);
   chosen_theme:=private.choose_reminder_idea(e.user_id,campaign_step);
   if chosen_theme is null then continue; end if;
   select count(*)::integer%2 into v from private.reminder_idea_jobs where user_id=e.user_id and reminder_idea_jobs.theme=chosen_theme and status in ('accepted','delivered','unknown');
   insert into private.reminder_idea_jobs(user_id,enrollment_id,step,theme,variant) values(e.user_id,e.id,campaign_step,chosen_theme,v) returning * into j;
   update private.reminder_idea_enrollments set step=campaign_step+1,next_eligible_at=now()+case when now()<enrolled_at+interval '30 days' then interval '7 days' else interval '14 days' end where user_id=e.user_id;
  end if;
  update private.reminder_idea_jobs set status='sending',lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()) where id=j.id returning * into j;
  results:=results||jsonb_build_array(jsonb_build_object('id',j.id,'lease_token',j.lease_token,'user_id',j.user_id,'enrollment_id',j.enrollment_id,'theme',j.theme,'variant',j.variant,'email',(select email from auth.users where id=j.user_id),'payload',j.frozen_payload));
  remaining:=remaining-1;
 end loop;
 update private.email_daily_quota set reserved=reserved+jsonb_array_length(results),suggestion_reserved=suggestion_reserved+jsonb_array_length(results) where day=(now() at time zone 'UTC')::date;
 return results;
end $$;
create function public.prepare_reminder_idea(p_id uuid,p_lease uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.reminder_idea_jobs; u uuid; email text;
begin
 select user_id into u from private.reminder_idea_jobs where id=p_id;
 perform 1 from public.profiles where id=u for update;
 select * into j from private.reminder_idea_jobs where id=p_id and lease_token=p_lease and status='sending' and lease_until>now() for update;
 if not found then return null; end if;
 select a.email into email from auth.users a where a.id=u;
 if j.expires_at<=now() or not private.reminder_idea_eligible(u,j.enrollment_id,j.id)
 or (j.frozen_payload is not null and j.frozen_payload->>'to'<>email)
 or (j.frozen_payload is null and j.theme is distinct from private.choose_reminder_idea(u,j.step)) then
  update private.reminder_idea_jobs set status='cancelled' where id=j.id; return null;
 end if;
 if p_payload->>'to' is distinct from email or coalesce(p_payload->'headers'->>'List-Unsubscribe','')='' or p_payload->'headers'->>'List-Unsubscribe-Post' is distinct from 'List-Unsubscribe=One-Click' then raise exception 'INVALID_INPUT'; end if;
 update private.reminder_idea_jobs set frozen_payload=coalesce(frozen_payload,p_payload) where id=j.id returning frozen_payload into p_payload;
 return p_payload;
end $$;
create function public.finish_reminder_idea(p_id uuid,p_lease uuid,p_status text,p_provider_id text,p_error text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid;
begin
 if p_status not in ('accepted','retry','failed','unknown') then raise exception 'INVALID_INPUT'; end if;
 select user_id into u from private.reminder_idea_jobs where id=p_id;
 perform 1 from public.profiles where id=u for update;
 -- A provider response can arrive after opt-out: record it without resurrecting consent or retries.
 update private.reminder_idea_jobs set status=case when p_status='retry' and attempts>=6 then 'unknown' else p_status end,
 provider_email_id=coalesce(p_provider_id,provider_email_id),accepted_at=case when p_status='accepted' then now() else accepted_at end,
 lease_until=null,last_error_code=left(p_error,80),next_attempt_at=now()+case when attempts<=1 then interval '15 minutes' when attempts=2 then interval '1 hour' when attempts=3 then interval '4 hours' else interval '12 hours' end
 where id=p_id and lease_token=p_lease and (status='sending' or (status='cancelled' and p_status='accepted'));
 if found and p_status in ('accepted','unknown') then update private.reminder_idea_enrollments set last_sent_at=now() where user_id=u; end if;
 if p_provider_id is not null then perform public.record_email_event(p_provider_id,event_type) from private.email_events where provider_id=p_provider_id; end if;
end $$;

-- Retain the existing transactional event handling, including early webhooks.
alter function public.record_email_event(text,text) set schema private;
alter function private.record_email_event(text,text) rename to record_transactional_email_event;
create function public.record_email_event(p_id text,p_type text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid;
begin
 select user_id into u from private.reminder_idea_jobs where provider_email_id=p_id;
 if u is not null then perform 1 from public.profiles where id=u for update; end if;
 perform private.record_transactional_email_event(p_id,p_type);
 if p_type='email.delivered' then update private.reminder_idea_jobs set status='delivered',delivered_at=now() where provider_email_id=p_id and status='accepted';
 elsif p_type in ('email.bounced','email.complained') then
  update private.reminder_idea_jobs set status='failed',last_error_code=p_type where provider_email_id=p_id;
  update public.profiles set email_delivery_blocked=true where id=u;
  update private.reminder_idea_jobs set status='cancelled' where user_id=u and status in ('pending','retry','sending');
 end if;
end $$;
revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function private.active_account() to authenticated;
revoke execute on function public.update_email_preferences(boolean,boolean) from public,anon;
grant execute on function public.update_email_preferences(boolean,boolean) to authenticated;
revoke execute on function public.unsubscribe_reminder_ideas(uuid,uuid),public.claim_reminder_idea_jobs(integer),public.prepare_reminder_idea(uuid,uuid,jsonb),public.finish_reminder_idea(uuid,uuid,text,text,text),public.record_email_event(text,text) from public,anon,authenticated;
grant execute on function public.unsubscribe_reminder_ideas(uuid,uuid),public.claim_reminder_idea_jobs(integer),public.prepare_reminder_idea(uuid,uuid,jsonb),public.finish_reminder_idea(uuid,uuid,text,text,text),public.record_email_event(text,text) to service_role;
commit;
