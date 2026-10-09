import { notFound } from 'next/navigation';
import { PurchaseForm } from '@/components/purchase-form';
import { getPurchase } from '@/features/purchases/queries';
import { uuidSchema } from '@/lib/validation';
export const metadata = { title: 'Edit purchase' };
export default async function EditPurchasePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ focus?: string }> }) {
  const { id } = await params; if (!uuidSchema.safeParse(id).success) notFound();
  const purchase = await getPurchase(id); if (!purchase) notFound();
  return <PurchaseForm purchase={purchase} warrantyFocus={(await searchParams).focus === 'warranty'} />;
}
