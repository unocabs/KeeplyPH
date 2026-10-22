import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleSpendingCheckup } from '@/features/premium/checkup';

const mocks=vi.hoisted(()=>({requireUser:vi.fn(),rpc:vi.fn(),from:vi.fn(),identities:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/auth',()=>({requireUser:mocks.requireUser}));
import { getSpendingCheckup } from '@/features/items/queries';

beforeEach(()=>{
 vi.resetAllMocks();
 mocks.requireUser.mockResolvedValue({supabase:{rpc:mocks.rpc,from:mocks.from},userId:'household'});
 const chain={select:()=>chain,eq:()=>chain,in:mocks.identities};
 mocks.from.mockReturnValue(chain);
});

describe('Checkup read recovery',()=>{
 it('keeps a valid empty plan distinct from a failed or missing response',async()=>{
   const plan=sampleSpendingCheckup([],'2026-10-23');
   mocks.rpc.mockResolvedValueOnce({data:plan,error:null});
   expect(await getSpendingCheckup()).toMatchObject({total:0,rows:[]});
   mocks.rpc.mockResolvedValueOnce({data:null,error:{message:'Service unavailable'}});
   expect(await getSpendingCheckup()).toEqual({status:'unavailable'});
   mocks.rpc.mockResolvedValueOnce({data:null,error:null});
   expect(await getSpendingCheckup()).toEqual({status:'unavailable'});
 });
 it('recovers a rejected network request without manufacturing an empty plan',async()=>{
   mocks.rpc.mockRejectedValue(new Error('Network request failed'));
   expect(await getSpendingCheckup()).toEqual({status:'unavailable'});
 });
 it('preserves entitlement changes and authentication redirects',async()=>{
   mocks.rpc.mockResolvedValueOnce({data:null,error:{message:'PREMIUM_REQUIRED'}});
   expect(await getSpendingCheckup()).toBeNull();
   const redirect=new Error('NEXT_REDIRECT');mocks.requireUser.mockRejectedValueOnce(redirect);
   await expect(getSpendingCheckup()).rejects.toBe(redirect);
 });
 it('recovers failed identity reads rather than silently dropping item artwork',async()=>{
   const plan=sampleSpendingCheckup([],'2026-10-23');
   mocks.rpc.mockResolvedValue({data:{...plan,rows:[{item_id:'item'}]},error:null});
   mocks.identities.mockResolvedValue({data:null,error:{message:'Service unavailable'}});
   expect(await getSpendingCheckup()).toEqual({status:'unavailable'});
 });
 it('retries a stale date filter while preserving the requested category and range',async()=>{
   const plan=sampleSpendingCheckup([],'2026-10-23');
   mocks.rpc.mockResolvedValueOnce({data:null,error:{message:'INVALID_INPUT'}}).mockResolvedValueOnce({data:plan,error:null});
   expect(await getSpendingCheckup({week:'2000-01-01',category:'bills',mode:'30'})).toMatchObject({total:0});
   expect(mocks.rpc).toHaveBeenLastCalledWith('household_checkup_plan',expect.objectContaining({p_week:null,p_before:null,p_before_id:null,p_category:'bills',p_mode:'30'}));
 });
});
