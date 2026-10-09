import { getItems, getUnconfirmedSummary, type ItemQuery } from '@/features/items/queries';
import { requireUser } from '@/lib/auth';
import { todayIn } from '@/lib/domain';
import { ItemList } from '@/components/item-list';
import { OverdueReminderList } from '@/components/occurrence-review-list';
import { dateRows } from '@/features/items/domain';
import { requiredDate } from '@/features/items/validation';
import { uuidSchema } from '@/lib/validation';
export const metadata={title:'Reminders'};
export default async function Page({searchParams}:{searchParams:Promise<ItemQuery & { before?: string; id?: string }>}) {
 const query=await searchParams;
 if(query.filter === 'overdue') {
  const valid=requiredDate.safeParse(query.before).success && uuidSchema.safeParse(query.id).success;
  const [{profile},items,summary]=await Promise.all([requireUser(),getItems({filter:'overdue',cursor:query.cursor,cursorId:query.cursorId}),getUnconfirmedSummary(valid?query.before:undefined,valid?query.id:undefined)]);
  const today=todayIn(profile.timezone),last=items.at(-1),past=summary.rows.at(-1);
  const next=new URLSearchParams({filter:'overdue'});
  if(valid){next.set('before',query.before!);next.set('id',query.id!);}
  if(last){next.set('cursor',last.created_at);next.set('cursorId',last.id);}
  const pastNext=new URLSearchParams({filter:'overdue',before:past?.due_on||'',id:past?.occurrence_id||''});
  if(query.cursor&&query.cursorId){pastNext.set('cursor',query.cursor);pastNext.set('cursorId',query.cursorId);}
  return <OverdueReminderList rows={dateRows(items).filter(row=>row.occurrence.due_on<today)} summary={summary} paged={valid||Boolean(query.cursor)} currentNext={items.length===25?'/items?'+next:undefined} pastNext={summary.has_more&&past?'/items?'+pastNext:undefined}/>;
 }
const [{profile},items]=await Promise.all([requireUser(),getItems(query)]);
 return <ItemList key={JSON.stringify(query)} items={items} today={todayIn(profile.timezone)} initialFilter={query.filter} serverQuery={query}/>;
}
