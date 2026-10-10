import 'server-only';
import {cache} from 'react';
import {requireUser} from '@/lib/auth';
import type {DiscoveryVariant} from './discovery';
export const getPremiumMeasurementContext=cache(async function():Promise<{enabled:boolean;variant:DiscoveryVariant}> {
 const fallback={enabled:false,variant:'contextual' as const};
 if(process.env.ANALYTICS_ENABLED!=='true')return fallback;
 const {profile,supabase}=await requireUser();
 if(!profile.analytics_enabled)return fallback;
 try {
  const {data,error}=await supabase.rpc('premium_measurement_context',{p_experiment:process.env.PREMIUM_DISCOVERY_EXPERIMENT_ENABLED==='true'});
  if(error)return fallback;
  const result=data as unknown as {enabled:boolean;variant:DiscoveryVariant};
  return result?.enabled&&['control','contextual'].includes(result.variant)?result:fallback;
 }catch{return fallback;}
});
