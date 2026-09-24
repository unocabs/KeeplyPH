import { todayIn, type PurchaseWithDetails } from './domain';
export function samplePurchases(): PurchaseWithDetails[] {
  const today = todayIn();
  const date = (offset: number) => new Date(Date.parse(today + 'T00:00:00Z') + offset * 86400000).toISOString().slice(0, 10);
  const samples = [
    { id: '11111111-1111-4111-8111-111111111111', name: 'Sony WH-1000XM5', category: 'electronics', store: 'Sony Store · SM Megamall', price: 1699900, bought: -354, expiry: 11 },
    { id: '22222222-2222-4222-8222-222222222222', name: 'De’Longhi Dedica', category: 'appliances', store: 'Abenson', price: 1899500, bought: -342, expiry: 23 },
    { id: '33333333-3333-4333-8333-333333333333', name: 'IKEA TERTIAL lamp', category: 'home', store: 'IKEA Pasay City', price: 99000, bought: -3, expiry: null },
    { id: '44444444-4444-4444-8444-444444444444', name: 'MacBook Air 13-inch', category: 'electronics', store: 'Power Mac Center', price: 6499000, bought: -50, expiry: 315 },
    { id: '55555555-5555-4555-8555-555555555555', name: 'Uniqlo everyday jacket', category: 'clothing', store: 'Uniqlo', price: 249000, bought: -8, expiry: null },
    { id: '66666666-6666-4666-8666-666666666666', name: 'Samsung washing machine', category: 'appliances', store: 'SM Appliance', price: 2399500, bought: -75, expiry: 290 },
    { id: '77777777-7777-4777-8777-777777777777', name: 'Logitech MX Master 3S', category: 'electronics', store: 'DataBlitz', price: 599500, bought: -92, expiry: 273 },
    { id: '88888888-8888-4888-8888-888888888888', name: 'Anker power bank', category: 'electronics', store: 'Anker Philippines', price: 299500, bought: -410, expiry: -45 },
  ];
  return samples.map((s, index) => ({
    id: s.id, user_id: 'sample', state: 'saved', product_name: s.name, purchased_on: date(s.bought),
    merchant: s.store, price_minor: s.price, currency: 'PHP', category: s.category as PurchaseWithDetails['category'],
    notes: 'This is a sample purchase. Your real purchases and documents are private.', revision: 1,
    created_at: date(-index) + 'T09:00:00Z', updated_at: date(-index) + 'T09:00:00Z', documents: [],
    warranty: s.expiry === null ? null : { id: s.id, purchase_id: s.id, user_id: 'sample', starts_on: date(s.bought), expires_on: date(s.expiry), serial_number: null, notes: null,
      reminders_enabled: s.expiry > 0 && s.expiry < 30, reminders_enabled_at: date(s.bought) + 'T09:00:00Z', reminder_disabled_reason: null, created_at: date(s.bought) + 'T09:00:00Z', updated_at: date(s.bought) + 'T09:00:00Z' },
  }));
}

export function sampleItems(): import('@/features/items/domain').ItemWithDetails[] {
  const purchases = samplePurchases().slice(0,4);
  const items: import('@/features/items/domain').ItemWithDetails[] = purchases.map(p => ({ ...p, template_key: 'receipt', template_version: 1, archived_at: null,
    dates: p.warranty ? [{ ...p.warranty, item_id:p.id, kind:'warranty',label:'Warranty',interval_months:null,revision:1,
      offsets:[30,7,1].map(value => ({unit:'days',value})), occurrences:[{id:p.id,date_id:p.warranty.id,user_id:'sample',cycle:1,due_on:p.warranty.expires_on,status:'open',completed_on:null,created_at:p.created_at}] }] : [] }));
  const today=todayIn();
  const examples = [
    ['99999999-9999-4999-8999-999999999999','car','Toyota Vios','registration','Registration',27],
    ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','passport','My passport','expiration','Expiration',244],
    ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','licence','Driver’s Licence','expiration','Expiration',400],
    ['cccccccc-cccc-4ccc-8ccc-cccccccccccc','aircon','Bedroom aircon','service','Aircon cleaning',-3],
  ] as const;
  for(const [id,template,name,kind,label,days] of examples){const due=new Date(Date.parse(today+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);items.push({...purchases[0],id,product_name:name,merchant:null,price_minor:null,category:null,purchased_on:null,template_key:template,template_version:1,archived_at:null,notes:'Illustrative sample only. Your own items are private.',documents:[],dates:[{id,item_id:id,user_id:'sample',kind,label,starts_on:null,serial_number:null,notes:null,reminders_enabled:template==='car',reminders_enabled_at:null,reminder_disabled_reason:null,interval_months:template==='aircon'?6:null,revision:1,created_at:'',updated_at:'',offsets:template==='passport'?[12,6,3].map(value=>({unit:'months',value})):[30,7,1].map(value=>({unit:'days',value})),occurrences:[{id,date_id:id,user_id:'sample',cycle:1,due_on:due,status:'open',completed_on:null,created_at:''}]}]});}
  return items.map((item,index)=>({...item,coverage: [0,1,4].includes(index)?'covered':'off'}));
}
