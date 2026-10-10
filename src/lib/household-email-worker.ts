import 'server-only';
import { z } from 'zod';
import { adminClient } from './supabase/admin';
import { appUrl, requireEnv } from './env';
import { householdEmail } from './household-email';
const payloadSchema=z.object({from:z.string(),to:z.string().email(),subject:z.string(),text:z.string(),html:z.string()});
const jobsSchema=z.array(z.object({id:z.string().uuid(),lease_token:z.string().uuid(),email:z.string().email(),payload:payloadSchema.nullable(),rows:z.array(z.object({job_id:z.string().uuid(),item_id:z.string().uuid(),date_id:z.string().uuid(),product_name:z.string(),label:z.string(),due_on:z.string(),amount_minor:z.number().nullable(),certainty:z.string().nullable(),scheduled_on:z.string()}))}));
export async function deliverHouseholdEmails(started:number):Promise<number> {
 const admin=adminClient(),{data,error}=await admin.rpc('claim_household_emails',{p_limit:2});if(error)throw new Error('Household email claim failed');
 let accepted=0;
 for(const job of jobsSchema.parse(data)){
  if(Date.now()-started>40000)break;
  const proposal=job.payload||householdEmail({from:requireEnv('EMAIL_FROM'),to:job.email,url:appUrl(),rows:job.rows});
  const {data:prepared,error:prepareError}=await admin.rpc('prepare_household_email',{p_id:job.id,p_lease:job.lease_token,p_payload:proposal});
  if(prepareError)throw new Error('Household email preparation failed');if(!prepared)continue;
  const payload=payloadSchema.parse(prepared);let status:'accepted'|'retry'|'failed'|'unknown'='unknown',providerId:string|null=null;
  try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(7000),headers:{Authorization:'Bearer '+requireEnv('RESEND_API_KEY'),'Content-Type':'application/json','Idempotency-Key':'keeply-household/'+job.id},body:JSON.stringify(payload)});
   if(response.ok){providerId=z.object({id:z.string().min(1)}).parse(await response.json()).id;status='accepted';accepted++;}
   else if(response.status===429)status='retry';
   else status=response.status>=500?'unknown':'failed';
  }catch{/* An ambiguous outcome must not create another household email. */}
  const {error:finishError}=await admin.rpc('finish_household_email',{p_id:job.id,p_lease:job.lease_token,p_status:status,p_provider_id:providerId});if(finishError)throw new Error('Household email acknowledgement failed');
  await new Promise(resolve=>setTimeout(resolve,600));
 }
 return accepted;
}
