-- Read anonymous all-time aggregates through the server API only.
begin;
create function public.public_reaction_totals() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'helpful', coalesce(sum(count) filter (where reaction='helpful'),0),
  'easy', coalesce(sum(count) filter (where reaction='easy'),0),
  'love', coalesce(sum(count) filter (where reaction='love'),0)
 ) from private.public_reaction_counts
$$;
revoke execute on function public.public_reaction_totals() from public,anon,authenticated;
grant execute on function public.public_reaction_totals() to service_role;
notify pgrst, 'reload schema';
commit;
