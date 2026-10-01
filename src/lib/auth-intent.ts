import { addIntent, isTemplate } from '@/features/templates';
import { safeReturnPath } from './domain';
export function safeAuthIntent(value: string | null | undefined): string {
 const safe=safeReturnPath(value),url=new URL(safe,'https://keeplyph.com');
 const template=url.pathname.split('/')[2];
 if(url.pathname.startsWith('/add/') && isTemplate(template) && url.pathname==='/add/'+template)return addIntent(template,url.searchParams.get('focus') || undefined,url.searchParams.get('category') || undefined,url.searchParams.get('preset') || undefined,url.searchParams.get('renewalDate') || undefined);
 if(['/feedback','/dashboard','/add','/items','/purchases','/purchases/new','/settings','/settings/billing','/settings/alerts'].includes(url.pathname))return url.pathname;
 // Opaque record IDs preserve reminder actions across sign-in; ownership is checked on the destination.
 const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
 if(new RegExp('^/items/' + uuid + '$', 'i').test(url.pathname)) {
   const date = url.searchParams.get('date'), action = url.searchParams.get('action');
   const query = date && new RegExp('^' + uuid + '$','i').test(date) && ['complete','edit'].includes(action || '') ? '?action=' + action + '&date=' + date + (/^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('due') || '') ? '&due=' + url.searchParams.get('due') : '') : '';
   return url.pathname + query;
 }
 return '/dashboard';
}
