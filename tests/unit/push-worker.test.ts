import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), send: vi.fn(), ready: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ adminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock('@/lib/web-push', () => ({ pushReady: mocks.ready, sendWebPush: mocks.send, reminderPush: (value: unknown) => value, pushTtl: () => 3600 }));
import { deliverPushJobs } from '@/lib/push-worker';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',lease='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const value={ id, endpoint:'https://fcm.googleapis.com/wp/token', keys:{p256dh:'key',auth:'auth'}, itemId:id,dateId:id,product:'Reminder',kind:'Payment',dueOn:'2032-01-31',timezone:'Asia/Manila' };
beforeEach(()=>{vi.clearAllMocks();mocks.ready.mockReturnValue(true);mocks.send.mockResolvedValue({status:'accepted',error:null});mocks.rpc.mockImplementation(async(name:string)=>({data:name==='claim_push_jobs'?[{id,lease_token:lease}]:name==='prepare_push_job'?value:null,error:null}));});
describe('push worker',()=>{
  it('skips disabled delivery and exhausted function time without claiming work',async()=>{
    mocks.ready.mockReturnValue(false);expect(await deliverPushJobs(Date.now())).toBe(0);expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.ready.mockReturnValue(true);expect(await deliverPushJobs(Date.now()-45000)).toBe(0);expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('requires the final eligibility check before sending and acknowledges service acceptance',async()=>{
    expect(await deliverPushJobs(Date.now())).toBe(1);
    expect(mocks.rpc).toHaveBeenCalledWith('prepare_push_job',{p_id:id,p_lease:lease});
    expect(mocks.rpc).toHaveBeenCalledWith('finish_push_job',{p_id:id,p_lease:lease,p_status:'accepted',p_error:null});
    mocks.send.mockClear();mocks.rpc.mockImplementation(async(name:string)=>({data:name==='claim_push_jobs'?[{id,lease_token:lease}]:null,error:null}));
    expect(await deliverPushJobs(Date.now())).toBe(0);expect(mocks.send).not.toHaveBeenCalled();
  });
  it('removes expired subscriptions using endpoint and key and records uncertain sends',async()=>{
    mocks.send.mockResolvedValue({status:'expired',error:'http_410'});expect(await deliverPushJobs(Date.now())).toBe(0);
    expect(mocks.rpc).toHaveBeenCalledWith('expire_push_subscription',{p_endpoint:value.endpoint,p_auth:value.keys.auth});
    mocks.send.mockResolvedValue({status:'unknown',error:'provider_response_unknown'});await deliverPushJobs(Date.now());
    expect(mocks.rpc).toHaveBeenCalledWith('finish_push_job',{p_id:id,p_lease:lease,p_status:'unknown',p_error:'provider_response_unknown'});
  });
});
