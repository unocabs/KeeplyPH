import { addIntent, isTemplate } from '@/features/templates';
import { safeReturnPath } from './domain';
export function safeAuthIntent(value: string | null | undefined): string {
 const safe=safeReturnPath(value),url=new URL(safe,'https://keeplyph.com');
 const template=url.pathname.split('/')[2];
 if(url.pathname.startsWith('/add/') && isTemplate(template) && url.pathname==='/add/'+template)return addIntent(template,url.searchParams.get('focus') || undefined,url.searchParams.get('category') || undefined);
 if(['/dashboard','/add','/items','/purchases','/purchases/new','/settings','/settings/billing'].includes(url.pathname))return url.pathname;
 // Private record identifiers are not needed in the provider redirect.
 return '/dashboard';
}
