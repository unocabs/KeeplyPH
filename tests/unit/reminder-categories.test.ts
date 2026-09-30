import { describe, expect, it } from 'vitest';
import { reminderCategories, choiceHref, itemCategory, paymentPreset } from '@/features/templates/categories';
import { reminderPresets, addIntent } from '@/features/templates';
import { safeAuthIntent } from '@/lib/auth-intent';

describe('reminder categories', () => {
  it('exposes every preset once, with the legacy car payment consolidated into car loans', () => {
    const choices = reminderCategories.flatMap(group => group.choices).filter(choice => choice.preset);
    expect(new Set(choices.map(choice => choice.preset)).size).toBe(choices.length);
    expect(choices.map(choice => choice.preset).sort()).toEqual(Object.keys(reminderPresets).filter(key => key !== 'car-payment').sort());
  });
  it('preserves category selections through sign-in, including every purchase category', () => {
    for (const choice of reminderCategories.flatMap(group => group.choices)) {
      expect(safeAuthIntent(choiceHref(choice))).toBe(addIntent(choice.template, choice.focus, choice.category, choice.preset));
    }
  });
  it('keeps insurance, payments and non-payment appointments distinct after saving', () => {
    expect(itemCategory({template_key:'other',reminder_preset:'life-insurance'})).toBe('insurance');
    expect(itemCategory({template_key:'other',reminder_preset:'car-payment'})).toBe('loans');
    expect(itemCategory({template_key:'other'})).toBe('custom');
    expect(itemCategory({template_key:'passport'})).toBe('documents');
    expect(paymentPreset('life-insurance')).toBe(true);
    expect(paymentPreset('tuition')).toBe(true);
    expect(paymentPreset('medical-appointment')).toBe(false);
    expect(paymentPreset('enrollment')).toBe(false);
  });
});
