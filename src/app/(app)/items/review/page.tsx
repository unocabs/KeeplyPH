import { OccurrenceReviewList } from '@/components/occurrence-review-list';
import { getUnconfirmedSummary } from '@/features/items/queries';
import { requiredDate } from '@/features/items/validation';
import { uuidSchema } from '@/lib/validation';

export const metadata = { title: 'Past reminders to check' };
export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ before?: string; id?: string }> }) {
  const query = await searchParams;
  const valid = requiredDate.safeParse(query.before).success && uuidSchema.safeParse(query.id).success;
  const summary = await getUnconfirmedSummary(valid ? query.before : undefined, valid ? query.id : undefined);
  return <OccurrenceReviewList summary={summary} paged={valid} />;
}
