import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireEnv } from '@/lib/env';
import type { Database } from '@/types/database';
export async function serverClient() {
  const jar = await cookies();
  return createServerClient<Database>(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), {
    cookies: { getAll: () => jar.getAll(), setAll(values) {
      try { for (const { name, value, options } of values) jar.set(name, value, options); }
      catch { /* Server Components cannot write cookies; proxy performs refresh. */ }
    } },
  });
}
