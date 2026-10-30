export type DemoPlan = 'free' | 'premium';

// This preference belongs only to the fictional sample, never account access.
export const DEMO_PLAN_COOKIE = 'keeply-demo-plan';

export function demoPlan(value: unknown): DemoPlan {
  return value === 'free' ? 'free' : 'premium';
}
