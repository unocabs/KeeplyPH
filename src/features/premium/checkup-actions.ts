'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { requiredDate } from '@/features/items/validation';
export async function saveCheckupPayday(date:string):Promise<{error?:string}> {
 if(!requiredDate.safeParse(date).success)return {error:'Choose a valid payday.'};
 const {supabase}=await requireUser();
 const {error}=await supabase.rpc('set_household_checkup_payday',{p_payday:date});
 if(error)return {error:error.message.includes('INVALID_INPUT')?'Choose a payday from tomorrow to one year ahead.':error.message.includes('PREMIUM_REQUIRED')?'Premium access has ended. Your household records are still available.':'Your payday could not be saved. Please try again.'};
 revalidatePath('/checkup');
 return {};
}
export async function captureCheckup():Promise<{error?:string}> {
 const {supabase}=await requireUser();
 const {error}=await supabase.rpc('capture_household_checkup',{});
 return error?{error:'Your comparison point could not be saved. Your current expenses are still available.'}:{};
}
