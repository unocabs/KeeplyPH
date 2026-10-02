import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), fetch: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ adminClient: () => ({ rpc: mocks.rpc }) }));
import { deliverReminderIdeas } from '@/lib/reminder-idea-worker';
const job = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', lease_token: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', user_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', enrollment_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', email: 'customer@example.test', theme: 'loans', variant: 0, payload: null };
beforeEach(() => {
  vi.stubEnv('EMAIL_DELIVERY_ENABLED', 'true'); vi.stubEnv('REMINDER_IDEAS_ENABLED', 'true'); vi.stubEnv('EMAIL_UNSUBSCRIBE_SECRET', 'test-secret-'.repeat(4)); vi.stubEnv('RESEND_API_KEY', 'test-key'); vi.stubEnv('EMAIL_FROM', 'Keeply <reminders@example.test>'); vi.stubEnv('APP_URL', 'https://keeplyph.com');
  mocks.rpc.mockReset().mockImplementation(async (name, args) => ({ data: name === 'claim_reminder_idea_jobs' ? [job] : name === 'prepare_reminder_idea' ? args.p_payload : null, error: null }));
  mocks.fetch.mockReset().mockResolvedValue(Response.json({ id: 'provider-id' })); vi.stubGlobal('fetch', mocks.fetch);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('optional reminder idea delivery', () => {
  it('does no work while disabled or without its signing secret', async () => {
    vi.stubEnv('REMINDER_IDEAS_ENABLED', 'false'); expect(await deliverReminderIdeas(Date.now())).toBe(0);
    vi.stubEnv('REMINDER_IDEAS_ENABLED', 'true'); vi.stubEnv('EMAIL_UNSUBSCRIBE_SECRET', ''); expect(await deliverReminderIdeas(Date.now())).toBe(0);
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('sends frozen headers and a stable idempotency key', async () => {
    expect(await deliverReminderIdeas(Date.now())).toBe(1);
    const options = mocks.fetch.mock.calls[0][1];
    expect(options.headers['Idempotency-Key']).toBe('keeply-idea/' + job.id);
    expect(JSON.parse(options.body).headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(mocks.rpc).toHaveBeenCalledWith('finish_reminder_idea', expect.objectContaining({ p_status: 'accepted', p_provider_id: 'provider-id' }));
  });
  it('skips provider delivery when consent changed after claim', async () => {
    mocks.rpc.mockImplementation(async name => ({ data: name === 'claim_reminder_idea_jobs' ? [job] : null, error: null }));
    expect(await deliverReminderIdeas(Date.now())).toBe(0); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('defers an uncertain provider response to the durable retry queue', async () => {
    mocks.fetch.mockRejectedValue(new Error('timeout'));
    expect(await deliverReminderIdeas(Date.now())).toBe(0);
    expect(mocks.rpc).toHaveBeenCalledWith('finish_reminder_idea', expect.objectContaining({ p_status: 'retry', p_error: 'provider_response_unknown' }));
  });
  it('leaves work for a later run near the function deadline', async () => {
    expect(await deliverReminderIdeas(Date.now() - 40000)).toBe(0); expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
