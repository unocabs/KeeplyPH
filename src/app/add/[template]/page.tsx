import { categories, type Category } from '@/lib/domain';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/env';
import { isTemplate,templates,addIntent,getReminderPreset } from '@/features/templates';
import { getVehicleChoices } from '@/features/items/queries';
import { vehicleIntentLabel } from '@/features/templates/categories';
import { ItemForm } from '@/components/item-form';
import { PurchaseForm } from '@/components/purchase-form';
import { Brand } from '@/components/brand';
export const metadata={title:'Keep something important',robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:{params:Promise<{template:string}>;searchParams:Promise<{focus?:string;category?:string;preset?:string;renewalDate?:string}>}){
 const {template}=await params,query=await searchParams;if(!isTemplate(template))notFound();let authenticated=false;
 if(isConfigured()){const client=await serverClient();const {data}=await client.auth.getClaims();authenticated=Boolean(data?.claims.sub);}
 const intent=addIntent(template,query.focus,query.category,query.preset,query.renewalDate);
 const vehicles = authenticated && (template === 'car' || template === 'motorcycle') ? await getVehicleChoices(template) : [];
 const choice=getReminderPreset(template,query.preset) || templates[template];
 return <main className="landing" id="main-content"><Brand/>{authenticated?<div className="spaced">{template==='receipt'?<PurchaseForm warrantyFocus={query.focus==='warranty'} initialCategory={categories.includes(query.category as Category) ? query.category as Category : undefined}/>:<ItemForm template={template} vehicles={vehicles} focus={query.focus} preset={query.preset} renewalDate={query.renewalDate}/>}</div>:<section className="auth-card spaced"><h1>{template === 'car' || template === 'motorcycle' ? vehicleIntentLabel(template,query.focus) : choice.label}</h1><p>{choice.description}</p><p>Example: {choice.example}. {['car','motorcycle','receipt'].includes(template)?'Start with a name; add dates and documents when you’re ready.':'Add a name and the date you want to remember.'}</p><Link className="button primary" href={'/login?next='+encodeURIComponent(intent)}>Continue with Google →</Link><Link className="auth-preview-link" href={'/demo'+intent}>Try a sample first</Link><p className="hint spaced">Save unlimited reminders. Get alerts for 3 items free. Multiple dates on one item count as one slot. Includes 100 MB of private documents.</p></section>}</main>;
}
