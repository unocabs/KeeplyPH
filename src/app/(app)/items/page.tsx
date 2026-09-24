import { getItems, type ItemQuery } from '@/features/items/queries';
import { requireUser } from '@/lib/auth';
import { todayIn } from '@/lib/domain';
import { ItemList } from '@/components/item-list';
export const metadata={title:'My items'};
export default async function Page({searchParams}:{searchParams:Promise<ItemQuery>}) {
 const query=await searchParams;const [{profile},items]=await Promise.all([requireUser(),getItems(query)]);
 return <ItemList key={JSON.stringify(query)} items={items} today={todayIn(profile.timezone)} initialFilter={query.filter} serverQuery={query}/>;
}
