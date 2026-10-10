import {checkOrigin} from '@/lib/security';
import {isConfigured} from '@/lib/env';
import {serverClient} from '@/lib/supabase/server';
import {premiumEventSchema} from '@/features/premium/measurement';
export async function POST(request:Request) {
 if(!checkOrigin(request))return new Response(null,{status:403});
 if(!isConfigured()||process.env.ANALYTICS_ENABLED!=='true')return new Response(null,{status:204});
 const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});
 try {
  const decoder=new TextDecoder();let content='',size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024){await reader.cancel();return new Response(null,{status:413});}content+=decoder.decode(value,{stream:true});}
  let input:unknown;try{input=JSON.parse(content+decoder.decode());}catch{return new Response(null,{status:400});}
  const parsed=premiumEventSchema.safeParse(input);
  if(!parsed.success)return new Response(null,{status:400});
  const supabase=await serverClient(),{data,error}=await supabase.auth.getClaims();
  if(error||!data?.claims.sub)return new Response(null,{status:401});
  const event=parsed.data;
  await supabase.rpc('record_premium_event',{p_id:event.id,p_event:event.event,p_surface:event.surface,p_horizon:event.horizon??null,p_insight:event.insight??null,p_experiment:process.env.PREMIUM_DISCOVERY_EXPERIMENT_ENABLED==='true'});
 }catch{/* Optional measurement never interrupts navigation or an account action. */}
 return new Response(null,{status:204});
}
