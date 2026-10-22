import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleSpendingCheckup } from '@/features/premium/checkup';
import { sampleItems } from '@/lib/demo';

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
 it('restores existing 30-day records when only the new RPC is missing, with item artwork and no unsupported capabilities',async()=>{
   const records=sampleItems('2026-10-23'),plan=sampleSpendingCheckup(records,'2026-10-23');
   mocks.rpc.mockResolvedValueOnce({data:null,error:{code:'PGRST202',message:'Could not find the function public.household_checkup_plan in the schema cache'}})
     .mockResolvedValueOnce({data:{...plan,mode:'payday',saved_payday:'2026-11-01',comparison:{status:'first_use'}},error:null});
   mocks.identities.mockResolvedValue({data:records,error:null});
   const result=await getSpendingCheckup({mode:'payday',view:'changes',category:'bills'});
   expect(result).toMatchObject({availability:'30_day_only',total:plan.total,ends_on:plan.ends_on,mode:undefined,comparison:undefined,saved_payday:undefined});
   expect(mocks.rpc).toHaveBeenLastCalledWith('household_spending_checkup',{p_week:null,p_category:'bills',p_before:null,p_before_id:null});
   expect(result&&'rows' in result?result.rows.map(row=>row.identity?.product_name):[]).toEqual(plan.rows.map(row=>row.product_name));
 });
 it.each([
   {code:'42501',message:'Permission denied'},
   {code:'XX000',message:'Database error'},
   {code:'PGRST202',message:'Could not find the function public.other_function'},
 ])('does not mask unrelated errors with a different planning scope: $code $message',async error=>{
   mocks.rpc.mockResolvedValue({data:null,error});
   expect(await getSpendingCheckup({mode:'payday'})).toEqual({status:'unavailable'});
   expect(mocks.rpc).toHaveBeenCalledOnce();
 });
 it('revalidates a stale extended-period bookmark through the legacy RPC',async()=>{
   mocks.rpc.mockResolvedValueOnce({data:null,error:{code:'PGRST202',message:'household_checkup_plan missing'}})
     .mockResolvedValueOnce({data:null,error:{message:'INVALID_INPUT'}})
     .mockResolvedValueOnce({data:sampleSpendingCheckup([],'2026-10-23'),error:null});
   expect(await getSpendingCheckup({week:'2027-01-01',category:'bills',before:'2027-01-02',id:'old-cursor',mode:'payday'})).toMatchObject({availability:'30_day_only',total:0});
   expect(mocks.rpc).toHaveBeenLastCalledWith('household_spending_checkup',{p_week:null,p_category:'bills',p_before:null,p_before_id:null});
 });
 it.each([
   [{code:'PGRST202',message:'household_spending_checkup missing'},{status:'unavailable'}],
   [{message:'PREMIUM_REQUIRED'},null],
 ])('preserves an unavailable or expired legacy result',async(error,expected)=>{
   mocks.rpc.mockResolvedValueOnce({data:null,error:{code:'PGRST202',message:'household_checkup_plan missing'}})
     .mockResolvedValueOnce({data:null,error});
   expect(await getSpendingCheckup()).toEqual(expected);
 });
});
