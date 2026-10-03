import { describe, expect, it } from 'vitest';
import { reminderCategories, choiceHref, itemCategory, paymentPreset, defaultRecurrenceMonths, paymentDate } from '@/features/templates/categories';
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
  it('defaults predictable payments to monthly while leaving variable schedules optional', () => {
    const monthly = ['electric-bill', 'water-bill', 'internet-bill', 'mobile-bill', 'rent', 'association-dues', 'streaming', 'software', 'gym'];
    for (const group of reminderCategories) {
      for (const choice of group.choices) {
        expect(defaultRecurrenceMonths(choice.preset)).toBe(group.key === 'loans' || monthly.includes(choice.preset || '') ? 1 : null);
      }
    }
    expect(defaultRecurrenceMonths('car-payment')).toBe(1);
  });
  it('labels premium payments separately from policy renewal dates', () => {
    for (const [key, preset] of Object.entries(reminderPresets)) {
      expect(paymentDate(key, 'other', preset.dateLabel)).toBe(paymentPreset(key));
      expect(paymentDate(key, 'warranty', preset.dateLabel)).toBe(false);
    }
    expect(paymentDate('life-insurance', 'other', 'Policy renewal / review')).toBe(false);
    expect(paymentDate(undefined, 'other', 'My appointment')).toBe(false);
  });
});
