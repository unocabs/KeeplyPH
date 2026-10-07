import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { subscriptionBrands, getSubscriptionBrand } from '@/features/items/subscription-brands';
import { matchingReminderChoices, choiceHref, defaultRecurrenceMonths, paymentPreset } from '@/features/templates/categories';
import { initialDate } from '@/components/date-fields';
import { ReminderIcon } from '@/components/reminder-icon';
import { ItemCard, ItemDateRow } from '@/components/item-ui';
import { UpcomingTimeline } from '@/components/upcoming-timeline';
import { timelineRows } from '@/features/items/timeline';
import { dateRows } from '@/features/items/domain';
import { sampleItems } from '@/lib/demo';
import { reminderProviderLabel } from '@/features/items/provider-label';
const brands=subscriptionBrands.filter(brand=>brand.preset==='ai-subscription');
describe('AI subscription flow',()=>{
 it('offers one discoverable AI subcategory and defaults to editable monthly payments',()=>{
  expect(brands).toHaveLength(14);
  for(const name of brands.map(brand=>brand.label)){
   const choices=matchingReminderChoices(name).flatMap(group=>group.choices);
   expect(choices.some(choice=>choice.preset==='ai-subscription')).toBe(true);
   expect(choiceHref(choices.find(choice=>choice.preset==='ai-subscription')!)).toBe('/add/other?preset=ai-subscription');
  }
  expect(defaultRecurrenceMonths('ai-subscription')).toBe(1);expect(paymentPreset('ai-subscription')).toBe(true);
  expect(initialDate('other',undefined,'ai-subscription')).toMatchObject({label:'AI Subscription payment',kind:'other',recurrence_months:1});
 });
 it('uses selected service artwork and captions independently from the personal reminder name',()=>{
  const today='2026-10-07';
  for(const brand of brands){
   expect(getSubscriptionBrand('other','streaming',brand.id)).toBeUndefined();
   const item={...sampleItems(today)[1],reminder_preset:'ai-subscription',subscription_brand:brand.id,utility_id:null,product_name:'My annual plan'};
   const outputs=[renderToStaticMarkup(createElement(ItemCard,{item})),renderToStaticMarkup(createElement(ItemDateRow,{row:dateRows([item])[0],today})),renderToStaticMarkup(createElement(UpcomingTimeline,{rows:timelineRows([item],today),today}))];
   for(const html of outputs){expect(html).toContain('/subscription-brands/'+brand.id+'.webp');expect(html).toContain(brand.label);expect(html).toContain('My annual plan');}
   expect(reminderProviderLabel(item)).toBe(brand.label);
  }
 });
 it('keeps a neutral sparkles icon for unselected, custom and invalid identities',()=>{
  for(const subscriptionBrand of [null,'other','netflix','unknown']){
   const html=renderToStaticMarkup(createElement(ReminderIcon,{template:'other',preset:'ai-subscription',subscriptionBrand}));expect(html).toContain('data-icon="sparkles"');expect(html).not.toContain('<img');
  }
 });
});
