import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),auth:vi.fn(),refresh:vi.fn()}));
vi.mock('next/cache',()=>({revalidatePath:mocks.refresh}));
vi.mock('@/lib/auth',()=>({requireUser:mocks.auth}));
import { saveItem } from '@/features/items/actions';
const id='11111111-1111-4111-8111-111111111111';
function form(preset='electric-bill',provider='meralco') {
 const value=new FormData();for(const [key,text] of Object.entries({id,revision:'2',label:'My bill',notes:'',preset,utility_id:provider,utility_name:'',car_brand:''}))value.set(key,text);return value;
}
beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue({supabase:{rpc:mocks.rpc}});mocks.rpc.mockResolvedValue({data:{coverage:'off'},error:null});});
describe('utility biller save actions',()=>{
 it('saves, explicitly clears and normalizes custom providers in the utility RPC',async()=>{
  const value=form();expect(await saveItem(value)).toMatchObject({id});
  expect(mocks.rpc).toHaveBeenCalledWith('save_utility_item_with_date',expect.objectContaining({p_utility_id:'meralco',p_utility_name:''}));
  value.set('utility_id','');await saveItem(value);expect(mocks.rpc).toHaveBeenCalledWith('save_utility_item_with_date',expect.objectContaining({p_utility_id:''}));
  value.set('utility_id','other');value.set('utility_name','  My provider  ');await saveItem(value);expect(mocks.rpc).toHaveBeenCalledWith('save_utility_item_with_date',expect.objectContaining({p_utility_name:'My provider'}));
 });
 it('rejects incompatible identities, competing provider fields and malformed names before writing',async()=>{
  for(const value of [form('electric-bill','pldt'),form('water-bill','meralco'),form('streaming',''),form('electric-bill','../../globe')])expect(await saveItem(value)).toHaveProperty('error');
  const value=form();value.set('utility_name','Requires Other');expect(await saveItem(value)).toHaveProperty('error');
  value.set('utility_id','other');value.set('utility_name','x'.repeat(161));expect(await saveItem(value)).toHaveProperty('error');
  value.set('utility_name','');value.set('lender_id','');expect(await saveItem(value)).toHaveProperty('error');
  value.delete('lender_id');value.set('car_brand','kia');expect(await saveItem(value)).toHaveProperty('error');
  expect(mocks.auth).not.toHaveBeenCalled();
 });
 it('returns server conflicts without refreshing and keeps legacy saves available',async()=>{
  mocks.rpc.mockResolvedValue({error:{message:'CONFLICT'}});expect(await saveItem(form())).toHaveProperty('error');expect(mocks.refresh).not.toHaveBeenCalled();
  mocks.rpc.mockResolvedValue({error:null,data:{coverage:'off'}});const value=form();value.delete('utility_id');value.delete('utility_name');await saveItem(value);
  expect(mocks.rpc).toHaveBeenCalledWith('save_item_with_date',expect.objectContaining({p_preset:'electric-bill'}));
 });
});
