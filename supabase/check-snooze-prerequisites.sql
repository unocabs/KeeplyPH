-- Read-only markers for manual SQL Editor deployments (no migration tracking required).
select '202610020014_web_push.sql (already confirmed)' as migration,
 case when to_regprocedure('public.claim_push_jobs(integer)') is not null
 and to_regclass('private.push_jobs') is not null then 'PRESENT' else 'MISSING' end as status
union all
select '202610020015_reminder_ideas.sql',
 case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='suggestion_emails_enabled')
 and to_regprocedure('public.claim_reminder_idea_jobs(integer)') is not null then 'PRESENT' else 'MISSING' end
union all
select '202610020016_occurrence_snooze.sql',
 case when to_regprocedure('public.snooze_date(uuid,uuid,integer,text,date)') is not null
 and exists(select 1 from information_schema.columns where table_schema='public' and table_name='date_occurrences' and column_name='snoozed_on')
 then 'PRESENT' else 'MISSING' end;
