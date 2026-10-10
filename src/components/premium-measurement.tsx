'use client';
import {useEffect,useRef} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import {premiumEventSchema,type PremiumEvent} from '@/features/premium/measurement';
function send(event:PremiumEvent) {
 if(!globalThis.crypto?.randomUUID)return;
 const body={...event,id:crypto.randomUUID()};
 if(!premiumEventSchema.safeParse(body).success)return;
 void fetch('/api/premium-metrics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{});
}
export function PremiumMeasurement({enabled,accountId,premium}:{enabled:boolean;accountId:string;premium:boolean}) {
 const pathname=usePathname(),query=useSearchParams(),requested=Number(query.get('days')??30);
 const days=premium&&[90,365].includes(requested)?requested:30;
 const view=useRef(''),seen=useRef(new Set<string>());
 useEffect(()=>{
  if(!enabled){view.current='';seen.current.clear();return;}
  const key=accountId+':'+pathname+':'+days+':'+premium;
  if(view.current!==key){view.current=key;seen.current.clear();
   if(pathname==='/checkup')send({event:premium?'checkup_opened':'checkup_preview_opened',surface:'checkup',horizon:30});
   if(pathname==='/planner')send({event:days>30?'extended_planner_used':'calendar_30d_used',surface:'outlook',horizon:days as 30|90|365});
   if(pathname==='/settings/billing')send({event:'premium_details_opened',surface:'billing'});
  }
  const observed=new WeakSet<Element>();
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting||entry.intersectionRatio<.25)continue;
   const surface=entry.target.closest('[data-premium-surface]')?.getAttribute('data-premium-surface') as PremiumEvent['surface'];
   const events:PremiumEvent['event'][]=entry.target.hasAttribute('data-premium-preview')?['premium_preview_viewed']:[];
   if(entry.target.hasAttribute('data-premium-expired'))events.push('premium_expiry_viewed');
   for(const event of events){const id=event+':'+surface;if(!seen.current.has(id)){seen.current.add(id);send({event,surface});}} 
   observer.unobserve(entry.target);
  }},{threshold:.25});
  const observe=()=>document.querySelectorAll('[data-premium-preview],[data-premium-expired]').forEach(element=>{if(!observed.has(element)){observed.add(element);observer.observe(element);}});
  observe();const mutations=new MutationObserver(observe);mutations.observe(document.body,{childList:true,subtree:true});
  const click=(event:MouseEvent)=>{
   const target=event.target instanceof Element?event.target.closest<HTMLElement>('a[data-premium-event],button[data-premium-event]'):null;
   if(!target)return;
   const surface=target.closest('[data-premium-surface]')?.getAttribute('data-premium-surface');
   send({event:target.dataset.premiumEvent,surface,horizon:target.dataset.premiumHorizon?Number(target.dataset.premiumHorizon):undefined,insight:target.dataset.premiumInsight} as PremiumEvent);
  };
  document.addEventListener('click',click);
  return()=>{observer.disconnect();mutations.disconnect();document.removeEventListener('click',click);};
 },[enabled,accountId,pathname,days,premium]);
 return null;
}
