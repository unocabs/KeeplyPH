-- One household email per account/local day, with durable membership and provider identity.
begin;
alter table private.notification_jobs drop constraint notification_jobs_provider_email_id_key;
create index notification_provider_email on private.notification_jobs(provider_email_id) where provider_email_id is not null;
-- Do not resend an ambiguous individual email during the deployment cutover.
update private.notification_jobs set status='unknown',last_error_code='legacy_acceptance_unresolved',updated_at=now()
where status in ('sending','retry') and frozen_payload is not null;
update private.notification_jobs set status='pending',next_attempt_at=now(),lease_until=null,updated_at=now()
where status='sending' and frozen_payload is null;
update private.notification_jobs set status='cancelled',updated_at=now() where renewal_user is not null and status in ('pending','retry');
create table private.household_email_batches (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 local_day date not null,job_ids uuid[] not null,snapshot jsonb not null,
 status text not null check(status in ('sending','retry','accepted','cancelled','failed','unknown')),
 lease_token uuid,lease_until timestamptz,next_attempt_at timestamptz not null default now(),attempts integer not null default 1,
 frozen_payload jsonb,first_attempt_at timestamptz,provider_email_id text,created_at timestamptz not null default now()
);
create index household_email_due on private.household_email_batches(status,next_attempt_at);
create index household_email_account_day on private.household_email_batches(user_id,local_day);
alter table private.household_email_batches enable row level security;
revoke all on private.household_email_batches from public,anon,authenticated;
create function private.household_email_snapshot(ids uuid[]) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('job_id',j.id,'item_id',i.id,'date_id',d.id,'product_name',i.product_name,'label',d.label,'due_on',o.due_on,
 'amount_minor',case when o.amount_certainty is not null then o.expected_amount_minor else d.payment_amount_minor end,
 'certainty',coalesce(o.amount_certainty,d.payment_amount_certainty),'scheduled_on',(j.scheduled_at at time zone p.timezone)::date) order by o.due_on,j.id),'[]'::jsonb)
 from private.notification_jobs j join public.important_dates d on d.id=j.date_id join public.items i on i.id=d.item_id join public.date_occurrences o on o.id=j.occurrence_id join public.profiles p on p.id=i.user_id
 where j.id=any(ids) and private.email_job_eligible(j) and (j.scheduled_at at time zone p.timezone)::date=(now() at time zone p.timezone)::date
