-- Cross-category activity views retain item ownership, schedules and cursor pagination.
-- Requires the existing reminder-category migration and all earlier migrations.
begin;
create function private.reminder_date_matches(template text,preset text,kind text,category text)
returns boolean language sql immutable set search_path='' as $$
 select case category
 when 'maintenance' then kind='service' or private.reminder_category(template,preset)='maintenance'
 when 'insurance' then kind='insurance' or private.reminder_category(template,preset)='insurance'
 else private.reminder_category(template,preset)=category end
$$;
revoke all on function private.reminder_date_matches(text,text,text,text) from public,anon,authenticated,service_role;

create or replace function public.list_items(p_filter text default 'all',p_query text default '',p_template text default 'all',p_cursor timestamptz default null,p_cursor_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); t date; result jsonb;
begin
 perform private.trim_reminders(u);
 select (now() at time zone timezone)::date into t from public.profiles where id=u;
 select coalesce(jsonb_agg(private.item_json(i) order by i.created_at desc,i.id desc),'[]'::jsonb) into result from (
 select i.* from public.items i where i.user_id=u
 and (p_template='all' or i.template_key=p_template or 'category:'||private.reminder_category(i.template_key,i.reminder_preset)=p_template
   or (p_template in ('category:maintenance','category:insurance') and exists(
     select 1 from public.important_dates d where d.item_id=i.id
     and private.reminder_date_matches(i.template_key,i.reminder_preset,d.kind,substring(p_template from 10)))))
 and (p_query='' or replace(i.reminder_preset,'-',' ') ilike '%'||left(p_query,160)||'%' or private.reminder_category(i.template_key,i.reminder_preset) ilike '%'||left(p_query,160)||'%' or i.product_name ilike '%'||left(p_query,160)||'%' or i.template_key ilike '%'||left(p_query,160)||'%' or exists(select 1 from private.current_dates d where d.item_id=i.id and (p_template not in ('category:maintenance','category:insurance') or private.reminder_date_matches(i.template_key,i.reminder_preset,d.kind,substring(p_template from 10))) and (d.label ilike '%'||left(p_query,160)||'%' or d.expires_on::text=left(p_query,160))))
 and (p_cursor is null or (i.created_at,i.id)<(p_cursor,p_cursor_id))
 and case p_filter when 'archived' then i.archived_at is not null when 'drafts' then i.state='draft'
 else i.state='saved' and i.archived_at is null and
 case p_filter when 'reminders' then private.covered(i.id) when 'uncovered' then not private.covered(i.id)
 when 'upcoming' then exists(select 1 from private.current_dates d where d.item_id=i.id and (p_template not in ('category:maintenance','category:insurance') or private.reminder_date_matches(i.template_key,i.reminder_preset,d.kind,substring(p_template from 10))) and d.expires_on between t and t+30)
 when 'overdue' then exists(select 1 from private.current_dates d where d.item_id=i.id and (p_template not in ('category:maintenance','category:insurance') or private.reminder_date_matches(i.template_key,i.reminder_preset,d.kind,substring(p_template from 10))) and d.expires_on<t)
 when 'dates' then exists(select 1 from private.current_dates d where d.item_id=i.id and (p_template not in ('category:maintenance','category:insurance') or private.reminder_date_matches(i.template_key,i.reminder_preset,d.kind,substring(p_template from 10)))) else true end end
 order by i.created_at desc,i.id desc limit 25) i;
 return result;
end $$;
commit;
