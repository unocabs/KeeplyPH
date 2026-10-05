-- Optional service/gym identity, saved independently from the reminder name.
-- Apply after all migrations through 202610050021; no name-based backfill.
begin;
alter table public.items add column subscription_brand text;
alter table public.items add constraint valid_subscription_brand check (subscription_brand is null or subscription_brand in ('netflix','disney-plus','hbo-max','prime-video','apple-tv','viu','iqiyi','wetv','crunchyroll','iwant','viva-one','vmx','spotify','apple-music','youtube-music','youtube-premium','cignal-play','bein-sports','anytime-fitness','fitness-first','golds-gym','surge','snap-fitness','slimmers-world','ufc-gym','kinetix-lab','other'));

create or replace function public.save_item_with_date(p_id uuid,p_revision integer,p_label text,p_notes text,p_date jsonb default null,p_preset text default null,p_car_brand text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); i public.items; effective_preset text; eligible boolean;
begin
 -- Follow existing account-before-item lock ordering.
 perform 1 from public.profiles where id=u for update;
 select * into i from public.items where id=p_id and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 effective_preset:=case when p_preset is null then i.reminder_preset else nullif(p_preset,'') end;
 eligible:=i.template_key='car' or (i.template_key='other' and coalesce(effective_preset,'') in ('car-loan','car-payment'));
 if nullif(p_car_brand,'') is not null and not eligible then raise exception 'INVALID_INPUT'; end if;
 perform private.save_item_with_preset_base(p_id,p_revision,p_label,p_notes,p_date,p_preset);
 update public.items set car_brand=case
  when not eligible then null
  when p_car_brand is null then i.car_brand
  else nullif(p_car_brand,'') end
, motorcycle_brand=case when i.template_key='motorcycle' or (i.template_key='other' and effective_preset='motorcycle-loan') then i.motorcycle_brand else null end
, subscription_brand=case when i.template_key='other' and effective_preset in ('streaming','gym') and effective_preset=i.reminder_preset then i.subscription_brand else null end
 where id=p_id and user_id=u;
 return p_id;
end $$;


create function public.save_subscription_item_with_date(p_id uuid,p_revision integer,p_label text,p_notes text,p_date jsonb default null,p_preset text default null,p_subscription_brand text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); i public.items; effective_preset text; eligible boolean;
begin
 perform 1 from public.profiles where id=u for update;
 select * into i from public.items where id=p_id and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 effective_preset:=case when p_preset is null then i.reminder_preset else nullif(p_preset,'') end;
 eligible:=i.template_key='other' and coalesce(effective_preset,'') in ('streaming','gym');
 if nullif(p_subscription_brand,'') is not null and (
  not eligible or not (p_subscription_brand='other'
   or (effective_preset='streaming' and p_subscription_brand in ('netflix','disney-plus','hbo-max','prime-video','apple-tv','viu','iqiyi','wetv','crunchyroll','iwant','viva-one','vmx','spotify','apple-music','youtube-music','youtube-premium','cignal-play','bein-sports'))
   or (effective_preset='gym' and p_subscription_brand in ('anytime-fitness','fitness-first','golds-gym','surge','snap-fitness','slimmers-world','ufc-gym','kinetix-lab')))
 ) then raise exception 'INVALID_INPUT'; end if;
 -- Keep the existing name/date/revision/coverage transaction and ownership checks.
 perform public.save_item_with_date(p_id,p_revision,p_label,p_notes,p_date,p_preset,'');
 update public.items set subscription_brand=case
  when not eligible then null
  when p_subscription_brand is null and effective_preset=i.reminder_preset then i.subscription_brand
  else nullif(p_subscription_brand,'') end
 where id=p_id and user_id=u;
 return p_id;
end $$;
revoke all on function public.save_subscription_item_with_date(uuid,integer,text,text,jsonb,text,text) from public,anon;
grant execute on function public.save_subscription_item_with_date(uuid,integer,text,text,jsonb,text,text) to authenticated;
commit;
