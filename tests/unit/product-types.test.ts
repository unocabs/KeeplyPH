import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { productTypes, isProductType, resolvedProductType, suggestProductType } from '@/features/purchases/product-types';
import { ReminderIcon } from '@/components/reminder-icon';
import { ProductGlyph } from '@/components/icons/product-glyph';
import { PurchaseCard } from '@/components/purchase-ui';
import { ItemCard, ItemDateRow } from '@/components/item-ui';
import { UpcomingTimeline } from '@/components/upcoming-timeline';
import { sampleItems, samplePurchases } from '@/lib/demo';
import { dateRows } from '@/features/items/domain';
import { timelineRows } from '@/features/items/timeline';
describe('specific purchase identity',()=>{
 it('suggests whole item names and prioritizes specific overlapping phrases',()=>{
  for(const type of productTypes)for(const category of type.categories)expect(suggestProductType('My '+type.label,category),type.label).toBe(type.id);
  for(const [name,category,expected] of [['Sony WH-1000XM5 headphones','electronics','headphones'],['AirPods Pro','electronics','earbuds'],['TV — sala','electronics','tv'],['TV — sala','appliances','tv'],['Samsung microwave oven','appliances','microwave'],['Polo shirt','clothing','polo'],['Electric fan — desk','appliances','electric-fan'],['iPhone 16 Pro','electronics','phone']] as const)expect(suggestProductType(name,category)).toBe(expected);
  for(const name of ['Headphones and camera','Laptop + tablet','Camera and TV','Surveillance camera monitor','Shirt and watch'])expect(suggestProductType(name,name==='Shirt and watch'?'clothing':'electronics')).toBeUndefined();
  for(const name of ['Fanatic edition','Capacitor','TVS motorcycle','Telephone subscription','Unknown item'])expect(suggestProductType(name,'appliances')).toBeUndefined();
 });
 it('keeps explicit choices through renames and supports neutral and automatic modes',()=>{
  expect(resolvedProductType('electronics','My renamed gift','earbuds')).toBe('earbuds');expect(resolvedProductType('electronics','My laptop','headphones')).toBe('headphones');expect(resolvedProductType('electronics','Headphones','category')).toBeUndefined();expect(resolvedProductType('electronics','Headphones',null)).toBe('headphones');expect(resolvedProductType('clothing','Shirt','headphones')).toBeUndefined();expect(resolvedProductType('electronics','Headphones','../../camera')).toBeUndefined();
  expect(isProductType('tv','electronics')).toBe(true);expect(isProductType('tv','appliances')).toBe(true);expect(isProductType('earbuds','appliances')).toBe(false);expect(isProductType('category',null)).toBe(true);
 });
 it('renders all 31 types as distinct native SVGs',()=>{
  expect(productTypes).toHaveLength(31);const outputs=productTypes.map(type=>renderToStaticMarkup(createElement(ProductGlyph,{type:type.id})));expect(new Set(outputs).size).toBe(31);for(const html of outputs){expect(html).toContain('viewBox="0 0 24 24"');expect(html).not.toMatch(/<image|<script|<foreignObject|<filter|<mask/);}
 });
 it('uses the same saved icon in purchase cards, reminder cards, date rows and the calendar',()=>{
  const today='2026-10-07',base=sampleItems(today).find(item=>item.template_key==='receipt')!;
  for(const type of productTypes){const item={...base,product_name:'A renamed purchase',category:type.categories[0],product_type:type.id};const p={...samplePurchases()[0],product_name:item.product_name,category:item.category,product_type:type.id};
   for(const html of [renderToStaticMarkup(createElement(ItemCard,{item})),renderToStaticMarkup(createElement(ItemDateRow,{row:dateRows([item])[0],today})),renderToStaticMarkup(createElement(UpcomingTimeline,{rows:timelineRows([item],today),today})),renderToStaticMarkup(createElement(PurchaseCard,{purchase:p,today}))])expect(html).toContain('data-product-icon="'+type.id+'"');
  }
  const html=renderToStaticMarkup(createElement(ReminderIcon,{template:'other',category:'electronics',preset:'ai-subscription',productType:'earbuds',productName:'Headphones'}));expect(html).not.toContain('data-product-icon');
 });
});
