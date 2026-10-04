import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { describe, it, expect } from 'vitest';
import { carBrands, getCarBrand, supportsCarBrand } from '@/features/items/car-brands';
import { ReminderIcon } from '@/components/reminder-icon';
import { ItemCard, ItemDateRow } from '@/components/item-ui';
import { dateRows } from '@/features/items/domain';
import { sampleItems } from '@/lib/demo';

describe('car identity', () => {
  it('uses the selected brand rather than guessing from the reminder name', () => {
    const car = { ...sampleItems()[3], product_name: 'Kia Stonic', car_brand: 'kia' };
    const card = renderToStaticMarkup(createElement(ItemCard, { item: car, compact: true }));
    const row = renderToStaticMarkup(createElement(ItemDateRow, { row: dateRows([car])[0], today: '2026-10-04', compact: true }));
    expect(card).toContain('/car-brands/kia.webp');
    expect(row).toContain('/car-brands/kia.webp');
    expect(renderToStaticMarkup(createElement(ItemCard, { item: { ...car, car_brand: null } }))).not.toContain('/car-brands/');
  });
  it('supports car loans and legacy payments and keeps other categories generic', () => {
    for (const preset of ['car-loan', 'car-payment']) {
      expect(supportsCarBrand('other', preset)).toBe(true);
      expect(renderToStaticMarkup(createElement(ReminderIcon, { template: 'other', preset, brand: 'kia' }))).toContain('/car-brands/kia.webp');
    }
    expect(supportsCarBrand('motorcycle')).toBe(false);
    expect(renderToStaticMarkup(createElement(ReminderIcon, { template: 'motorcycle', brand: 'kia' }))).not.toContain('/car-brands/');
    for (const brand of [null, 'other', 'unknown', '../../bad']) {
      expect(getCarBrand(brand)).toBeUndefined();
      expect(renderToStaticMarkup(createElement(ReminderIcon, { template: 'car', brand }))).not.toContain('/car-brands/');
    }
  });
  it('ships visible transparent artwork for every selectable brand', async () => {
    expect(new Set(carBrands.map(brand => brand.id)).size).toBe(69);
    const sql = await readFile('supabase/migrations/202610040019_car_brands.sql', 'utf8');
    for (const brand of carBrands) {
      expect(sql).toContain("'" + brand.id + "'");
      const { data, info } = await sharp('public' + brand.logo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect(info.width).toBe(128);
      expect(info.height).toBe(128);
      const alpha = data.filter((_, index) => index % 4 === 3);
      expect(alpha.some(value => value === 0), brand.label).toBe(true);
      expect(alpha.some(value => value > 0), brand.label).toBe(true);
    }
  });
});
