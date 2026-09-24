import { notFound,redirect } from 'next/navigation';
import { getItem } from '@/features/items/queries';
import { ItemForm } from '@/components/item-form';
import { uuidSchema } from '@/lib/validation';
export const metadata={title:'Edit item'};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!uuidSchema.safeParse(id).success)notFound();const item=await getItem(id);if(!item)notFound();if(item.template_key==='receipt')redirect('/purchases/'+id+'/edit');return <ItemForm key={item.revision} item={item} template={item.template_key}/>;}
