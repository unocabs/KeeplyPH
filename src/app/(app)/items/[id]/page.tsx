import { notFound } from 'next/navigation';
import { getItem } from '@/features/items/queries';
import { ItemDetail } from '@/components/item-detail';
import { ItemForm } from '@/components/item-form';
import { PurchaseForm } from '@/components/purchase-form';
import { requireUser } from '@/lib/auth';
import { todayIn } from '@/lib/domain';
import { uuidSchema } from '@/lib/validation';
import { getUsage } from '@/features/purchases/queries';
import { ReminderSaved } from '@/components/reminder-saved';
export const metadata={title:'Your reminder'};
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string;savedDate?:string;occurrence?:string}>}){
  const {id}=await params;
  if(!uuidSchema.safeParse(id).success)notFound();
  const query=await searchParams;
  const [{profile},item]=await Promise.all([requireUser(),getItem(id,query.occurrence)]);
  if(!item)notFound();
  if(item.state==='draft')return item.template_key==='receipt'?<PurchaseForm purchase={{...item,warranty:null}}/>:<ItemForm template={item.template_key} item={item}/>;
  const saved = ['created','updated','uncovered'].includes(query.saved || '');
  const usage = await getUsage();
  return <>{saved && <ReminderSaved id={id} usage={usage} dateAlertsEnabled={item.dates.find(date => date.id === query.savedDate)?.reminders_enabled} coverage={item.coverage} deliveryPaused={item.alert_delivery_paused} ideasEnabled={profile.suggestion_emails_enabled} created={query.saved !== 'updated'}/>}<ItemDetail item={item} usage={usage} today={todayIn(profile.timezone)}/></>;
}