$$;
create function public.claim_household_emails(p_limit integer default 2) returns jsonb language plpgsql security definer set search_path='' as $$
declare r record;b private.household_email_batches;ids uuid[];remaining integer;result jsonb:='[]'::jsonb;snapshot jsonb;
begin
 perform pg_advisory_xact_lock(719420001);
 -- A crash after freezing might have sent. Never generate a replacement in that case.
 for b in select * from private.household_email_batches where status='sending' and lease_until<now() loop
 update private.household_email_batches set status=case when frozen_payload is null then 'cancelled' else 'unknown' end where id=b.id;
 update private.notification_jobs set status=case when b.frozen_payload is null then 'pending' else 'unknown' end,next_attempt_at=now(),last_error_code=case when b.frozen_payload is null then null else 'household_acceptance_unresolved' end where id=any(b.job_ids) and status='sending';
 end loop;
 with expired as(update private.household_email_batches set status='failed' where status='retry' and (first_attempt_at<now()-interval '23 hours' or attempts>=6) returning job_ids)
 update private.notification_jobs set status='failed',updated_at=now() where id in(select unnest(job_ids) from expired) and status='retry';
 update private.notification_jobs j set status='skipped',updated_at=now() from public.important_dates d,public.profiles p
 where d.id=j.date_id and p.id=d.user_id and j.status in ('pending','retry') and (j.scheduled_at at time zone p.timezone)::date<(now() at time zone p.timezone)::date;
 update private.notification_jobs j set status='cancelled',updated_at=now() where j.date_id is not null and j.status in ('pending','retry') and not private.email_job_eligible(j);
 -- New sends use only the latest due timing for an occurrence.
 update private.notification_jobs j set status='skipped',updated_at=now() where j.date_id is not null and j.status='pending' and j.next_attempt_at<=now() and exists(select 1 from private.notification_jobs n where n.occurrence_id=j.occurrence_id and n.scheduled_at>j.scheduled_at and n.scheduled_at<=now() and n.status in ('pending','sending','accepted','delivered'));
 insert into private.email_daily_quota(day) values((now() at time zone 'UTC')::date) on conflict do nothing;
 select greatest(0,90-reserved) into remaining from private.email_daily_quota where day=(now() at time zone 'UTC')::date;
 for b in select * from private.household_email_batches where status='retry' and next_attempt_at<=now() order by next_attempt_at,id for update skip locked limit least(greatest(p_limit,0),remaining,2) loop
 perform 1 from public.profiles where id=b.user_id for update;
 update private.household_email_batches set status='sending',lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes',attempts=attempts+1 where id=b.id returning * into b;
 result:=result||jsonb_build_array(jsonb_build_object('id',b.id,'lease_token',b.lease_token,'email',(select email from auth.users where id=b.user_id),'rows',b.snapshot,'payload',b.frozen_payload));remaining:=remaining-1;
 end loop;
 for r in select p.id,(now() at time zone p.timezone)::date local_day from public.profiles p where p.deletion_requested_at is null and exists(select 1 from private.notification_jobs j join public.important_dates d on d.id=j.date_id where d.user_id=p.id and j.status='pending' and j.next_attempt_at<=now() and (j.scheduled_at at time zone p.timezone)::date=(now() at time zone p.timezone)::date)
 and not exists(select 1 from private.household_email_batches existing where existing.user_id=p.id and existing.local_day=(now() at time zone p.timezone)::date and existing.status in ('sending','retry','accepted','unknown'))
 -- A previous individual send also consumes this day's reminder email during cutover.
 and not exists(select 1 from private.notification_jobs legacy join public.important_dates ld on ld.id=legacy.date_id
 where ld.user_id=p.id and legacy.status in ('accepted','delivered','unknown')
 and (coalesce(legacy.first_attempt_at,legacy.accepted_at) at time zone p.timezone)::date=(now() at time zone p.timezone)::date
 and not exists(select 1 from private.household_email_batches member where legacy.id=any(member.job_ids))) order by p.id limit least(greatest(p_limit-jsonb_array_length(result),0),remaining,2) loop
 perform private.trim_reminders(r.id);
 select array_agg(j.id order by j.id) into ids from private.notification_jobs j join public.important_dates d on d.id=j.date_id join public.profiles p on p.id=d.user_id where d.user_id=r.id and j.status='pending' and j.next_attempt_at<=now() and (j.scheduled_at at time zone p.timezone)::date=r.local_day and private.email_job_eligible(j);
 if ids is null then continue;end if;
 snapshot:=private.household_email_snapshot(ids);
 insert into private.household_email_batches(user_id,local_day,job_ids,snapshot,status,lease_token,lease_until) values(r.id,r.local_day,ids,snapshot,'sending',gen_random_uuid(),now()+interval '3 minutes') returning * into b;
 update private.notification_jobs set status='sending',lease_token=b.lease_token,lease_until=b.lease_until,attempts=attempts+1 where id=any(ids);
 result:=result||jsonb_build_array(jsonb_build_object('id',b.id,'lease_token',b.lease_token,'email',(select email from auth.users where id=r.id),'rows',snapshot,'payload',null));
 end loop;
 update private.email_daily_quota set reserved=reserved+jsonb_array_length(result) where day=(now() at time zone 'UTC')::date;
 return result;
