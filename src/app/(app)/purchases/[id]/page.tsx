import { notFound } from 'next/navigation';
import { PurchaseDetail } from '@/components/purchase-detail';
import { getPurchase } from '@/features/purchases/queries';
import { requireUser } from '@/lib/auth';
import { todayIn } from '@/lib/domain';
import { uuidSchema } from '@/lib/validation';
export const metadata = { title: 'Purchase details' };
export default async function PurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!uuidSchema.safeParse(id).success) notFound();
  const [purchase, { profile }] = await Promise.all([getPurchase(id), requireUser()]);
  if (!purchase) notFound();
  return <PurchaseDetail purchase={purchase} today={todayIn(profile.timezone)} />;
}
