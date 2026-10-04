-- Optional car identity; old clients may omit the brand without clearing it.
begin;
alter table public.items add column car_brand text;
alter table public.items add constraint valid_car_brand check (car_brand is null or car_brand in ('abarth','aito','alfa-romeo','aston-martin','audi','baic','bentley','bestune','bmw','byd','changan','chery','chevrolet','deepal','denza','dfsk','dodge','dongfeng','faw','ferrari','fiat','ford','foton','gac','gaz','geely','gwm','haima','honda','hongqi','hyundai','isuzu','jac','jaecoo','jaguar','jeep','jetour','kaicene','kaiyi','kia','lamborghini','land-rover','lexus','li-auto','lotus','lynk-co','mahindra','maserati','mazda','mercedes-benz','mg','mini','mitsubishi','nissan','omoda','porsche','radar','ram','rolls-royce','subaru','suzuki','tata','tesla','toyota','vinfast','volvo','voyah','xpeng','zeekr','other'));

-- Keep the existing save/date/preset transaction and its revision checks private.
alter function public.save_item_with_date(uuid,integer,text,text,jsonb,text) rename to save_item_with_preset_base;
alter function public.save_item_with_preset_base(uuid,integer,text,text,jsonb,text) set schema private;
revoke all on function private.save_item_with_preset_base(uuid,integer,text,text,jsonb,text) from public,anon,authenticated,service_role;

create function public.save_item_with_date(p_id uuid,p_revision integer,p_label text,p_notes text,p_date jsonb default null,p_preset text default null,p_car_brand text default null)
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
 where id=p_id and user_id=u;
 return p_id;
end $$;
revoke all on function public.save_item_with_date(uuid,integer,text,text,jsonb,text,text) from public,anon;
grant execute on function public.save_item_with_date(uuid,integer,text,text,jsonb,text,text) to authenticated;
commit;
