import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile, readdir, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { insurers, insurancePresets, availableInsurers, getInsurer, isInsurer, insurerLabel } from '@/features/items/insurers';
import { ReminderIcon } from '@/components/reminder-icon';
import { ItemCard, ItemDateRow } from '@/components/item-ui';
import { UpcomingTimeline } from '@/components/upcoming-timeline';
import { timelineRows } from '@/features/items/timeline';
import { dateRows } from '@/features/items/domain';
import { sampleItems } from '@/lib/demo';
describe('insurance provider identity',()=>{
 it('scopes providers by type, preserves distinct brands and labels HMOs',()=>{
  expect(insurers).toHaveLength(28);expect(new Set(insurers.map(p=>p.id)).size).toBe(28);
  for(const provider of insurers)for(const preset of insurancePresets)expect(Boolean(getInsurer('other',preset,provider.id))).toBe(preset==='other-insurance'||(provider.categories as readonly string[]).includes(preset));
  expect(getInsurer('other','life-insurance','bpi-aia')).toBeDefined();expect(getInsurer('other','vehicle-insurance','bpi-ms')).toBeDefined();
  expect(getInsurer('other','life-insurance','maxicare')).toBeUndefined();expect(getInsurer('other','health-insurance','medicard')).toMatchObject({hmo:true});
  expect(getInsurer('car','vehicle-insurance','axa')).toBeUndefined();expect(availableInsurers('other','personal-loan')).toEqual([]);
  expect(isInsurer('other','life-insurance')).toBe(true);expect(isInsurer('../../axa','other-insurance')).toBe(false);
 });
 it('uses provider identity throughout calendar, cards and date rows without guessing from the name',()=>{
  const today='2026-10-06';
  for(const preset of insurancePresets){
   const provider=availableInsurers('other',preset)[0];
   const item={...sampleItems(today)[0],reminder_preset:preset,insurer_id:provider.id,lender_id:null,product_name:'A personal name'};
   const row=dateRows([item])[0];
   const outputs=[renderToStaticMarkup(createElement(ItemCard,{item})),renderToStaticMarkup(createElement(ItemDateRow,{row,today})),renderToStaticMarkup(createElement(UpcomingTimeline,{rows:timelineRows([item],today),today}))];
   for(const html of outputs){expect(html).toContain('/insurers/'+provider.logo+'.webp');expect(html).toContain('insurance-badge');expect(html).toContain(provider.label);expect(html).not.toContain(' · Loan');}
  }
  for(const insurerId of [null,'other','unknown','maxicare']){
   const html=renderToStaticMarkup(createElement(ReminderIcon,{template:'other',preset:'life-insurance',insurerId}));expect(html).not.toContain('/insurers/');expect(html).not.toContain('insurance-badge');expect(html).toContain('<svg');
  }
  expect(insurerLabel({template_key:'other',reminder_preset:'life-insurance',insurer_id:'other',insurer_name:' My insurer '})).toBe('My insurer');
  expect(insurerLabel({template_key:'other',reminder_preset:'streaming',insurer_id:'sun-life'})).toBeUndefined();
 });
 it('ships one transparent, proportionate small logo per brand',async()=>{
  const sources=new Set(insurers.map(p=>p.logo));expect(sources.size).toBe(28);expect((await readdir('public/insurers')).sort()).toEqual([...sources].map(id=>id+'.webp').sort());
  let bytes=0;for(const source of sources){const path=`public/insurers/${source}.webp`;bytes+=(await stat(path)).size;
   const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});expect([info.width,info.height]).toEqual([128,128]);expect(data[3]).toBe(0);expect(data.some((v,i)=>i%4===3&&v>0),source).toBe(true);
  }expect(bytes).toBeLessThan(250000);
 });
 it('matches SQL eligibility to the frontend catalog',async()=>{
  const sql=await readFile('supabase/migrations/202610060026_insurance_providers.sql','utf8');
  for(const provider of insurers)expect(sql).toContain(`('${provider.id}',array[${provider.categories.map(c=>`'${c}'`).join(',')}]::text[])`);
 });
});
