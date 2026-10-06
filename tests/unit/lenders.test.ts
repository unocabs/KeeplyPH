import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile, readdir, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { availableLenders, getLender, isLender, lenderLabel, lenders, loanPresets } from '@/features/items/lenders';
import { ReminderIcon } from '@/components/reminder-icon';
import { ItemCard, ItemDateRow } from '@/components/item-ui';
import { UpcomingTimeline } from '@/components/upcoming-timeline';
import { timelineRows } from '@/features/items/timeline';
import { dateRows } from '@/features/items/domain';
import { sampleItems } from '@/lib/demo';

describe('loan lender identity', () => {
 it('shares all twelve banks across the five agreed loan types and keeps specialist lenders scoped', () => {
  const banks=lenders.slice(0,12);
  for(const preset of ['personal-loan','home-loan','car-loan','motorcycle-loan','business-loan']) {
   for(const bank of banks) expect(getLender('other',preset,bank.id)).toBe(bank);
  }
  for(const lender of lenders) for(const preset of loanPresets) {
   expect(Boolean(getLender('other',preset,lender.id))).toBe(preset==='other-loan' || (lender.categories as readonly string[]).includes(preset));
  }
  expect(getLender('other','car-payment','bpi')).toBe(getLender('other','car-loan','bpi'));
  expect(getLender('car','car-loan','bpi')).toBeUndefined();
  expect(availableLenders('other','software')).toEqual([]);
  expect(isLender('other','motorcycle-loan')).toBe(true);
  expect(isLender('../../bpi','personal-loan')).toBe(false);
  expect(isLender('bpi','streaming')).toBe(false);
 });
 it('uses the lender logo and loan badge across timeline, list, cards, independently of names and vehicle brands', () => {
  const today='2026-10-06';
  for(const preset of loanPresets) {
   const lender=availableLenders('other',preset)[0];
   const item={...sampleItems(today)[0],reminder_preset:preset,lender_id:lender.id,car_brand:'kia',motorcycle_brand:'honda',product_name:'Something meaningful to me'};
   const row=dateRows([item])[0];
   for(const compact of [true,false]) for(const html of [renderToStaticMarkup(createElement(ItemCard,{item,compact})),renderToStaticMarkup(createElement(ItemDateRow,{row,today,compact}))]) {
    expect(html).toContain(`/lenders/${lender.logo}.webp`);expect(html).toContain('loan-badge');expect(html).not.toContain('/car-brands/');expect(html).not.toContain('/motorcycle-brands/');expect(html).toContain(lender.label);
   }
   const timeline=renderToStaticMarkup(createElement(UpcomingTimeline,{rows:timelineRows([item],today),today}));
   expect(timeline).toContain(`/lenders/${lender.logo}.webp`);expect(timeline).toContain('loan-badge');expect(timeline).toContain(lender.label);
  }
 });
 it('keeps custom and missing lenders generic and never derives a logo from the reminder name', () => {
  for(const lenderId of [null,'other','unknown','sumisho']) {
   const html=renderToStaticMarkup(createElement(ReminderIcon,{template:'other',preset:'personal-loan',lenderId}));
   expect(html).not.toContain('/lenders/');expect(html).not.toContain('loan-badge');expect(html).toContain('<svg');
  }
  expect(lenderLabel({template_key:'other',reminder_preset:'personal-loan',lender_id:'other',lender_name:' My cooperative '})).toBe('My cooperative');
  expect(lenderLabel({template_key:'other',reminder_preset:'streaming',lender_id:'bpi'})).toBeUndefined();
 });
 it('ships exactly one small transparent logo per source, including shared GCash and Shopee artwork',async()=>{
  const sources=new Set(lenders.map(l=>l.logo));
  expect(lenders).toHaveLength(30);expect(sources.size).toBe(28);
  expect((await readdir('public/lenders')).sort()).toEqual([...sources].map(id=>id+'.webp').sort());
  let bytes=0;
  for(const source of sources) {
   const path=`public/lenders/${source}.webp`;bytes+=(await stat(path)).size;
   const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   expect([info.width,info.height]).toEqual([128,128]);expect(data[3]).toBe(0);
   expect(data.some((v,i)=>i%4===3 && v>0),source).toBe(true);
  }
  expect(bytes).toBeLessThan(250000);
 });
 it('keeps the SQL eligibility catalog in sync with the picker',async()=>{
  const sql=await readFile('supabase/migrations/202610060025_loan_lenders.sql','utf8');
  for(const lender of lenders) expect(sql).toContain(`('${lender.id}',array[${lender.categories.map(c=>`'${c}'`).join(',')}]::text[])`);
 });
});
