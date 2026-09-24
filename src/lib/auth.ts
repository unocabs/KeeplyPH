import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { isConfigured } from '@/lib/env';
import { serverClient } from '@/lib/supabase/server';
export const requireUser = cache(async function requireUser() {
  if (!isConfigured()) redirect('/login?setup=needed');
  const supabase = await serverClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.claims.sub).single();
  if (!profile) redirect('/login?error=account');
  return { supabase, userId: data.claims.sub, profile };
});
