'use server';
import { requireUser } from '@/lib/auth';
export async function recordUpgrade(event:string) {
 if(process.env.ANALYTICS_ENABLED!=='true'||!['upgrade_cta_viewed','upgrade_cta_clicked'].includes(event))return;
 try{const {supabase}=await requireUser();await supabase.rpc('record_upgrade_event',{p_event:event});}catch{/* Optional measurement must not interrupt a purchase. */}
}
