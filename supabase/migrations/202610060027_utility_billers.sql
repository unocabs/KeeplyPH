-- Optional provider identity for standalone utility / household bill reminders.
-- Run the read-only prerequisite check and resolve missing earlier migrations first.
begin;
alter table public.items add column utility_id text;
alter table public.items add column utility_name text;
alter table public.items add constraint valid_utility_id check (utility_id is null or utility_id in ('meralco','visayan-electric','davao-light','more-power','cepalco','beneco','batelec-i','batelec-ii','angeles-electric','sfelapco','iligan-light','olongapo-electric','maynilad','manila-water','primewater','laguna-water','boracay-water','mcwd','davao-water','metro-pacific-iloilo-water','subic-water','metro-lipa-water','pldt','globe','converge','sky','dito','eastern','cablelink','smart','other'));
alter table public.items add constraint valid_utility_name check (utility_name is null or (utility_id is not null and utility_id='other' and char_length(utility_name) between 1 and 160 and utility_name=btrim(utility_name)));
create function private.utility_allowed(p_preset text,p_utility text) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(p_preset in ('electric-bill','water-bill','internet-bill','mobile-bill','rent','association-dues','other-bill') and
 (p_utility='other' or exists(select 1 from (values
 ('meralco',array['electric-bill']::text[]),
 ('visayan-electric',array['electric-bill']::text[]),
 ('davao-light',array['electric-bill']::text[]),
 ('more-power',array['electric-bill']::text[]),
 ('cepalco',array['electric-bill']::text[]),
 ('beneco',array['electric-bill']::text[]),
 ('batelec-i',array['electric-bill']::text[]),
 ('batelec-ii',array['electric-bill']::text[]),
 ('angeles-electric',array['electric-bill']::text[]),
 ('sfelapco',array['electric-bill']::text[]),
 ('iligan-light',array['electric-bill']::text[]),
 ('olongapo-electric',array['electric-bill']::text[]),
 ('maynilad',array['water-bill']::text[]),
 ('manila-water',array['water-bill']::text[]),
 ('primewater',array['water-bill']::text[]),
 ('laguna-water',array['water-bill']::text[]),
 ('boracay-water',array['water-bill']::text[]),
 ('mcwd',array['water-bill']::text[]),
 ('davao-water',array['water-bill']::text[]),
 ('metro-pacific-iloilo-water',array['water-bill']::text[]),
 ('subic-water',array['water-bill']::text[]),
 ('metro-lipa-water',array['water-bill']::text[]),
 ('pldt',array['internet-bill','mobile-bill']::text[]),
 ('globe',array['internet-bill','mobile-bill']::text[]),
 ('converge',array['internet-bill']::text[]),
 ('sky',array['internet-bill','other-bill']::text[]),
 ('dito',array['internet-bill','mobile-bill']::text[]),
 ('eastern',array['internet-bill']::text[]),
 ('cablelink',array['internet-bill','other-bill']::text[]),
 ('smart',array['mobile-bill']::text[])
 ) as provider(id,categories) where id=p_utility and p_preset=any(categories))),false);
$$;
revoke all on function private.utility_allowed(text,text) from public,anon,authenticated;
-- Keep compatible providers when an older client edits an item; clear on incompatible type changes.
create function private.keep_utility_compatible() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.template_key<>'other' or not private.utility_allowed(new.reminder_preset,new.utility_id) then
  new.utility_id:=null; new.utility_name:=null;
 end if;
 return new;
end $$;
revoke all on function private.keep_utility_compatible() from public,anon,authenticated;
create trigger keep_utility_compatible before update of reminder_preset,template_key on public.items
for each row execute function private.keep_utility_compatible();
create function public.save_utility_item_with_date(
 p_id uuid,p_revision integer,p_label text,p_notes text,p_date jsonb default null,p_preset text default null,
 p_utility_id text default null,p_utility_name text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); i public.items; effective_preset text; selected_utility text; selected_name text;
begin
 perform 1 from public.profiles where id=u for update;
 select * into i from public.items where id=p_id and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 effective_preset:=case when p_preset is null then i.reminder_preset else nullif(p_preset,'') end;
 if i.template_key<>'other' or not private.utility_allowed(effective_preset,'other') then raise exception 'INVALID_INPUT'; end if;
 selected_utility:=case when p_utility_id is null and private.utility_allowed(effective_preset,i.utility_id) then i.utility_id else nullif(p_utility_id,'') end;
 if selected_utility is not null and not private.utility_allowed(effective_preset,selected_utility) then raise exception 'INVALID_INPUT'; end if;
 if nullif(btrim(p_utility_name),'') is not null and (selected_utility is distinct from 'other' or char_length(btrim(p_utility_name))>160) then raise exception 'INVALID_INPUT'; end if;
 selected_name:=case when selected_utility='other' then
  case when p_utility_name is null and i.utility_id='other' then i.utility_name else nullif(btrim(p_utility_name),'') end else null end;
 -- Existing RPC enforces revisions, dates, coverage and identity cleanup atomically.
 perform public.save_item_with_date(p_id,p_revision,p_label,p_notes,p_date,p_preset);
 update public.items set utility_id=selected_utility,utility_name=selected_name where id=p_id and user_id=u;
 return p_id;
end $$;
revoke all on function public.save_utility_item_with_date(uuid,integer,text,text,jsonb,text,text,text) from public,anon;
grant execute on function public.save_utility_item_with_date(uuid,integer,text,text,jsonb,text,text,text) to authenticated;
commit;
