import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile, readdir, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { utilities, utilityPresets, availableUtilities, getUtility, isUtility, utilityLabel } from '@/features/items/utilities';
import { ReminderIcon } from '@/components/reminder-icon';
import { ItemCard, ItemDateRow } from '@/components/item-ui';
import { UpcomingTimeline } from '@/components/upcoming-timeline';
import { timelineRows } from '@/features/items/timeline';
import { dateRows } from '@/features/items/domain';
import { sampleItems } from '@/lib/demo';
describe('utility biller identity',()=>{
 it('scopes companies by service and shares artwork across compatible services',()=>{
  expect(utilities).toHaveLength(30);expect(new Set(utilities.map(p=>p.id)).size).toBe(30);
  for(const provider of utilities)for(const preset of utilityPresets)expect(Boolean(getUtility('other',preset,provider.id))).toBe((provider.categories as readonly string[]).includes(preset));
  expect(getUtility('other','internet-bill','pldt')?.logo).toBe(getUtility('other','mobile-bill','pldt')?.logo);
  expect(getUtility('other','other-bill','sky')).toBeDefined();expect(getUtility('other','other-bill','converge')).toBeUndefined();
  expect(availableUtilities('other','rent')).toEqual([]);expect(availableUtilities('other','association-dues')).toEqual([]);
  expect(getUtility('car','electric-bill','meralco')).toBeUndefined();expect(isUtility('other','rent')).toBe(true);expect(isUtility('../../globe','internet-bill')).toBe(false);
 });
 it('uses provider identity throughout calendar, cards and date rows without guessing from the name',()=>{
  const today='2026-10-06';
  for(const preset of utilityPresets){
   const provider=availableUtilities('other',preset)[0];if(!provider)continue;
   const item={...sampleItems(today)[0],reminder_preset:preset,utility_id:provider.id,lender_id:null,product_name:'A personal name'};
   const row=dateRows([item])[0];
   const outputs=[renderToStaticMarkup(createElement(ItemCard,{item})),renderToStaticMarkup(createElement(ItemDateRow,{row,today})),renderToStaticMarkup(createElement(UpcomingTimeline,{rows:timelineRows([item],today),today}))];
   for(const html of outputs){expect(html).toContain('/utilities/'+provider.logo+'.webp');expect(html).toContain('utility-badge');expect(html).toContain(provider.label);expect(html).not.toContain(' · Loan');}
  }
  for(const utilityId of [null,'other','unknown','pldt']){
   const html=renderToStaticMarkup(createElement(ReminderIcon,{template:'other',preset:'electric-bill',utilityId}));expect(html).not.toContain('/utilities/');expect(html).not.toContain('utility-badge');expect(html).toContain('<svg');
  }
  expect(utilityLabel({template_key:'other',reminder_preset:'electric-bill',utility_id:'other',utility_name:' My biller '})).toBe('My biller');
  expect(utilityLabel({template_key:'other',reminder_preset:'streaming',utility_id:'meralco'})).toBeUndefined();
 });
 it('ships one transparent, proportionate small logo per brand',async()=>{
  const sources=new Set(utilities.map(p=>p.logo));expect(sources.size).toBe(30);expect((await readdir('public/utilities')).sort()).toEqual([...sources].map(id=>id+'.webp').sort());
  let bytes=0;for(const source of sources){const path=`public/utilities/${source}.webp`;bytes+=(await stat(path)).size;
   const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});expect([info.width,info.height]).toEqual([128,128]);expect(data[3]).toBe(0);expect(data.some((v,i)=>i%4===3&&v>0),source).toBe(true);
  }expect(bytes).toBeLessThan(250000);
 });
 it('matches SQL eligibility to the frontend catalog',async()=>{
  const sql=await readFile('supabase/migrations/202610060027_utility_billers.sql','utf8');
  for(const provider of utilities)expect(sql).toContain(`('${provider.id}',array[${provider.categories.map(c=>`'${c}'`).join(',')}]::text[])`);
 });
});
