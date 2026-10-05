-- Optional motorcycle identity. Requires all migrations through 202610050020.
-- Existing car RPC/signature and omitted-brand behavior remain compatible.
begin;
alter table public.items add column motorcycle_brand text;
alter table public.items add constraint valid_motorcycle_brand check (motorcycle_brand is null or motorcycle_brand in ('aprilia','bajaj','benelli','benda','beta','bmw-motorrad','bristol','bsa','cfmoto','ducati','ecooter','euro','fkm','harley-davidson','hatasu','hero','honda','husqvarna','indian-motorcycle','italjet','kawasaki','keeway','kidlat','kove','ktm','kymco','lambretta','monarch','morbidelli','moto-guzzi','moto-morini','motoposh','motorstar','mv-agusta','nwow','peugeot-motocycles','qjmotor','royal-enfield','rusi','segway','skygo','sunra','suzuki','sym','triumph','tvs','um','ural','vespa','vinfast','voge','yamaha','zeeho','zontes','other'));

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
 where id=p_id and user_id=u;
 return p_id;
end $$;

create function public.save_motorcycle_item_with_date(p_id uuid,p_revision integer,p_label text,p_notes text,p_date jsonb default null,p_preset text default null,p_motorcycle_brand text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); i public.items; effective_preset text; eligible boolean;
begin
 perform 1 from public.profiles where id=u for update;
 select * into i from public.items where id=p_id and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 effective_preset:=case when p_preset is null then i.reminder_preset else nullif(p_preset,'') end;
 eligible:=i.template_key='motorcycle' or (i.template_key='other' and coalesce(effective_preset,'')='motorcycle-loan');
 if nullif(p_motorcycle_brand,'') is not null and not eligible then raise exception 'INVALID_INPUT'; end if;
 -- Reuse the original atomic save/date transaction, clearing any prior car brand.
 perform public.save_item_with_date(p_id,p_revision,p_label,p_notes,p_date,p_preset,'');
 update public.items set motorcycle_brand=case
  when not eligible then null
  when p_motorcycle_brand is null then i.motorcycle_brand
  else nullif(p_motorcycle_brand,'') end
 where id=p_id and user_id=u;
 return p_id;
end $$;
revoke all on function public.save_motorcycle_item_with_date(uuid,integer,text,text,jsonb,text,text) from public,anon;
grant execute on function public.save_motorcycle_item_with_date(uuid,integer,text,text,jsonb,text,text) to authenticated;
commit;
