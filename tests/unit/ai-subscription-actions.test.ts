import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),auth:vi.fn(),refresh:vi.fn()}));
vi.mock('next/cache',()=>({revalidatePath:mocks.refresh}));vi.mock('@/lib/auth',()=>({requireUser:mocks.auth}));
import { saveItem } from '@/features/items/actions';
const id='11111111-1111-4111-8111-111111111111';
function form(brand='chatgpt',preset='ai-subscription'){const value=new FormData();for(const [key,text] of Object.entries({id,revision:'2',label:'My AI plan',notes:'',preset,subscription_brand:brand,car_brand:''}))value.set(key,text);return value;}
beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue({supabase:{rpc:mocks.rpc}});mocks.rpc.mockResolvedValue({data:{coverage:'off'},error:null});});
describe('AI subscription save action',()=>{
 it('saves, clears and accepts Other through the existing subscription RPC',async()=>{
  for(const brand of ['chatgpt','','other']){expect(await saveItem(form(brand))).toMatchObject({id});expect(mocks.rpc).toHaveBeenCalledWith('save_subscription_item_with_date',expect.objectContaining({p_subscription_brand:brand,p_preset:'ai-subscription'}));}
 });
 it('rejects out-of-category identities before calling the database',async()=>{
  for(const value of [form('netflix'),form('chatgpt','streaming'),form('../../chatgpt'),form('anytime-fitness')])expect(await saveItem(value)).toHaveProperty('error');
  const conflicting=form();conflicting.set('utility_id','');expect(await saveItem(conflicting)).toHaveProperty('error');expect(mocks.auth).not.toHaveBeenCalled();
 });
 it('keeps server errors recoverable without refreshing or reporting success',async()=>{
  mocks.rpc.mockResolvedValue({error:{message:'CONFLICT'}});expect(await saveItem(form())).toHaveProperty('error');expect(mocks.refresh).not.toHaveBeenCalled();
 });
});
