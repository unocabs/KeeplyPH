import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),auth:vi.fn(),refresh:vi.fn()}));vi.mock('next/cache',()=>({revalidatePath:mocks.refresh}));vi.mock('@/lib/auth',()=>({requireUser:mocks.auth}));
import { savePurchase } from '@/features/purchases/actions';
const id='11111111-1111-4111-8111-111111111111';
function form(type:string|undefined='earbuds',category='electronics'){const data=new FormData();for(const [k,v]of Object.entries({id,revision:'1',product_name:'My purchase',category,price:''}))data.set(k,v);if(type!==undefined)data.set('product_type',type);return data;}
beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue({supabase:{rpc:mocks.rpc}});mocks.rpc.mockResolvedValue({data:{coverage:'off'},error:null});});
describe('purchase type saving',()=>{
 it('saves explicit, automatic and neutral choices through the atomic purchase RPC',async()=>{for(const type of ['earbuds','','category']){expect(await savePurchase(form(type))).toMatchObject({id});expect(mocks.rpc).toHaveBeenCalledWith('save_purchase',expect.objectContaining({p_data:expect.objectContaining({product_type:type}),p_warranty:null}));}expect(mocks.refresh).toHaveBeenCalledWith('/items');expect(mocks.refresh).toHaveBeenCalledWith('/items/'+id);});
 it('retains omission for older clients, and rejects unknown or incompatible types before authentication',async()=>{for(const [type,category]of [['earbuds','appliances'],['shirt','electronics'],['../../camera','electronics']])expect(await savePurchase(form(type,category))).toHaveProperty('error');expect(mocks.auth).not.toHaveBeenCalled();const old=form();old.delete('product_type');await savePurchase(old);expect(mocks.rpc.mock.calls[0][1].p_data).not.toHaveProperty('product_type');});
 it('reports save errors without success or refreshing',async()=>{mocks.rpc.mockResolvedValue({error:{message:'CONFLICT'}});expect(await savePurchase(form())).toHaveProperty('error');expect(mocks.refresh).not.toHaveBeenCalled();});
});
