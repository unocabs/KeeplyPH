import { requireUser } from '@/lib/auth';
import { getUsage } from '@/features/purchases/queries';
import { AppShell } from '@/components/app-shell';
export const metadata = { robots: { index: false, follow: false } };
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ profile }, usage] = await Promise.all([requireUser(), getUsage()]);
  return <AppShell name={profile.display_name} hasExtraSlots={(usage.slot_limit??3)>3}>{children}</AppShell>;
}
