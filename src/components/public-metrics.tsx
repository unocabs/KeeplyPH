'use client';
import { useEffect } from 'react';
import { isTemplate } from '@/features/templates';
export function PublicMetrics({page}:{page:'home'|'warranty-tracker'|'vehicle-registration-reminder'|'document-expiry-tracker'|'add'}){
 useEffect(()=>{function count(event:string,template='none'){void fetch('/api/metrics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({page,event,template}),keepalive:true}).catch(()=>{});}count('landing_view');
 const click=(event:MouseEvent)=>{const link=event.target instanceof Element?event.target.closest('a'):null;if(!link)return;const url=new URL(link.href);if(url.origin!==location.origin)return;const template=url.pathname.split('/')[2];if(url.pathname.startsWith('/add/')&&isTemplate(template))count('template_cta_clicked',template);};document.addEventListener('click',click);return()=>document.removeEventListener('click',click);},[page]);return null;
}
