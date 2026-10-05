import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleItems } from '@/lib/demo';

const mocks = vi.hoisted(() => ({ getItem: vi.fn(), getUsage: vi.fn(), requireUser: vi.fn(), detail: vi.fn() }));
vi.mock('@/features/items/queries', () => ({ getItem: mocks.getItem }));
vi.mock('@/features/purchases/queries', () => ({ getUsage: mocks.getUsage }));
vi.mock('@/lib/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/components/item-detail', () => ({ ItemDetail: (props: unknown) => { mocks.detail(props); return 'Reminder details'; } }));
vi.mock('@/components/item-form', () => ({ ItemForm: () => 'Draft form' }));
vi.mock('@/components/purchase-form', () => ({ PurchaseForm: () => 'Receipt draft form' }));
import Page from '@/app/(app)/items/[id]/page';

async function render(saved?: string) {
  const result = await Page({ params: Promise.resolve({ id: sampleItems()[0].id }), searchParams: Promise.resolve({ saved }) });
  return renderToStaticMarkup(createElement('main', null, result));
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ profile: { timezone: 'Asia/Manila' } });
  mocks.getItem.mockResolvedValue(sampleItems()[0]);
  mocks.getUsage.mockResolvedValue({ purchases: 1, reminders: 1, slot_limit: 3 });
});
describe('reminder detail save confirmation', () => {
  it('shows guidance only when arriving from a save', async () => {
    expect(await render()).not.toContain('Your reminder is saved');
    expect(mocks.getUsage).toHaveBeenCalledOnce();
    expect(mocks.detail).toHaveBeenCalledWith(expect.objectContaining({ usage: { purchases: 1, reminders: 1, slot_limit: 3 } }));
    vi.clearAllMocks();
    expect(await render('created')).toContain('What else would you like to remember?');
    expect(mocks.getUsage).toHaveBeenCalledOnce();
  });
  it('renders edits without first-save suggestions, and supports previous uncovered redirects', async () => {
    const edited = await render('updated');
    expect(edited).toContain('Your reminder is updated');
    expect(edited).not.toContain('What else would you like to remember?');
    expect(await render('uncovered')).toContain('Your reminder is saved');
  });
  it('does not claim a draft was saved even if the URL contains a save marker', async () => {
    mocks.getItem.mockResolvedValue({ ...sampleItems()[0], state: 'draft' });
    const html = await render('created');
    expect(html).not.toContain('Your reminder is saved');
    expect(html).toContain('Draft form');
    expect(mocks.getUsage).not.toHaveBeenCalled();
  });
});
