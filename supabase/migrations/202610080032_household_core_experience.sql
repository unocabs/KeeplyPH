-- Gradual record creation and bounded, account-wide overdue selection.
-- Apply only after the household activity history migration.
begin;
create or replace function private.save_item_with_date_base(p_id uuid,p_revision integer,p_label text,p_notes text,p_date jsonb default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();i public.items;
begin
 select * into i from public.items where id=p_id and user_id=u;
 if not found then raise exception 'NOT_FOUND'; end if;
 -- A name is enough. If supplied, the date still validates in the same transaction.
 perform public.save_item(p_id,p_revision,p_label,p_notes);
 if p_date is not null then perform public.save_important_date(gen_random_uuid(),p_id,0,p_date); end if;
 if p_date is not null and (p_date->>'reminders_enabled')::boolean and not private.covered(p_id) then perform private.slot_event(u,'item_saved_without_reminder',p_id); end if;
 return p_id;
end $$;
revoke all on function private.save_item_with_date_base(uuid,integer,text,text,jsonb) from public,anon,authenticated,service_role;
comment on function private.save_item_with_date_base(uuid,integer,text,text,jsonb) is 'keeply:gradual-records-v1';

create or replace function public.dashboard_items() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();t date;result jsonb;
begin
 perform private.trim_reminders(u);
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 select coalesce(jsonb_agg(private.item_json(i) order by i.created_at desc,i.id desc),'[]'::jsonb) into result
 from public.items i where i.user_id=u and i.id in (
 (select id from public.items where user_id=u and state='saved' and archived_at is null order by created_at desc,id desc limit 6)
 union (select item_id from private.current_dates where user_id=u and state='saved' and archived_at is null and expires_on>=t order by expires_on,id limit 5)
 union (select item_id from private.current_dates where user_id=u and state='saved' and archived_at is null and expires_on<t order by expires_on,id limit 3));
 return result;
end $$;
revoke all on function public.dashboard_items() from public,anon,authenticated,service_role;
grant execute on function public.dashboard_items() to authenticated;
comment on function public.dashboard_items() is 'keeply:household-core-v1';
commit;
