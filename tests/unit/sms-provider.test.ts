import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const launch = vi.hoisted(() => ({ enabled: true }));
vi.mock('@/lib/alert-options', () => ({ get SMS_LAUNCH_ENABLED() { return launch.enabled; } }));
import { sendSms, smsReady } from '@/lib/sms';
beforeEach(() => { launch.enabled = true; vi.stubEnv('SMS_DELIVERY_ENABLED', 'true'); vi.stubEnv('SMS_VERIFICATION_SECRET', 'test-secret'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('SMS provider boundaries', () => {
  it('blocks sending while launch is postponed even with configured provider credentials', async () => {
    launch.enabled = false; vi.stubEnv('SEMAPHORE_API_KEY', 'test-key'); vi.stubEnv('SEMAPHORE_SENDER_NAME', 'Keeply');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect(smsReady()).toBe(false);
    expect((await sendSms('+639171234567', 'Reminder')).error).toBe('sms_unavailable');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('sends one encoded request and records acceptance rather than handset delivery', async () => {
    vi.stubEnv('SEMAPHORE_API_KEY', 'test-key'); vi.stubEnv('SEMAPHORE_SENDER_NAME', 'Keeply');
    const fetch = vi.fn().mockResolvedValue(Response.json([{message_id:123,status:'Queued'}]));vi.stubGlobal('fetch',fetch);
    expect(await sendSms('+639171234567','Keeply: Reminder')).toEqual({status:'accepted',providerId:'123',error:null});
    const body = fetch.mock.calls[0][1].body as URLSearchParams;
    expect(body.get('number')).toBe('639171234567');expect(body.get('sendername')).toBe('Keeply');expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('never retries an ambiguous failure or a rejected request', async () => {
    vi.stubEnv('SEMAPHORE_API_KEY', 'test-key');vi.stubEnv('SEMAPHORE_SENDER_NAME', 'Keeply');
    const fetch=vi.fn().mockRejectedValue(new Error('timeout'));vi.stubGlobal('fetch',fetch);
    expect((await sendSms('+639171234567','Reminder')).status).toBe('unknown');expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockReset().mockResolvedValue(new Response('',{status:429}));
    expect((await sendSms('+639171234567','Reminder')).status).toBe('failed');expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockReset().mockResolvedValue(Response.json({error:'unexpected'}));
    expect((await sendSms('+639171234567','Reminder')).status).toBe('unknown');expect(fetch).toHaveBeenCalledTimes(1);
  });
});
