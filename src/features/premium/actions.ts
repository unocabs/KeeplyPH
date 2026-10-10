'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { uuidSchema } from '@/lib/validation';
export interface InstallationGift {id:string;starts_at:string;ends_at:string;celebrate:boolean;activated:boolean}
export async function activateInstallationPremium(installed:boolean):Promise<{gift?:InstallationGift;error?:string}> {
 if(installed!==true)return {error:'Open Keeply from its installed icon to activate your gift.'};
 const {supabase}=await requireUser();
 const {data,error}=await supabase.rpc('activate_installation_premium',{p_installed:true});
 if(error)return {error:'Your gift could not activate yet. Please try again. No payment details are needed.'};
 const gift=data as unknown as InstallationGift;
 if(gift.activated)revalidatePath('/','layout');return {gift};
}
export async function acknowledgeInstallationPremium(id:string):Promise<{error?:string}> {
 if(!uuidSchema.safeParse(id).success)return {error:'Invalid gift.'};
 const {supabase}=await requireUser();const {error}=await supabase.rpc('acknowledge_installation_premium',{p_id:id});
 return error?{error:'Unable to save this acknowledgement.'}:{};
}
