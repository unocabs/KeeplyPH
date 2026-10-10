import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { ReminderSaved } from '@/components/reminder-saved';
import type { Usage } from '@/lib/domain';

const usage: Usage = { purchases: 1, reminders: 1, slot_limit: 3, storage_bytes: 0, premium: false, premium_until: null };
function render(patch: Partial<Parameters<typeof ReminderSaved>[0]> = {}) {
  return renderToStaticMarkup(createElement(ReminderSaved, { id: 'saved-item', usage, coverage: 'covered', created: true, ...patch }));
}

describe('post-save household guidance', () => {
 it('offers relevant next household records and the planner after the first save',()=>{
  const html=render();
  for(const link of ['/add/other?preset=personal-loan','/add/other?preset=other-bill','/add/receipt?focus=warranty','/planner','/items/saved-item'])expect(html).toContain(link);
  expect(html).not.toContain('alert slots');expect(html).not.toContain('/pricing');
 });
 it('explains date and account preferences without a capacity upsell',()=>{
  expect(render({coverage:'off'})).toContain('Alerts are off for this reminder');
  expect(render({deliveryPaused:true})).toContain('delivery is paused');
  expect(render({dateAlertsEnabled:false})).toContain('Alerts are off for the date you just added');
 });
 it('keeps edit confirmation concise',()=>{
  const html=render({created:false,usage:{...usage,purchases:9}});
  expect(html).toContain('updated');expect(html).not.toContain('Add another reminder');expect(html).not.toContain('What else would you like to remember?');expect(html).not.toContain('slots');
 });
});
