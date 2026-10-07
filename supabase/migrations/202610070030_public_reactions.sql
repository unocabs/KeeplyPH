-- Anonymous calculator reactions; no plate, account, IP, or referrer data.
begin;
create table private.public_reaction_counts (
 day date not null, reaction text not null check (reaction in ('helpful','easy','love')),
 count bigint not null default 1, primary key(day,reaction)
);
create table private.public_reaction_receipts (
 id uuid primary key, reaction text not null check (reaction in ('helpful','easy','love')),
 created_at timestamptz not null default now()
);
create index public_reaction_receipts_retention on private.public_reaction_receipts(created_at);
alter table private.public_reaction_counts enable row level security;
alter table private.public_reaction_receipts enable row level security;
revoke all on private.public_reaction_counts,private.public_reaction_receipts from public,anon,authenticated;
create function public.public_reactions_ready() returns boolean language sql security definer set search_path='' as $$
 select to_regclass('private.public_reaction_counts') is not null and to_regclass('private.public_reaction_receipts') is not null
 and to_regprocedure('public.record_public_reaction(uuid,text)') is not null
 and to_regprocedure('public.purge_public_reaction_receipts()') is not null
$$;
create function public.record_public_reaction(p_id uuid,p_reaction text) returns void language plpgsql security definer set search_path='' as $$
declare inserted integer; previous text;
begin
 if p_id is null or p_reaction is null or p_reaction not in ('helpful','easy','love') then raise exception 'INVALID_REACTION'; end if;
 -- Bound anonymous write volume without identifying visitors.
 perform private.rate_limit('00000000-0000-0000-0000-000000000000','public_reactions',120,60);
 insert into private.public_reaction_receipts(id,reaction) values(p_id,p_reaction) on conflict do nothing;
 get diagnostics inserted = row_count;
 if inserted=0 then
  select reaction into previous from private.public_reaction_receipts where id=p_id;
  if previous<>p_reaction then raise exception 'REACTION_CONFLICT'; end if;
  return;
 end if;
 insert into private.public_reaction_counts(day,reaction) values((now() at time zone 'Asia/Manila')::date,p_reaction)
 on conflict(day,reaction) do update set count=private.public_reaction_counts.count+1;
end $$;
create function public.purge_public_reaction_receipts() returns void language sql security definer set search_path='' as $$
 delete from private.public_reaction_receipts where created_at<now()-interval '400 days';
$$;
revoke execute on function public.public_reactions_ready(),public.record_public_reaction(uuid,text),public.purge_public_reaction_receipts() from public,anon,authenticated;
grant execute on function public.public_reactions_ready(),public.record_public_reaction(uuid,text),public.purge_public_reaction_receipts() to service_role;
commit;
