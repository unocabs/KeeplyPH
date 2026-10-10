import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {premiumExpiry,premiumExpiryHeading} from '@/features/premium/discovery';
import type {Usage} from '@/lib/domain';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),claims:vi.fn(),origin:vi.fn(),configured:vi.fn()}));
vi.mock('@/lib/security',()=>({checkOrigin:mocks.origin}));
vi.mock('@/lib/env',()=>({isConfigured:mocks.configured}));
vi.mock('@/lib/supabase/server',()=>({serverClient:async()=>({rpc:mocks.rpc,auth:{getClaims:mocks.claims}})}));
import {POST} from '@/app/api/premium-metrics/route';
const base={household_premium:false,household_premium_until:null,installation_premium_claimed:false} as Usage;
const event={id:'11111111-1111-4111-8111-111111111111',event:'checkup_insight_inspected',surface:'checkup',horizon:30,insight:'category'};
const request=(value:unknown)=>new Request('https://www.keeplyph.com/api/premium-metrics',{method:'POST',body:typeof value==='string'?value:JSON.stringify(value)});
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('ANALYTICS_ENABLED','true');vi.stubEnv('PREMIUM_DISCOVERY_EXPERIMENT_ENABLED','false');mocks.origin.mockReturnValue(true);mocks.configured.mockReturnValue(true);mocks.claims.mockResolvedValue({data:{claims:{sub:'owner'}},error:null});mocks.rpc.mockResolvedValue({error:null});});
afterEach(()=>vi.unstubAllEnvs());
describe('Premium discovery and expiry',()=>{
 it('keeps never-claimed, active and legacy access out of an expired-trial state',()=>{
  expect(premiumExpiry(base)).toBeNull();expect(premiumExpiry({...base,household_premium:true,installation_premium_expired:true})).toBeNull();
  expect(premiumExpiry({...base,household_premium:true,permanent:true})).toBeNull();
 });
 it('uses the authoritative trial flag and separates paid expiry from trial expiry',()=>{
  const trial={...base,installation_premium_expired:true};expect(premiumExpiry(trial)).toBe('trial');expect(premiumExpiryHeading(trial)).toBe('Your Premium trial has ended');
  const paid={...base,household_premium_until:'2020-01-01T00:00:00Z'};expect(premiumExpiry(paid)).toBe('paid');expect(premiumExpiryHeading(paid)).toBe('Your Premium has ended');
  expect(premiumExpiry({...base,household_premium_until:'2099-01-01T00:00:00Z'})).toBeNull();
 });
 it('rejects foreign origins and skips disabled measurement without reading a session',async()=>{
  mocks.origin.mockReturnValue(false);expect((await POST(request(event))).status).toBe(403);
  mocks.origin.mockReturnValue(true);vi.stubEnv('ANALYTICS_ENABLED','false');expect((await POST(request(event))).status).toBe(204);expect(mocks.claims).not.toHaveBeenCalled();
 });
 it('accepts only bounded coarse fields and never lets clients report a verified purchase or assignment',async()=>{
  for(const value of ['{',{...event,amount:5900},{...event,name:'Insurance'},{...event,due_on:'2027-01-01'},{...event,event:'premium_purchase_verified'},{...event,event:'installation_trial_activated'},{...event,variant:'control'},{...event,horizon:300},{...event,insight:'Insurance policy'}])expect((await POST(request(value))).status).toBe(400);
  expect((await POST(request('x'.repeat(1025)))).status).toBe(413);expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it('requires an authenticated account and leaves ownership and consent to the authenticated RPC',async()=>{
  mocks.claims.mockResolvedValue({data:null,error:null});expect((await POST(request(event))).status).toBe(401);expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it('passes a stable retry receipt and server-selected experiment flag without private record identifiers',async()=>{
  expect((await POST(request(event))).status).toBe(204);expect(mocks.rpc).toHaveBeenCalledWith('record_premium_event',{p_id:event.id,p_event:event.event,p_surface:'checkup',p_horizon:30,p_insight:'category',p_experiment:false});
  vi.stubEnv('PREMIUM_DISCOVERY_EXPERIMENT_ENABLED','true');await POST(request(event));expect(mocks.rpc.mock.lastCall?.[1].p_experiment).toBe(true);
 });
 it('keeps optional database failures and offline measurement from interrupting the user task',async()=>{
  mocks.rpc.mockRejectedValue(new Error('offline'));expect((await POST(request(event))).status).toBe(204);
  mocks.rpc.mockResolvedValue({error:{message:'RATE_LIMITED'}});expect((await POST(request(event))).status).toBe(204);
 });
});
