-- Explicit item identities; existing null selections stay automatic. No name-based backfill.
-- Check check-product-type-prerequisites.sql before applying to hosted Supabase.
begin;
create function private.purchase_type_allowed(p_type text,p_category text) returns boolean
language sql immutable set search_path='' as $$
 select case when p_type is null or p_type='category' then true
 when p_category='electronics' then p_type in ('earbuds','headphones','phone','tablet','laptop','desktop','monitor','camera','speaker','game-console','smartwatch','tv')
 when p_category='appliances' then p_type in ('tv','washing-machine','refrigerator','air-conditioner','electric-fan','microwave','oven','rice-cooker','vacuum','water-dispenser')
 when p_category='clothing' then p_type in ('shirt','polo','jacket','dress','trousers','shorts','shoes','bag','hat','watch')
 else false end
$$;
revoke all on function private.purchase_type_allowed(text,text) from public,anon,authenticated,service_role;
alter table public.items add column product_type text;
alter table public.items add constraint valid_product_type check (product_type is null or (template_key='receipt' and private.purchase_type_allowed(product_type,category)));
-- Append the field to the existing owner-scoped compatibility view; keep existing column order.
create or replace view public.purchases with (security_barrier=true) as
 select id,user_id,state,product_name,purchased_on,merchant,price_minor,currency,category,notes,revision,created_at,updated_at,product_type
 from public.items where template_key='receipt' and user_id=auth.uid() and private.active_account();
create or replace function public.save_purchase(p_id uuid,p_revision integer,p_data jsonb,p_warranty jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); d public.important_dates; i public.items; next_category text; next_type text;
begin
 perform 1 from public.profiles where id=u for update;
 select * into i from public.items where id=p_id and user_id=u and template_key='receipt' for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 next_category:=nullif(p_data->>'category','');
 next_type:=case when p_data ? 'product_type' then nullif(p_data->>'product_type','')
  when private.purchase_type_allowed(i.product_type,next_category) then i.product_type else null end;
 if next_type is not null and not private.purchase_type_allowed(next_type,next_category) then raise exception 'INVALID_INPUT'; end if;
 perform public.save_item(p_id,p_revision,p_data->>'product_name',p_data->>'notes');
 update public.items set purchased_on=nullif(p_data->>'purchased_on','')::date,merchant=nullif(p_data->>'merchant',''),price_minor=nullif(p_data->>'price_minor','')::bigint,category=next_category,product_type=next_type where id=p_id;
 select * into d from public.important_dates where item_id=p_id and kind='warranty';
 if p_warranty is null then
   delete from public.important_dates where id=d.id;
 else
   perform public.save_important_date(coalesce(d.id,gen_random_uuid()),p_id,coalesce(d.revision,0),p_warranty||jsonb_build_object('kind','warranty','label','Warranty','due_on',p_warranty->>'expires_on','offsets',coalesce(p_warranty->'offsets',(select jsonb_agg(jsonb_build_object('unit',unit,'value',value)) from public.reminder_offsets where date_id=d.id),'[{"unit":"days","value":30},{"unit":"days","value":7},{"unit":"days","value":1},{"unit":"days","value":0}]'::jsonb)));
 end if; return p_id;
end $$;
comment on function public.save_purchase(uuid,integer,jsonb,jsonb) is 'keeply:purchase-product-types-v1';
commit;
