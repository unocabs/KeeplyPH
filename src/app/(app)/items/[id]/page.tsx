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
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string}>}){
  const {id}=await params;
  if(!uuidSchema.safeParse(id).success)notFound();
  const [{profile},item,query]=await Promise.all([requireUser(),getItem(id),searchParams]);
  if(!item)notFound();
  if(item.state==='draft')return item.template_key==='receipt'?<PurchaseForm purchase={{...item,warranty:null}}/>:<ItemForm template={item.template_key} item={item}/>;
  const saved = ['created','updated','uncovered'].includes(query.saved || '');
  const usage = saved ? await getUsage() : null;
  return <>{usage && <ReminderSaved id={id} usage={usage} coverage={item.coverage} deliveryPaused={item.alert_delivery_paused} created={query.saved !== 'updated'}/>}<ItemDetail item={item} today={todayIn(profile.timezone)}/></>;
}
