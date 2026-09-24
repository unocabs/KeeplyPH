create table public.documents (
  id uuid primary key default gen_random_uuid(), purchase_id uuid not null, user_id uuid not null,
  kind text not null check(kind in ('receipt','warranty')),
  state text not null default 'pending' check(state in ('pending','ready','failed')),
  staging_key text not null unique, object_key text not null unique,
  original_name text not null check(char_length(original_name)<=255),
  mime_type text, size_bytes bigint, reserved_bytes bigint not null check(reserved_bytes between 1 and 10485760),
  checksum text, upload_expires_at timestamptz not null default now()+interval '2 hours',
  created_at timestamptz not null default now(),
  foreign key(purchase_id,user_id) references public.purchases(id,user_id) on delete cascade,
  check(state<>'ready' or (size_bytes>0 and size_bytes<=reserved_bytes and checksum is not null))
);
create index documents_purchase_idx on public.documents(purchase_id,kind,created_at);
create index documents_owner_idx on public.documents(user_id);
create index documents_pending_idx on public.documents(state,upload_expires_at);
create table private.object_deletions (
  id uuid primary key default gen_random_uuid(), bucket text not null, object_key text not null,
  not_before timestamptz not null default now(), next_attempt_at timestamptz not null default now(),
  attempts integer not null default 0, created_at timestamptz not null default now(),
  unique(bucket,object_key)
);
create index object_deletions_due_idx on private.object_deletions(next_attempt_at);
alter table public.documents enable row level security;
create policy own_documents on public.documents for select to authenticated using(user_id=(select auth.uid()) and (select private.active_account()));
revoke all on public.documents from anon,authenticated;
grant select on public.documents to authenticated;
grant all on public.documents to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('upload-staging','upload-staging',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']),
  ('purchase-documents','purchase-documents',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do nothing;
create policy keeply_owned_ready_objects on storage.objects for select to authenticated using(
  bucket_id='purchase-documents' and (select private.active_account()) and exists(
    select 1 from public.documents d where d.object_key=name and d.user_id=(select auth.uid()) and d.state='ready'
  )
);
create function private.queue_document_deletion() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Allow in-flight finalizers (bounded to 60 seconds) to finish before sweeping.
  insert into private.object_deletions(bucket,object_key,not_before,next_attempt_at)
    values('purchase-documents',old.object_key,now()+interval '15 minutes',now()+interval '15 minutes') on conflict do nothing;
  insert into private.object_deletions(bucket,object_key,not_before,next_attempt_at)
    values('upload-staging',old.staging_key,greatest(now(),old.upload_expires_at+interval '10 minutes'),greatest(now(),old.upload_expires_at+interval '10 minutes'))
    on conflict(bucket,object_key) do update set not_before=greatest(private.object_deletions.not_before,excluded.not_before),next_attempt_at=greatest(private.object_deletions.next_attempt_at,excluded.next_attempt_at);
  return old;
end $$;
create trigger document_cleanup before delete on public.documents for each row execute function private.queue_document_deletion();
create function public.reserve_document(p_id uuid,p_purchase_id uuid,p_kind text,p_name text,p_bytes bigint) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := private.require_user(); d public.documents; lim bigint := case when private.is_premium(u) then 2147483648 else 104857600 end; k text;
begin
  if not exists(select 1 from public.purchases where id=p_purchase_id and user_id=u) then raise exception 'NOT_FOUND'; end if;
  perform private.rate_limit(u,'upload',10);
  select * into d from public.documents where id=p_id and user_id=u and purchase_id=p_purchase_id;
  if found then
    if d.upload_expires_at<now() then raise exception 'UPLOAD_EXPIRED'; end if;
    if d.state='pending' then
      -- Every issued signed upload URL is valid for two hours from issuance.
      update public.documents set upload_expires_at=now()+interval '2 hours' where id=d.id returning * into d;
    end if;
    return to_jsonb(d);
  end if;
  if p_bytes<1 or p_bytes>10485760 then raise exception 'FILE_TOO_LARGE'; end if;
  if (select count(*) from public.documents where purchase_id=p_purchase_id)>=6 then raise exception 'FILE_COUNT_LIMIT'; end if;
  if coalesce((select sum(case when state='ready' then size_bytes else reserved_bytes end) from public.documents where user_id=u),0)+p_bytes>lim then raise exception 'STORAGE_LIMIT'; end if;
  k := u::text||'/'||p_purchase_id::text||'/'||p_id::text;
  insert into public.documents(id,purchase_id,user_id,kind,staging_key,object_key,original_name,reserved_bytes)
    values(p_id,p_purchase_id,u,p_kind,k||'/original',k||'/validated',left(p_name,255),p_bytes) returning * into d;
  return to_jsonb(d);
end $$;
create function public.remove_document(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := private.require_user();
begin
  perform private.rate_limit(u,'write',30);
  delete from public.documents where id=p_id and user_id=u;
  if not found then raise exception 'NOT_FOUND'; end if;
end $$;
create function public.begin_document_validation(p_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := private.require_user(); d public.documents;
begin
  perform private.rate_limit(u,'validate_file',10);
  select * into d from public.documents where id=p_id and user_id=u;
  if not found then raise exception 'NOT_FOUND'; end if;
  return to_jsonb(d);
end $$;
create function public.finalize_document(p_id uuid,p_user_id uuid,p_size bigint,p_mime text,p_checksum text) returns void language plpgsql security definer set search_path = '' as $$
declare d public.documents;
begin
  perform 1 from public.profiles where id=p_user_id and deletion_requested_at is null for update;
  if not found then raise exception 'ACCOUNT_UNAVAILABLE'; end if;
  select * into d from public.documents where id=p_id and user_id=p_user_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if d.state='ready' then
    if d.checksum<>p_checksum then raise exception 'CONFLICT'; end if;
    return;
  end if;
  if d.upload_expires_at<now() then raise exception 'UPLOAD_EXPIRED'; end if;
  if p_size<1 or p_size>d.reserved_bytes or p_mime not in ('image/jpeg','image/png','image/webp','application/pdf') or p_checksum !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_FILE'; end if;
  update public.documents set state='ready',mime_type=p_mime,size_bytes=p_size,checksum=p_checksum where id=p_id;
  insert into private.object_deletions(bucket,object_key,not_before,next_attempt_at) values('upload-staging',d.staging_key,d.upload_expires_at+interval '10 minutes',d.upload_expires_at+interval '10 minutes') on conflict do nothing;
end $$;
create function public.account_usage() returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := private.require_user(); t date;
begin
  select (now() at time zone timezone)::date into t from public.profiles where id=u;
  return jsonb_build_object(
    'purchases',(select count(*) from public.purchases where user_id=u and state='saved'),
    'reminders',(select count(*) from public.warranties where user_id=u and reminders_enabled and expires_on>=t),
    'storage_bytes',coalesce((select sum(case when state='ready' then size_bytes else reserved_bytes end) from public.documents where user_id=u),0),
    'premium',private.is_premium(u),
    'premium_until',(select premium_until from public.account_entitlements where user_id=u)
  );
end $$;
revoke execute on function private.queue_document_deletion() from public,anon,authenticated;
revoke execute on function public.reserve_document(uuid,uuid,text,text,bigint),public.remove_document(uuid),public.account_usage(),public.begin_document_validation(uuid) from public,anon;
grant execute on function public.reserve_document(uuid,uuid,text,text,bigint),public.remove_document(uuid),public.account_usage(),public.begin_document_validation(uuid) to authenticated;
revoke execute on function public.finalize_document(uuid,uuid,bigint,text,text) from public,anon,authenticated;
grant execute on function public.finalize_document(uuid,uuid,bigint,text,text) to service_role;
