import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { ReminderSaved } from '@/components/reminder-saved';
import type { Usage } from '@/lib/domain';

const usage: Usage = { purchases: 1, reminders: 1, slot_limit: 3, storage_bytes: 0, premium: false, premium_until: null };
function render(patch: Partial<Parameters<typeof ReminderSaved>[0]> = {}) {
  return renderToStaticMarkup(createElement(ReminderSaved, { id: 'saved-item', usage, coverage: 'covered', created: true, ...patch }));
}

describe('post-save reminder guidance', () => {
  it('offers relevant next reminders after the first save, with two free slots left', () => {
    const html = render();
    expect(html).toContain('1 of 3 free alert slots');
    expect(html).toContain('2 slots available');
    expect(html).toContain('/add/other?preset=personal-loan');
    expect(html).toContain('/add/other?preset=other-bill');
    expect(html).toContain('/add/receipt?focus=warranty');
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('href="/items/saved-item"');
  });
  it('keeps all slots available when the first reminder has alerts off', () => {
    const html = render({ coverage: 'off', usage: { ...usage, reminders: 0 } });
    expect(html).toContain('0 of 3 free alert slots');
    expect(html).toContain('3 slots available');
    expect(html).toContain('Saving it does not use an alert slot');
  });
  it('shows paid capacity and a singular remaining slot', () => {
    const html = render({ usage: { ...usage, purchases: 9, reminders: 7, slot_limit: 8 } });
    expect(html).toContain('7 of 8 alert slots');
    expect(html).toContain('1 slot available');
    expect(html).not.toContain('free alert slots');
    expect(html).not.toContain('What else would you like to remember?');
    expect(html).toContain('Add another reminder');
  });
  it('explains paused coverage and makes pricing and slot management prominent at capacity', () => {
    const html = render({ coverage: 'paused_capacity', usage: { ...usage, reminders: 3, purchases: 4 } });
    expect(html).toContain('All your alert slots are in use');
    expect(html).toContain('needs an available alert slot');
    expect(html).toContain('keep saving unlimited reminders');
    expect(html).toContain('class="button primary" href="/pricing"');
    expect(html).toContain('href="/items?filter=reminders"');
    expect(html).not.toContain('Need more alerts?');
  });
  it('does not offer another reminder after editing or claim a paused delivery freed its slot', () => {
    const html = render({ created: false, deliveryPaused: true });
    expect(html).toContain('updated');
    expect(html).toContain('1 of 3 free alert slots');
    expect(html).toContain('delivery is paused');
    expect(html).not.toContain('Saving it does not use an alert slot');
    expect(html).not.toContain('Add another reminder');
    expect(html).not.toContain('What else would you like to remember?');
  });
});
