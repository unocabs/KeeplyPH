import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { stat } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { subscriptionBrands, getSubscriptionBrand, isSubscriptionBrand } from '@/features/items/subscription-brands';
import { ReminderIcon } from '@/components/reminder-icon';
import { ItemCard, ItemDateRow } from '@/components/item-ui';
import { dateRows } from '@/features/items/domain';
import { sampleItems } from '@/lib/demo';

describe('subscription identity', () => {
  it('only accepts brands belonging to the selected reminder type', () => {
    for (const brand of subscriptionBrands) {
      expect(getSubscriptionBrand('other', brand.preset, brand.id)?.id).toBe(brand.id);
      expect(isSubscriptionBrand(brand.id, brand.preset)).toBe(true);
      expect(getSubscriptionBrand('other', brand.preset === 'gym' ? 'streaming' : 'gym', brand.id)).toBeUndefined();
    }
    expect(isSubscriptionBrand('other', 'gym')).toBe(true);
    expect(isSubscriptionBrand('../../bad', 'streaming')).toBe(false);
    expect(getSubscriptionBrand('car', 'streaming', 'netflix')).toBeUndefined();
  });
  it('uses the saved brand independently from the name on cards and date rows', () => {
    const item = { ...sampleItems()[0], template_key: 'other' as const, reminder_preset: 'streaming', subscription_brand: 'netflix', product_name: 'Family entertainment' };
    for (const compact of [true, false]) {
      expect(renderToStaticMarkup(createElement(ItemCard, { item, compact }))).toContain('/subscription-brands/netflix.webp');
      expect(renderToStaticMarkup(createElement(ItemDateRow, { row: dateRows([item])[0], today: '2026-10-05', compact }))).toContain('/subscription-brands/netflix.webp');
    }
    for (const brand of [null, 'other', 'unknown', 'anytime-fitness']) {
      expect(renderToStaticMarkup(createElement(ItemCard, { item: { ...item, product_name: 'Netflix', subscription_brand: brand } }))).not.toContain('/subscription-brands/');
    }
    expect(renderToStaticMarkup(createElement(ReminderIcon, { template: 'other', preset: 'gym', subscriptionBrand: 'anytime-fitness' }))).toContain('/subscription-brands/anytime-fitness.webp');
  });
  it('ships visible transparent artwork for all 26 brands within a small storage budget', async () => {
    expect(new Set(subscriptionBrands.map(brand => brand.id)).size).toBe(26);
    let totalBytes = 0;
    for (const brand of subscriptionBrands) {
      const image = sharp('public/subscription-brands/' + brand.id + '.webp');
      totalBytes += (await stat('public/subscription-brands/' + brand.id + '.webp')).size;
      const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect([info.width, info.height], brand.label).toEqual([128, 128]);
      const alpha = data.filter((_, index) => index % 4 === 3);
      expect(alpha.some(value => value === 0), brand.label).toBe(true);
      expect(alpha.some(value => value === 255), brand.label).toBe(true);
    }
    expect(totalBytes).toBeLessThan(250_000);
  });
});
