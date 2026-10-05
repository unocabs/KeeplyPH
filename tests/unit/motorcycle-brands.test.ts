import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { describe, it, expect } from 'vitest';
import { motorcycleBrands, getMotorcycleBrand, supportsMotorcycleBrand } from '@/features/items/motorcycle-brands';
import { ReminderIcon } from '@/components/reminder-icon';
import { ItemCard, ItemDateRow } from '@/components/item-ui';
import { dateRows } from '@/features/items/domain';
import { sampleItems } from '@/lib/demo';

describe('motorcycle identity', () => {
  it('uses the motorcycle artwork throughout saved reminders and dates', () => {
    const motorcycle = { ...sampleItems().find(item => item.template_key === 'motorcycle')!, motorcycle_brand: 'honda' };
    for (const compact of [true, false]) {
      expect(renderToStaticMarkup(createElement(ItemCard, { item: motorcycle, compact }))).toContain('/motorcycle-brands/honda.webp');
      expect(renderToStaticMarkup(createElement(ItemDateRow, { row: dateRows([motorcycle])[0], today: '2026-10-05', compact }))).toContain('/motorcycle-brands/honda.webp');
    }
    expect(renderToStaticMarkup(createElement(ItemCard, { item: { ...motorcycle, motorcycle_brand: null } }))).not.toContain('/motorcycle-brands/');
  });
  it('keeps car and motorcycle identities separate, including loans', () => {
    expect(supportsMotorcycleBrand('other', 'motorcycle-loan')).toBe(true);
    expect(supportsMotorcycleBrand('other', 'car-loan')).toBe(false);
    expect(renderToStaticMarkup(createElement(ReminderIcon, { template: 'other', preset: 'motorcycle-loan', motorcycleBrand: 'honda', brand: 'kia' }))).toContain('/motorcycle-brands/honda.webp');
    expect(renderToStaticMarkup(createElement(ReminderIcon, { template: 'car', brand: 'honda', motorcycleBrand: 'honda' }))).toContain('/car-brands/honda.webp');
    expect(renderToStaticMarkup(createElement(ReminderIcon, { template: 'other', preset: 'personal-loan', motorcycleBrand: 'honda' }))).not.toContain('/motorcycle-brands/');
    for (const brand of [null, 'other', 'unknown', '../../bad', 'kia']) {
      expect(getMotorcycleBrand(brand)).toBeUndefined();
      expect(renderToStaticMarkup(createElement(ReminderIcon, { template: 'motorcycle', motorcycleBrand: brand }))).not.toContain('/motorcycle-brands/');
    }
  });
  it('ships visible transparent artwork for every listed brand', async () => {
    expect(new Set(motorcycleBrands.map(brand => brand.id)).size).toBe(54);
    const sql = await readFile('supabase/migrations/202610050021_motorcycle_brands.sql', 'utf8');
    for (const brand of motorcycleBrands) {
      expect(sql).toContain("'" + brand.id + "'");
      const { data, info } = await sharp('public' + brand.logo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect(info.width).toBe(128); expect(info.height).toBe(128);
      const alpha = data.filter((_, index) => index % 4 === 3);
      expect(alpha.some(value => value === 0), brand.label).toBe(true);
      expect(alpha.some(value => value > 0), brand.label).toBe(true);
      // Corners must be transparent: no source-panel background in the logo tile.
      expect(data[3], brand.label).toBe(0);
    }
  });
});
