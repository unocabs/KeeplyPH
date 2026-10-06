-- Optional provider identity for standalone insurance / HMO reminders.
-- Run the read-only prerequisite check and resolve missing earlier migrations first.
begin;
alter table public.items add column insurer_id text;
alter table public.items add column insurer_name text;
alter table public.items add constraint valid_insurer_id check (insurer_id is null or insurer_id in ('sun-life','pru-life-uk','aia','axa','manulife','insular-life','fwd','allianz-pnb-life','bdo-life','bpi-aia','sun-life-grepa','manulife-chinabank','eastwest-ageas','generali','singlife','malayan','standard','pioneer','bpi-ms','oona','cocogen','fpg','mercantile','pga-sompo','prudential-guarantee','pacific-cross','maxicare','medicard','other'));
alter table public.items add constraint valid_insurer_name check (insurer_name is null or (insurer_id is not null and insurer_id='other' and char_length(insurer_name) between 1 and 160 and insurer_name=btrim(insurer_name)));
create function private.insurer_allowed(p_preset text,p_insurer text) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(p_preset in ('life-insurance','health-insurance','vehicle-insurance','home-insurance','travel-insurance','other-insurance') and
 (p_insurer='other' or exists(select 1 from (values
 ('sun-life',array['life-insurance','health-insurance']::text[]),
 ('pru-life-uk',array['life-insurance','health-insurance']::text[]),
 ('aia',array['life-insurance','health-insurance']::text[]),
 ('axa',array['life-insurance','health-insurance','vehicle-insurance','home-insurance','travel-insurance']::text[]),
 ('manulife',array['life-insurance','health-insurance']::text[]),
 ('insular-life',array['life-insurance','health-insurance']::text[]),
 ('fwd',array['life-insurance','health-insurance']::text[]),
 ('allianz-pnb-life',array['life-insurance','health-insurance']::text[]),
 ('bdo-life',array['life-insurance','health-insurance']::text[]),
 ('bpi-aia',array['life-insurance','health-insurance']::text[]),
 ('sun-life-grepa',array['life-insurance','health-insurance']::text[]),
 ('manulife-chinabank',array['life-insurance','health-insurance']::text[]),
 ('eastwest-ageas',array['life-insurance','health-insurance']::text[]),
 ('generali',array['life-insurance','health-insurance']::text[]),
 ('singlife',array['life-insurance','health-insurance']::text[]),
 ('malayan',array['vehicle-insurance','home-insurance','travel-insurance']::text[]),
 ('standard',array['vehicle-insurance','home-insurance','travel-insurance']::text[]),
 ('pioneer',array['life-insurance','health-insurance','vehicle-insurance','home-insurance','travel-insurance']::text[]),
 ('bpi-ms',array['health-insurance','vehicle-insurance','home-insurance','travel-insurance']::text[]),
 ('oona',array['health-insurance','vehicle-insurance','home-insurance','travel-insurance']::text[]),
 ('cocogen',array['vehicle-insurance','home-insurance','travel-insurance']::text[]),
 ('fpg',array['vehicle-insurance','home-insurance','travel-insurance']::text[]),
 ('mercantile',array['vehicle-insurance','home-insurance','travel-insurance']::text[]),
 ('pga-sompo',array['vehicle-insurance','home-insurance','travel-insurance']::text[]),
 ('prudential-guarantee',array['vehicle-insurance','home-insurance','travel-insurance']::text[]),
 ('pacific-cross',array['health-insurance','travel-insurance']::text[]),
 ('maxicare',array['health-insurance']::text[]),
 ('medicard',array['health-insurance']::text[])
 ) as provider(id,categories) where id=p_insurer and (p_preset='other-insurance' or p_preset=any(categories)))),false);
$$;
revoke all on function private.insurer_allowed(text,text) from public,anon,authenticated;
-- Keep compatible providers when an older client edits an item; clear on incompatible type changes.
create function private.keep_insurer_compatible() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.template_key<>'other' or not private.insurer_allowed(new.reminder_preset,new.insurer_id) then
  new.insurer_id:=null; new.insurer_name:=null;
 end if;
 return new;
end $$;
revoke all on function private.keep_insurer_compatible() from public,anon,authenticated;
create trigger keep_insurer_compatible before update of reminder_preset,template_key on public.items
for each row execute function private.keep_insurer_compatible();
create function public.save_insurance_item_with_date(
 p_id uuid,p_revision integer,p_label text,p_notes text,p_date jsonb default null,p_preset text default null,
 p_insurer_id text default null,p_insurer_name text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); i public.items; effective_preset text; selected_insurer text; selected_name text;
begin
 perform 1 from public.profiles where id=u for update;
 select * into i from public.items where id=p_id and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 effective_preset:=case when p_preset is null then i.reminder_preset else nullif(p_preset,'') end;
 if i.template_key<>'other' or not private.insurer_allowed(effective_preset,'other') then raise exception 'INVALID_INPUT'; end if;
 selected_insurer:=case when p_insurer_id is null and private.insurer_allowed(effective_preset,i.insurer_id) then i.insurer_id else nullif(p_insurer_id,'') end;
 if selected_insurer is not null and not private.insurer_allowed(effective_preset,selected_insurer) then raise exception 'INVALID_INPUT'; end if;
 if nullif(btrim(p_insurer_name),'') is not null and (selected_insurer is distinct from 'other' or char_length(btrim(p_insurer_name))>160) then raise exception 'INVALID_INPUT'; end if;
 selected_name:=case when selected_insurer='other' then
  case when p_insurer_name is null and i.insurer_id='other' then i.insurer_name else nullif(btrim(p_insurer_name),'') end else null end;
 -- Existing RPC enforces revisions, dates, coverage and identity cleanup atomically.
 perform public.save_item_with_date(p_id,p_revision,p_label,p_notes,p_date,p_preset);
 update public.items set insurer_id=selected_insurer,insurer_name=selected_name where id=p_id and user_id=u;
 return p_id;
end $$;
revoke all on function public.save_insurance_item_with_date(uuid,integer,text,text,jsonb,text,text,text) from public,anon;
grant execute on function public.save_insurance_item_with_date(uuid,integer,text,text,jsonb,text,text,text) to authenticated;
commit;
