'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { uuidSchema } from '@/lib/validation';
import { errorMessage } from '@/lib/errors';
import type { ActionResult } from '@/lib/domain';
import { readinessKeys } from './insights';
function refresh() { revalidatePath('/dashboard'); revalidatePath('/items','layout'); }
export async function saveReadinessPreference(item:string,revision:number,key:string,state:string):Promise<ActionResult> {
  if(!uuidSchema.safeParse(item).success || !Number.isInteger(revision) || revision<1 || !readinessKeys.includes(key as typeof readinessKeys[number]) || !['missing','unknown','not_applicable','dismissed'].includes(state))return {error:'Check this record preference.'};
  const {supabase}=await requireUser();
  const {error}=await supabase.rpc('set_readiness_preference',{p_item:item,p_revision:revision,p_criterion:key,p_state:state});
  if(error)return {error:errorMessage(error)};
  refresh();return {success:'Record preference saved.'};
}
export async function saveOccurrenceAmount(occurrence:string,revision:number,amount:number|null,certainty:string):Promise<ActionResult> {
  if(!uuidSchema.safeParse(occurrence).success || !Number.isInteger(revision) || revision<1 || !['confirmed','estimated','unverified','unset','inherit'].includes(certainty) ||
    (['unset','inherit'].includes(certainty) ? amount!==null : amount===null || !Number.isSafeInteger(amount) || amount<0 || amount>99999999999))return {error:'Check the amount and whether it is confirmed or estimated.'};
  const {supabase}=await requireUser();
  const {error}=await supabase.rpc('set_occurrence_amount',{p_occurrence:occurrence,p_revision:revision,p_amount:amount,p_certainty:certainty});
  if(error)return {error:errorMessage(error)};
  refresh();return {success:'Expected amount saved for this occurrence.'};
}
