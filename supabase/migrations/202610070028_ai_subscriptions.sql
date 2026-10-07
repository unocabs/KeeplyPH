-- AI subscription preset and service logos. No name-based backfill.
-- Run check-ai-subscription-prerequisites.sql before applying to hosted Supabase.
begin;
alter table public.items drop constraint valid_reminder_preset;
alter table public.items add constraint valid_reminder_preset check (
  reminder_preset is null or (template_key='other' and reminder_preset in ('life-insurance','health-insurance','vehicle-insurance','home-insurance','travel-insurance','other-insurance','internet-bill','mobile-bill','rent','association-dues','other-bill','streaming','ai-subscription','software','gym','professional-membership','other-subscription','appliance-service','home-maintenance','pest-control','other-service','medical-appointment','dental-appointment','checkup','vaccination','other-appointment','tuition','enrollment','school-fees','other-school-deadline','personal-loan','home-loan','car-loan','motorcycle-loan','salary-government-loan','credit-card-installment','business-loan','digital-online-loan','other-loan','umid','national-id','prc-license','postal-id','pwd-solo-parent-id','other-id','police-clearance','nbi-clearance','water-bill','electric-bill','car-payment'))
);
alter table public.items drop constraint valid_subscription_brand;
alter table public.items add constraint valid_subscription_brand check (subscription_brand is null or subscription_brand in ('netflix','disney-plus','hbo-max','prime-video','apple-tv','viu','iqiyi','wetv','crunchyroll','iwant','viva-one','vmx','spotify','apple-music','youtube-music','youtube-premium','cignal-play','bein-sports','anytime-fitness','fitness-first','golds-gym','surge','snap-fitness','slimmers-world','ufc-gym','kinetix-lab','chatgpt','claude','gemini','perplexity','grok','poe','github-copilot','cursor','devin','midjourney','leonardo-ai','runway','elevenlabs','suno','other'));
create or replace function private.reminder_category(template text,preset text) returns text
language sql immutable set search_path='' as $$
 select case
 when preset in ('life-insurance','health-insurance','vehicle-insurance','home-insurance','travel-insurance','other-insurance') then 'insurance'
 when preset in ('electric-bill','water-bill','internet-bill','mobile-bill','rent','association-dues','other-bill') then 'bills'
 when preset in ('personal-loan','home-loan','car-loan','motorcycle-loan','salary-government-loan','credit-card-installment','business-loan','digital-online-loan','other-loan','car-payment') then 'loans'
 when preset in ('streaming','ai-subscription','software','gym','professional-membership','other-subscription') then 'subscriptions'
 when preset in ('prc-license','postal-id','pwd-solo-parent-id','umid','national-id','other-id','nbi-clearance','police-clearance') then 'documents'
 when preset in ('appliance-service','home-maintenance','pest-control','other-service') then 'maintenance'
 when preset in ('medical-appointment','dental-appointment','checkup','vaccination','other-appointment') then 'health'
 when preset in ('tuition','enrollment','school-fees','other-school-deadline') then 'education'
 else case template when 'receipt' then 'purchases' when 'car' then 'vehicles'
 when 'motorcycle' then 'vehicles' when 'licence' then 'documents' when 'passport' then 'documents'
 when 'aircon' then 'maintenance' else 'custom' end end
$$;
create or replace function private.reminder_idea_category(template text,preset text) returns text language sql immutable set search_path='' as $$
 select case
 when preset in ('personal-loan','home-loan','car-loan','motorcycle-loan','salary-government-loan','credit-card-installment','business-loan','digital-online-loan','other-loan','car-payment') then 'loans'
 when preset in ('electric-bill','water-bill','internet-bill','mobile-bill','rent','association-dues','other-bill') then 'bills'
 when preset in ('life-insurance','health-insurance','vehicle-insurance','home-insurance','travel-insurance','other-insurance') then 'insurance'
 when preset in ('streaming','ai-subscription','software','gym','professional-membership','other-subscription') then 'subscriptions'
 when preset in ('prc-license','postal-id','pwd-solo-parent-id','umid','national-id','other-id','nbi-clearance','police-clearance') then 'documents'
 when preset in ('appliance-service','home-maintenance','pest-control','other-service') then 'maintenance'
 when preset in ('medical-appointment','dental-appointment','checkup','vaccination','other-appointment') then 'health'
 when preset in ('tuition','enrollment','school-fees','other-school-deadline') then 'education'
 when template in ('car','motorcycle') then 'vehicles'
 when template in ('licence','passport') then 'documents'
 when template='receipt' then 'purchases'
 when template='aircon' then 'maintenance' else 'custom' end
$$;
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
, subscription_brand=case when i.template_key='other' and effective_preset in ('streaming','gym','ai-subscription') and effective_preset=i.reminder_preset then i.subscription_brand else null end
 where id=p_id and user_id=u;
 return p_id;
end $$;


create or replace function public.save_subscription_item_with_date(p_id uuid,p_revision integer,p_label text,p_notes text,p_date jsonb default null,p_preset text default null,p_subscription_brand text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); i public.items; effective_preset text; eligible boolean;
begin
 perform 1 from public.profiles where id=u for update;
 select * into i from public.items where id=p_id and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 effective_preset:=case when p_preset is null then i.reminder_preset else nullif(p_preset,'') end;
 eligible:=i.template_key='other' and coalesce(effective_preset,'') in ('streaming','gym','ai-subscription');
 if nullif(p_subscription_brand,'') is not null and (
  not eligible or not (p_subscription_brand='other'
   or (effective_preset='streaming' and p_subscription_brand in ('netflix','disney-plus','hbo-max','prime-video','apple-tv','viu','iqiyi','wetv','crunchyroll','iwant','viva-one','vmx','spotify','apple-music','youtube-music','youtube-premium','cignal-play','bein-sports'))
   or (effective_preset='gym' and p_subscription_brand in ('anytime-fitness','fitness-first','golds-gym','surge','snap-fitness','slimmers-world','ufc-gym','kinetix-lab'))
   or (effective_preset='ai-subscription' and p_subscription_brand in ('chatgpt','claude','gemini','perplexity','grok','poe','github-copilot','cursor','devin','midjourney','leonardo-ai','runway','elevenlabs','suno')))
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
comment on function public.save_subscription_item_with_date(uuid,integer,text,text,jsonb,text,text) is 'keeply:ai-subscriptions-v1';
commit;
