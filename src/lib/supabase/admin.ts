import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { requireEnv } from '@/lib/env';
import type { Database } from '@/types/database';
export function adminClient() {
  return createClient<Database>(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), process.env.SUPABASE_SECRET_KEY || requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
