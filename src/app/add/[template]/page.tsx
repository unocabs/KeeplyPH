import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/env';
import { isTemplate,templates,addIntent } from '@/features/templates';
import { ItemForm } from '@/components/item-form';
import { PurchaseForm } from '@/components/purchase-form';
import { Brand } from '@/components/brand';
export const metadata={title:'Keep something important',robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:{params:Promise<{template:string}>;searchParams:Promise<{focus?:string;category?:string}>}){
 const {template}=await params,query=await searchParams;if(!isTemplate(template))notFound();let authenticated=false;
 if(isConfigured()){const client=await serverClient();const {data}=await client.auth.getClaims();authenticated=Boolean(data?.claims.sub);}
 const intent=addIntent(template,query.focus,query.category);
 return <main className="landing" id="main-content"><Brand/>{authenticated?<div className="spaced">{template==='receipt'?<PurchaseForm warrantyFocus={query.focus==='warranty'} initialCategory={query.category==='appliances'?'appliances':undefined}/>:<ItemForm template={template} focus={query.focus}/>}</div>:<section className="auth-card spaced"><h1>{templates[template].label}</h1><p>{templates[template].description}</p><p>Example: {templates[template].example}. {['car','motorcycle','receipt'].includes(template)?'Start with a name; add dates and documents when you’re ready.':'Add a name and the date you want to remember.'}</p><Link className="button primary" href={'/login?next='+encodeURIComponent(intent)}>Continue with Google →</Link><Link className="auth-preview-link" href={'/demo/add/'+template}>Try a sample first</Link><p className="hint spaced">Keep as many things as you need. Your first 3 alert slots are free, with 100 MB of documents.</p></section>}</main>;
}
