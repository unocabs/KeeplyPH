-- PostgREST runs STABLE RPCs in READ ONLY transactions. The shared account
-- guard locks the profile with SELECT FOR UPDATE, so this RPC needs the same
-- VOLATILE classification as the existing planner and spending-checkup RPCs.
-- This changes no records, function body, ownership, grants or access checks.
begin;

alter function public.household_checkup_plan(text,date,text,date,uuid,integer) volatile;

notify pgrst, 'reload schema';
commit;
