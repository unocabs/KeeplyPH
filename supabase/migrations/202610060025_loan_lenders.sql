-- Optional lender identity. Apply after the read-only prerequisite check and all migrations through 202610060024.
-- Existing reminders retain their current icons until a lender is explicitly selected.
begin;
alter table public.items add column lender_id text;
alter table public.items add column lender_name text;
alter table public.items add constraint valid_lender_id check (lender_id is null or lender_id in ('bdo','bpi','unionbank','metrobank','security-bank','rcbc','eastwest','psbank','pnb','chinabank','landbank','dbp','home-credit','cimb','pag-ibig','toyota-financial','sumisho','aeon-credit','motortrade','sb-corporation','sss','gsis','hsbc','billease','atome','gloan','ggives','maya','spaylater','sloan','other'));
alter table public.items add constraint valid_lender_name check (lender_name is null or (lender_id is not null and lender_id='other' and char_length(lender_name) between 1 and 160 and lender_name=btrim(lender_name)));

create function private.lender_allowed(p_preset text,p_lender text) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(p_preset in ('personal-loan','home-loan','car-loan','car-payment','motorcycle-loan','salary-government-loan','credit-card-installment','business-loan','digital-online-loan','other-loan') and
 (p_lender='other' or exists(select 1 from (values
 ('bdo',array['personal-loan','home-loan','car-loan','motorcycle-loan','business-loan','credit-card-installment']::text[]),
 ('bpi',array['personal-loan','home-loan','car-loan','motorcycle-loan','business-loan','credit-card-installment']::text[]),
 ('unionbank',array['personal-loan','home-loan','car-loan','motorcycle-loan','business-loan','credit-card-installment']::text[]),
 ('metrobank',array['personal-loan','home-loan','car-loan','motorcycle-loan','business-loan','credit-card-installment']::text[]),
 ('security-bank',array['personal-loan','home-loan','car-loan','motorcycle-loan','business-loan','credit-card-installment']::text[]),
 ('rcbc',array['personal-loan','home-loan','car-loan','motorcycle-loan','business-loan','credit-card-installment']::text[]),
 ('eastwest',array['personal-loan','home-loan','car-loan','motorcycle-loan','business-loan','credit-card-installment']::text[]),
 ('psbank',array['personal-loan','home-loan','car-loan','motorcycle-loan','business-loan','credit-card-installment']::text[]),
 ('pnb',array['personal-loan','home-loan','car-loan','motorcycle-loan','business-loan','credit-card-installment']::text[]),
 ('chinabank',array['personal-loan','home-loan','car-loan','motorcycle-loan','business-loan','credit-card-installment']::text[]),
 ('landbank',array['personal-loan','home-loan','car-loan','motorcycle-loan','business-loan','credit-card-installment']::text[]),
 ('dbp',array['personal-loan','home-loan','car-loan','motorcycle-loan','business-loan','credit-card-installment']::text[]),
 ('home-credit',array['personal-loan','credit-card-installment','digital-online-loan']::text[]),
 ('cimb',array['personal-loan','digital-online-loan']::text[]),
 ('pag-ibig',array['home-loan','salary-government-loan']::text[]),
 ('toyota-financial',array['car-loan']::text[]),
 ('sumisho',array['motorcycle-loan']::text[]),
 ('aeon-credit',array['motorcycle-loan']::text[]),
 ('motortrade',array['motorcycle-loan']::text[]),
 ('sb-corporation',array['business-loan']::text[]),
 ('sss',array['salary-government-loan']::text[]),
 ('gsis',array['salary-government-loan']::text[]),
 ('hsbc',array['credit-card-installment']::text[]),
 ('billease',array['credit-card-installment','digital-online-loan']::text[]),
 ('atome',array['credit-card-installment','digital-online-loan']::text[]),
 ('gloan',array['digital-online-loan']::text[]),
 ('ggives',array['credit-card-installment','digital-online-loan']::text[]),
 ('maya',array['digital-online-loan']::text[]),
 ('spaylater',array['credit-card-installment','digital-online-loan']::text[]),
 ('sloan',array['digital-online-loan']::text[])
 ) as provider(id,categories) where id=p_lender and (p_preset='other-loan' or (case when p_preset='car-payment' then 'car-loan' else p_preset end)=any(categories)))),false);
$$;
revoke all on function private.lender_allowed(text,text) from public,anon,authenticated;

-- Older save RPCs preserve compatible identities and clear incompatible ones on type changes.
create function private.keep_lender_compatible() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.template_key<>'other' or not private.lender_allowed(new.reminder_preset,new.lender_id) then
  new.lender_id:=null; new.lender_name:=null;
 end if;
 return new;
end $$;
revoke all on function private.keep_lender_compatible() from public,anon,authenticated;
create trigger keep_lender_compatible before update of reminder_preset,template_key on public.items
for each row execute function private.keep_lender_compatible();

create function public.save_loan_item_with_date(
 p_id uuid,p_revision integer,p_label text,p_notes text,p_date jsonb default null,p_preset text default null,
 p_lender_id text default null,p_lender_name text default null,p_car_brand text default null,p_motorcycle_brand text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); i public.items; effective_preset text; selected_lender text; selected_name text;
begin
 perform 1 from public.profiles where id=u for update;
 select * into i from public.items where id=p_id and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 effective_preset:=case when p_preset is null then i.reminder_preset else nullif(p_preset,'') end;
 if i.template_key<>'other' or not private.lender_allowed(effective_preset,'other') then raise exception 'INVALID_INPUT'; end if;
 selected_lender:=case when p_lender_id is null and private.lender_allowed(effective_preset,i.lender_id) then i.lender_id else nullif(p_lender_id,'') end;
 if selected_lender is not null and not private.lender_allowed(effective_preset,selected_lender) then raise exception 'INVALID_INPUT'; end if;
 if nullif(btrim(p_lender_name),'') is not null and (selected_lender is distinct from 'other' or char_length(btrim(p_lender_name))>160) then raise exception 'INVALID_INPUT'; end if;
 selected_name:=case when selected_lender='other' then
  case when p_lender_name is null and i.lender_id='other' then i.lender_name else nullif(btrim(p_lender_name),'') end else null end;
 if nullif(p_car_brand,'') is not null and nullif(p_motorcycle_brand,'') is not null then raise exception 'INVALID_INPUT'; end if;
 if effective_preset='motorcycle-loan' then
  if nullif(p_car_brand,'') is not null then raise exception 'INVALID_INPUT'; end if;
  perform public.save_motorcycle_item_with_date(p_id,p_revision,p_label,p_notes,p_date,p_preset,p_motorcycle_brand);
 else
  if nullif(p_motorcycle_brand,'') is not null then raise exception 'INVALID_INPUT'; end if;
  perform public.save_item_with_date(p_id,p_revision,p_label,p_notes,p_date,p_preset,p_car_brand);
 end if;
 update public.items set lender_id=selected_lender,lender_name=selected_name where id=p_id and user_id=u;
 return p_id;
end $$;
revoke all on function public.save_loan_item_with_date(uuid,integer,text,text,jsonb,text,text,text,text,text) from public,anon;
grant execute on function public.save_loan_item_with_date(uuid,integer,text,text,jsonb,text,text,text,text,text) to authenticated;
commit;
