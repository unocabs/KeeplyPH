import { notFound } from 'next/navigation';
import { getItem } from '@/features/items/queries';
import { ItemDetail } from '@/components/item-detail';
import { ItemForm } from '@/components/item-form';
import { PurchaseForm } from '@/components/purchase-form';
import { requireUser } from '@/lib/auth';
import { todayIn } from '@/lib/domain';
import { uuidSchema } from '@/lib/validation';
export const metadata={title:'Your reminder'};
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string}>}){const {id}=await params;if(!uuidSchema.safeParse(id).success)notFound();const [{profile},item]=await Promise.all([requireUser(),getItem(id)]);if(!item)notFound();if(item.state==='draft')return item.template_key==='receipt'?<PurchaseForm purchase={{...item,warranty:null}}/>:<ItemForm template={item.template_key} item={item}/>;return <>{(await searchParams).saved==='uncovered'&&<p className="alert info space-bottom" role="status">Saved. This reminder won’t send alerts yet. Your alert slots are in use; move a slot or add five below.</p>}<ItemDetail item={item} today={todayIn(profile.timezone)}/></>;}
