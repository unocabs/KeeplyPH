import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),auth:vi.fn(),refresh:vi.fn()}));
vi.mock('next/cache',()=>({revalidatePath:mocks.refresh}));
vi.mock('@/lib/auth',()=>({requireUser:mocks.auth}));
import { saveItem } from '@/features/items/actions';
const id='11111111-1111-4111-8111-111111111111';
function form(preset='life-insurance',provider='sun-life') {
 const value=new FormData();for(const [key,text] of Object.entries({id,revision:'2',label:'My policy',notes:'',preset,insurer_id:provider,insurer_name:'',car_brand:''}))value.set(key,text);return value;
}
beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue({supabase:{rpc:mocks.rpc}});mocks.rpc.mockResolvedValue({data:{coverage:'off'},error:null});});
describe('insurance provider save actions',()=>{
 it('saves, explicitly clears and normalizes custom providers in the insurance RPC',async()=>{
  const value=form();expect(await saveItem(value)).toMatchObject({id});
  expect(mocks.rpc).toHaveBeenCalledWith('save_insurance_item_with_date',expect.objectContaining({p_insurer_id:'sun-life',p_insurer_name:''}));
  value.set('insurer_id','');await saveItem(value);expect(mocks.rpc).toHaveBeenCalledWith('save_insurance_item_with_date',expect.objectContaining({p_insurer_id:''}));
  value.set('insurer_id','other');value.set('insurer_name','  My provider  ');await saveItem(value);expect(mocks.rpc).toHaveBeenCalledWith('save_insurance_item_with_date',expect.objectContaining({p_insurer_name:'My provider'}));
 });
 it('rejects incompatible identities, competing provider fields and malformed names before writing',async()=>{
  for(const value of [form('life-insurance','maxicare'),form('home-insurance','sun-life'),form('streaming',''),form('life-insurance','../../aia')])expect(await saveItem(value)).toHaveProperty('error');
  const value=form();value.set('insurer_name','Requires Other');expect(await saveItem(value)).toHaveProperty('error');
  value.set('insurer_id','other');value.set('insurer_name','x'.repeat(161));expect(await saveItem(value)).toHaveProperty('error');
  value.set('insurer_name','');value.set('lender_id','');expect(await saveItem(value)).toHaveProperty('error');
  value.delete('lender_id');value.set('car_brand','kia');expect(await saveItem(value)).toHaveProperty('error');
  expect(mocks.auth).not.toHaveBeenCalled();
 });
 it('returns server conflicts without refreshing and keeps legacy saves available',async()=>{
  mocks.rpc.mockResolvedValue({error:{message:'CONFLICT'}});expect(await saveItem(form())).toHaveProperty('error');expect(mocks.refresh).not.toHaveBeenCalled();
  mocks.rpc.mockResolvedValue({error:null,data:{coverage:'off'}});const value=form();value.delete('insurer_id');value.delete('insurer_name');await saveItem(value);
  expect(mocks.rpc).toHaveBeenCalledWith('save_item_with_date',expect.objectContaining({p_preset:'life-insurance'}));
 });
});
