import { requireUser } from '@/lib/auth';
import { getUsage } from '@/features/purchases/queries';
import { PremiumGift } from '@/components/premium-gift';
import {Suspense} from 'react';
import {PremiumMeasurement} from '@/components/premium-measurement';
import {getPremiumMeasurementContext} from '@/features/premium/queries';
import { AppShell } from '@/components/app-shell';
export const metadata = { robots: { index: false, follow: false } };
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ profile, avatarUrl }, usage, measurement] = await Promise.all([requireUser(), getUsage(),getPremiumMeasurementContext()]);
  return <AppShell name={profile.display_name} avatarUrl={avatarUrl} alertCoverage={{ covered: usage.reminders, total: usage.purchases }} hasExtraSlots={usage.household_premium ?? false}><Suspense fallback={null}><PremiumMeasurement enabled={measurement.enabled} accountId={profile.id} premium={Boolean(usage.household_premium)}/></Suspense><PremiumGift accountId={profile.id} timezone={profile.timezone}/>{children}</AppShell>;
}
