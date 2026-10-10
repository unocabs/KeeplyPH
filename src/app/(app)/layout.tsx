import { requireUser } from '@/lib/auth';
import { getUsage } from '@/features/purchases/queries';
import { PremiumGift } from '@/components/premium-gift';
import { AppShell } from '@/components/app-shell';
export const metadata = { robots: { index: false, follow: false } };
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ profile, avatarUrl }, usage] = await Promise.all([requireUser(), getUsage()]);
  return <AppShell name={profile.display_name} avatarUrl={avatarUrl} alertCoverage={{ covered: usage.reminders, total: usage.purchases }} hasExtraSlots={usage.household_premium ?? false}><PremiumGift accountId={profile.id} timezone={profile.timezone}/>{children}</AppShell>;
}
