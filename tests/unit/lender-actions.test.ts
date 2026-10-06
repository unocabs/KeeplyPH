import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),auth:vi.fn(),refresh:vi.fn()}));
vi.mock('next/cache',()=>({revalidatePath:mocks.refresh}));
vi.mock('@/lib/auth',()=>({requireUser:mocks.auth}));
import { saveItem } from '@/features/items/actions';
const id='11111111-1111-4111-8111-111111111111';
function form(preset='personal-loan',lender='bpi') {
 const value=new FormData();for(const [key,text] of Object.entries({id,revision:'2',label:'My payment',notes:'',preset,lender_id:lender,lender_name:'',car_brand:''}))value.set(key,text);return value;
}
beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue({supabase:{rpc:mocks.rpc}});mocks.rpc.mockResolvedValue({data:{coverage:'off'},error:null});});
describe('lender save actions',()=>{
 it('saves lender and vehicle selections in one RPC, clears explicitly, and normalizes custom names',async()=>{
  const value=form('car-loan','bpi');value.set('car_brand','kia');expect(await saveItem(value)).toMatchObject({id});
  expect(mocks.rpc).toHaveBeenCalledWith('save_loan_item_with_date',expect.objectContaining({p_lender_id:'bpi',p_car_brand:'kia',p_motorcycle_brand:null}));
  value.set('lender_id','');await saveItem(value);expect(mocks.rpc).toHaveBeenCalledWith('save_loan_item_with_date',expect.objectContaining({p_lender_id:''}));
  value.set('lender_id','other');value.set('lender_name','  My credit union  ');await saveItem(value);expect(mocks.rpc).toHaveBeenCalledWith('save_loan_item_with_date',expect.objectContaining({p_lender_name:'My credit union'}));
 });
 it('rejects incompatible lenders and custom names before authentication or database writes',async()=>{
  for(const value of [form('personal-loan','sumisho'),form('streaming','bpi'),form('home-loan','unknown')])expect(await saveItem(value)).toHaveProperty('error');
  const value=form();value.set('lender_name','Must use Other');expect(await saveItem(value)).toHaveProperty('error');
  value.set('lender_id','other');value.set('lender_name','x'.repeat(161));expect(await saveItem(value)).toHaveProperty('error');
  expect(mocks.auth).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it('reports save errors without refreshing or claiming success',async()=>{
  mocks.rpc.mockResolvedValue({error:{message:'CONFLICT'}});expect(await saveItem(form())).toEqual({error:'This reminder changed in another window. Reload before saving.'});expect(mocks.refresh).not.toHaveBeenCalled();
 });
});