end $$;
create function public.prepare_household_email(p_id uuid,p_lease uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare b private.household_email_batches;u uuid;email text;
begin
 select user_id into u from private.household_email_batches where id=p_id;perform 1 from public.profiles where id=u for update;
 select * into b from private.household_email_batches where id=p_id and status='sending' and lease_token=p_lease and lease_until>now() for update;if not found then return null;end if;
 select a.email into email from auth.users a join public.profiles p on p.id=a.id where a.id=u and a.email_confirmed_at is not null and p.email_reminders_enabled and not p.email_delivery_blocked and p.deletion_requested_at is null;
 if email is null or p_payload->>'to' is distinct from email or private.household_email_snapshot(b.job_ids)<>b.snapshot or (b.frozen_payload is not null and b.frozen_payload->>'to' is distinct from email) then
 update private.household_email_batches set status='cancelled' where id=b.id;
 -- No send, or a definitive rate-limit rejection. Remaining eligible dates can form a fresh batch.
 update private.notification_jobs j set status=case when private.email_job_eligible(j) then 'pending' else 'cancelled' end,next_attempt_at=now() where id=any(b.job_ids) and status in ('sending','retry');return null;
 end if;
 if p_payload->>'to' is distinct from email or p_payload->>'subject' is null or p_payload->>'html' is null or p_payload->>'text' is null then raise exception 'INVALID_INPUT';end if;
 update private.household_email_batches set frozen_payload=coalesce(frozen_payload,p_payload),first_attempt_at=coalesce(first_attempt_at,now()) where id=b.id returning frozen_payload into p_payload;
 update private.notification_jobs set first_attempt_at=coalesce(first_attempt_at,now()) where id=any(b.job_ids);
 return p_payload;
end $$;
create function public.finish_household_email(p_id uuid,p_lease uuid,p_status text,p_provider_id text default null) returns void language plpgsql security definer set search_path='' as $$
declare b private.household_email_batches;u uuid;e record;final_status text;
begin
 if p_status not in ('accepted','retry','failed','unknown') then raise exception 'INVALID_INPUT';end if;
 select user_id into u from private.household_email_batches where id=p_id;perform 1 from public.profiles where id=u for update;
 select * into b from private.household_email_batches where id=p_id and status='sending' and lease_token=p_lease for update;if not found then return;end if;
 if p_status='accepted' and (p_provider_id is null or b.frozen_payload is null) then raise exception 'INVALID_INPUT';end if;
 final_status:=case when p_status='retry' and b.attempts>=6 then 'failed' else p_status end;
 update private.household_email_batches set status=final_status,provider_email_id=p_provider_id,next_attempt_at=now()+interval '15 minutes',lease_until=null where id=b.id;
 update private.notification_jobs set status=final_status,provider_email_id=p_provider_id,accepted_at=case when final_status='accepted' then now() end,next_attempt_at=now()+interval '15 minutes',updated_at=now(),last_error_code=case when final_status='unknown' then 'household_acceptance_unresolved' else null end where id=any(b.job_ids);
 if p_provider_id is not null then for e in select event_type from private.email_events where provider_id=p_provider_id loop perform public.record_email_event(p_provider_id,e.event_type);end loop;end if;
end $$;
-- Match the existing two-day email-content retention; retain only short-lived delivery metadata.
alter function public.run_maintenance() rename to run_maintenance_before_household_email;
create function public.run_maintenance() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=public.run_maintenance_before_household_email();
 update private.household_email_batches set frozen_payload=null,snapshot='[]'::jsonb where created_at<now()-interval '2 days' and status not in ('sending','retry');
 delete from private.household_email_batches where created_at<now()-interval '90 days' and status not in ('sending','retry');
 return result;
end $$;
revoke all on function public.run_maintenance_before_household_email(),public.run_maintenance() from public,anon,authenticated,service_role;
grant execute on function public.run_maintenance() to service_role;
-- Legacy slot-expiry messages would now be misleading.
create or replace function public.claim_renewal_jobs(p_limit integer default 2) returns jsonb language plpgsql security definer set search_path='' as $$
begin update private.notification_jobs set status='cancelled' where renewal_user is not null and status in ('pending','retry');return '[]'::jsonb;end $$;
update private.feedback_settings set promotion_enabled=false;
revoke all on function private.household_email_snapshot(uuid[]) from public,anon,authenticated,service_role;
revoke all on function public.claim_household_emails(integer),public.prepare_household_email(uuid,uuid,jsonb),public.finish_household_email(uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.claim_household_emails(integer),public.prepare_household_email(uuid,uuid,jsonb),public.finish_household_email(uuid,uuid,text,text) to service_role;
comment on function public.claim_household_emails(integer) is 'keeply:household-email-v1';
commit;
