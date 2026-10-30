'use server';

import { cookies } from 'next/headers';
import { DEMO_PLAN_COOKIE } from '@/lib/demo-plan';

export async function changeDemoPlan(plan: string): Promise<{ error?: string }> {
  if (plan !== 'free' && plan !== 'premium') return { error: 'Choose Free or Premium to compare the sample plans.' };
  try {
    (await cookies()).set(DEMO_PLAN_COOKIE, plan, {
      path: '/demo',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return {};
  } catch {
    return { error: 'The sample plan could not be changed. Try again.' };
  }
}
