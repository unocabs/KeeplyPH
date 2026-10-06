import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TemplateIcon, ReminderIcon, DateIcon } from '@/components/reminder-icon';
import { reminderCategories, choiceHref } from '@/features/templates/categories';
import type { Category } from '@/lib/domain';

describe('local category icon identity', () => {
  it('renders every category and choice as a decorative SVG with no asset request', () => {
    for (const group of reminderCategories) {
      const choices = [{ template: 'other' as const, group: group.key }, ...group.choices];
      for (const choice of choices) {
        const html = renderToStaticMarkup(createElement(TemplateIcon, { ...choice, category: ('category' in choice ? choice.category : undefined) as Category | undefined }));
        expect(html).toContain('viewBox="0 0 24 24"');
        expect(html).toContain('aria-hidden="true"');
        expect(html).toContain('focusable="false"');
        expect(html).toContain('fill-opacity=".18"');
        expect(html).not.toMatch(/<img|<image|<use|<filter|<linearGradient|\bid=/);
      }
    }
  });

  it('distinguishes vehicle purposes without changing the base or navigation destination', () => {
    for (const template of ['car', 'motorcycle'] as const) {
      for (const [groupKey, focus, modifier] of [['insurance', 'insurance', 'insurance'], ['maintenance', 'service', 'maintenance']]) {
        const vehicle = reminderCategories.find(group => group.key === 'vehicles')!.choices.find(choice => choice.template === template && choice.focus === focus)!;
        const cross = reminderCategories.find(group => group.key === groupKey)!.choices.find(choice => choice.template === template && choice.focus === focus)!;
        expect(choiceHref(cross)).toBe(choiceHref(vehicle));
        const html = renderToStaticMarkup(createElement(TemplateIcon, { ...cross, category: cross.category as Category | undefined }));
        expect(html).toContain(`data-icon="${template}"`);
        expect(html).toContain(`data-modifier="${modifier}"`);
      }
    }
    expect(renderToStaticMarkup(createElement(TemplateIcon, { template: 'car', focus: 'registration' }))).toContain('data-modifier="registration"');
  });

  it('uses the same bill document with distinct utility cues and preserves a safe fallback', () => {
    for (const [preset, modifier] of [['electric-bill', 'electric'], ['water-bill', 'water'], ['internet-bill', 'wifi']]) {
      const html = renderToStaticMarkup(createElement(TemplateIcon, { template: 'other', preset }));
      expect(html).toContain('data-icon="receipt"');
      expect(html).toContain(`data-modifier="${modifier}"`);
    }
    expect(renderToStaticMarkup(createElement(TemplateIcon, { template: 'other', preset: 'unknown' }))).toContain('data-icon="calendar"');
    expect(renderToStaticMarkup(createElement(TemplateIcon, { template: 'other', group: 'unknown' }))).toContain('data-icon="calendar"');
  });

  it('preserves provider artwork and saved-loan fallback precedence', () => {
    const provider = renderToStaticMarkup(createElement(ReminderIcon, { template: 'other', preset: 'car-loan', lenderId: 'bpi', brand: 'kia' }));
    expect(provider).toContain('/lenders/bpi.webp');
    expect(provider).not.toContain('/car-brands/');
    const saved = renderToStaticMarkup(createElement(ReminderIcon, { template: 'other', preset: 'home-loan', lenderId: null }));
    expect(saved).toContain('data-icon="hand-coins"');
    const choice = renderToStaticMarkup(createElement(ReminderIcon, { template: 'other', preset: 'home-loan' }));
    expect(choice).toContain('data-icon="house"');
    expect(choice).toContain('data-modifier="payment"');
  });

  it('keeps date purpose independent of item identity and supports small inline sizes', () => {
    const renewal = renderToStaticMarkup(createElement(DateIcon, { kind: 'other', label: 'Policy renewal / review', preset: 'life-insurance', size: 13 }));
    expect(renewal).toContain('data-icon="shield-check"');
    expect(renewal).toContain('width="13"');
    const payment = renderToStaticMarkup(createElement(DateIcon, { kind: 'other', preset: 'life-insurance' }));
    expect(payment).toContain('data-icon="wallet"');
  });
});
