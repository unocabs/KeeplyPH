import { addIntent, isTemplate } from '@/features/templates';
import { safeReturnPath } from './domain';
import { isProduct, isSlotCount } from '@/features/billing/products';
export function safeAuthIntent(value: string | null | undefined): string {
 const safe=safeReturnPath(value),url=new URL(safe,'https://keeplyph.com');
 const template=url.pathname.split('/')[2];
 if(url.pathname.startsWith('/add/') && isTemplate(template) && url.pathname==='/add/'+template)return addIntent(template,url.searchParams.get('focus') || undefined,url.searchParams.get('category') || undefined,url.searchParams.get('preset') || undefined,url.searchParams.get('renewalDate') || undefined);
 if(url.pathname==='/settings/billing') {
   const query = new URLSearchParams();
   const slots = Number(url.searchParams.get('slots')), product = url.searchParams.get('product') || '';
   if (isSlotCount(slots)) query.set('slots', String(slots));
   if (isProduct(product)) query.set('product', product);
   const payment = url.searchParams.get('payment'), order = url.searchParams.get('order');
   if (['return', 'cancelled'].includes(payment || '') && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order || '')) {
     query.set('payment', payment!); query.set('order', order!);
   }
   return url.pathname + (query.size ? '?' + query.toString() : '');
 }
 if(['/feedback','/dashboard','/add','/items','/purchases','/purchases/new','/settings','/settings/billing','/settings/alerts'].includes(url.pathname))return url.pathname;
 // Opaque record IDs preserve reminder actions across sign-in; ownership is checked on the destination.
 const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
 if(new RegExp('^/items/' + uuid + '$', 'i').test(url.pathname)) {
   const date = url.searchParams.get('date'), action = url.searchParams.get('action');
   const occurrence=url.searchParams.get('occurrence');
   const query = date && new RegExp('^' + uuid + '$','i').test(date) && ['complete','edit'].includes(action || '') ? '?action=' + action + '&date=' + date + (/^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('due') || '') ? '&due=' + url.searchParams.get('due') : '') + (occurrence && new RegExp('^'+uuid+'$','i').test(occurrence) ? '&occurrence='+occurrence : '') : '';
   return url.pathname + query;
 }
 return '/dashboard';
}
