-- Read-only: run in the hosted Supabase SQL Editor before migration 030.
select 'Core schema (202609200001_core.sql)' as prerequisite,
 case when to_regnamespace('private') is not null
 and to_regclass('private.rate_limit_buckets') is not null
 and to_regprocedure('private.rate_limit(uuid,text,integer,integer)') is not null
 then 'PRESENT' else 'MISSING: apply core migration first on a new database; investigate on an existing project' end as status
union all
select 'Public reactions (202610070030_public_reactions.sql)',
 case when to_regclass('private.public_reaction_counts') is not null
 and to_regclass('private.public_reaction_receipts') is not null
 and to_regprocedure('public.public_reactions_ready()') is not null
 and to_regprocedure('public.record_public_reaction(uuid,text)') is not null
 and to_regprocedure('public.purge_public_reaction_receipts()') is not null
 then 'PRESENT: do not rerun migration 030' else 'MISSING: apply migration 030 after confirming core prerequisites' end;
