'use client';
import { useEffect } from 'react';
import { recordUpgrade } from '@/features/billing/metrics';
export function UpgradeMetrics() {
 useEffect(()=>{void recordUpgrade('upgrade_cta_viewed');const clicked=(e:MouseEvent)=>{if((e.target as HTMLElement).closest('button[name="upgrade"],form input[name="product"]')||(e.target as HTMLElement).closest('form')?.querySelector('input[name="product"]'))void recordUpgrade('upgrade_cta_clicked');};document.addEventListener('click',clicked);return()=>document.removeEventListener('click',clicked);},[]);
 return null;
}
