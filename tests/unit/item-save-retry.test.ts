import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), auth: vi.fn(), refresh: vi.fn(), from: vi.fn(), single: vi.fn(), eq: vi.fn(), select: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.refresh }));
vi.mock('@/lib/auth', () => ({ requireUser: mocks.auth }));
import { createAndSaveItem } from '@/features/items/actions';
import { actionError } from '@/lib/action-error';
const id = '11111111-1111-4111-8111-111111111111';
function form() {
  const value = new FormData();
  for (const [key, text] of Object.entries({ id, revision: '1', label: 'Mansfield Share', preset: 'rent', utility_id: '', utility_name: '', car_brand: '' })) value.set(key, text);
  value.set('date', JSON.stringify({ kind: 'other', label: 'Rent payment', due_on: '2032-11-01', reminders_enabled: true, offsets: [{ unit: 'days', value: 0 }], interval_months: null, recurrence_months: 1, recurrence_ends_on: null, payment_amount_minor: 845000 }));
  return value;
}
beforeEach(() => {
  vi.resetAllMocks();
  const query = { select: mocks.select, eq: mocks.eq, single: mocks.single };
  mocks.from.mockReturnValue(query); mocks.select.mockReturnValue(query); mocks.eq.mockReturnValue(query);
  mocks.auth.mockResolvedValue({ supabase: { rpc: mocks.rpc, from: mocks.from }, userId: 'owner' });
  mocks.rpc.mockResolvedValue({ error: null, data: { coverage: 'covered' } });
  mocks.single.mockResolvedValue({ error: null, data: { state: 'draft' } });
});
describe('new reminder save recovery', () => {
  it('saves the screenshot rent configuration through one server action', async () => {
    expect(await createAndSaveItem(form(), 'other')).toMatchObject({ id });
    expect(mocks.rpc).toHaveBeenCalledWith('save_utility_item_with_date', expect.objectContaining({ p_id: id, p_utility_id: '', p_date: expect.objectContaining({ recurrence_months: 1, offsets: [{ unit: 'days', value: 0 }] }) }));
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'owner');
  });
  it('recovers an already committed save without replaying its old revision', async () => {
    mocks.single.mockResolvedValue({ error: null, data: { state: 'saved' } });
    expect(await createAndSaveItem(form(), 'other')).toEqual({ id });
    expect(mocks.rpc.mock.calls.map(call => call[0])).toEqual(['create_item_draft']);
  });
  it('does not save if draft creation or the owner-scoped lookup fails', async () => {
    mocks.rpc.mockResolvedValueOnce({ error: { message: 'DRAFT_LIMIT' } });
    expect(await createAndSaveItem(form(), 'other')).toHaveProperty('error');
    expect(mocks.from).not.toHaveBeenCalled();
    mocks.single.mockResolvedValue({ error: { message: 'connection failed' }, data: null });
    expect(await createAndSaveItem(form(), 'other')).toHaveProperty('error');
    expect(mocks.rpc.mock.calls.some(call => call[0] === 'save_utility_item_with_date')).toBe(false);
  });
  it('preserves server validation errors and recognizes browser transport failures', () => {
    for (const message of ['Load failed', 'Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Failed to find Server Action']) {
      expect(actionError(new TypeError(message))).toContain('Your entered details are still here');
    }
    expect(actionError(new Error('Choose an end date on or after the next date.'))).toBe('Choose an end date on or after the next date.');
  });
});
