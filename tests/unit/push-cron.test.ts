import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), deliver: vi.fn(), ready: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ adminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock('@/lib/push-worker', () => ({ deliverPushJobs: mocks.deliver }));
vi.mock('@/lib/web-push', () => ({ pushReady: mocks.ready }));
vi.mock('@/lib/security', () => ({ validCron: () => true }));
vi.mock('@/lib/sms', () => ({ smsReady: () => false, sendSms: vi.fn() }));
vi.mock('@/lib/env', () => ({ appUrl: () => 'https://keeplyph.com', requireEnv: () => 'test-configuration' }));
import { POST } from '@/app/api/cron/notifications/route';
beforeEach(() => { vi.clearAllMocks(); mocks.ready.mockReturnValue(true); mocks.deliver.mockResolvedValue(1); mocks.rpc.mockResolvedValue({ data: [], error: null }); });
describe('independent reminder channels', () => {
  it('delivers push and advances recurrence while email is off', async () => {
    vi.stubEnv('EMAIL_DELIVERY_ENABLED', 'false');
    const response = await POST(new Request('https://keeplyph.com/api/cron/notifications', { method: 'POST' }));
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ pushAccepted: 1, smsAccepted: 0 });
    expect(mocks.rpc).toHaveBeenCalledWith('advance_recurring_dates', {});
    expect(mocks.rpc).not.toHaveBeenCalledWith('claim_notification_jobs', expect.anything()); vi.unstubAllEnvs();
  });
  it('continues email delivery after a push worker failure', async () => {
    vi.stubEnv('EMAIL_DELIVERY_ENABLED', 'true'); mocks.deliver.mockRejectedValue(new Error('Push unavailable'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await POST(new Request('https://keeplyph.com/api/cron/notifications', { method: 'POST' }));
      expect(response.status).toBe(200); expect((await response.json()).pushAccepted).toBe(0);
      expect(mocks.rpc).toHaveBeenCalledWith('claim_notification_jobs', { p_limit: 2, p_daily_limit: 90 });
    } finally { log.mockRestore(); vi.unstubAllEnvs(); }
  });
  it('preserves recurrence advancement when all delivery channels are disabled', async () => {
    vi.stubEnv('EMAIL_DELIVERY_ENABLED', 'false'); mocks.ready.mockReturnValue(false);
    const response = await POST(new Request('https://keeplyph.com/api/cron/notifications', { method: 'POST' }));
    expect((await response.json()).skipped).toBe('Alert delivery is disabled');
    expect(mocks.rpc).toHaveBeenCalledWith('advance_recurring_dates', {}); expect(mocks.deliver).not.toHaveBeenCalled(); vi.unstubAllEnvs();
  });
});
