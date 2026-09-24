import { z } from 'zod';
import { checkOrigin } from '@/lib/security';
import { isConfigured } from '@/lib/env';
import { adminClient } from '@/lib/supabase/admin';
const schema=z.object({page:z.enum(['home','warranty-tracker','vehicle-registration-reminder','document-expiry-tracker','add']),event:z.enum(['landing_view','template_cta_clicked']),template:z.enum(['none','receipt','car','motorcycle','licence','passport','aircon','other'])}).strict();
export async function POST(request:Request){
 if(!checkOrigin(request))return new Response(null,{status:403});
 if(!isConfigured() || process.env.ANALYTICS_ENABLED!=='true')return new Response(null,{status:204});
 const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});
 let content='';try{const decoder=new TextDecoder();let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>512){await reader.cancel();return new Response(null,{status:413});}content+=decoder.decode(value,{stream:true});}content+=decoder.decode();
 const parsed=schema.safeParse(JSON.parse(content));if(!parsed.success)return new Response(null,{status:400});
 const {page,event,template}=parsed.data;await adminClient().rpc('record_funnel_count',{p_page:page,p_event:event,p_template:template});
 }catch{/* Metrics never block the user’s task. */}return new Response(null,{status:204});
}
