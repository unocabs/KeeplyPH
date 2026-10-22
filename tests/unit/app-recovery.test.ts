import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ErrorPage from '@/app/(app)/error';
import CheckupLoading from '@/app/(app)/checkup/loading';
import { AppLoadError } from '@/components/app-load-error';

const { pathname }=vi.hoisted(()=>({pathname:vi.fn()}));
vi.mock('next/navigation',()=>({usePathname:pathname,useRouter:()=>({refresh:vi.fn()})}));

describe('Household page recovery',()=>{
 it.each(['/checkup','/planner'])('keeps a failed %s read distinct from an empty account',path=>{
   pathname.mockReturnValue(path);
   const html=renderToStaticMarkup(createElement(ErrorPage,{retry:vi.fn()}));
   expect(html).toContain('Let’s give that another try');expect(html).toContain('This doesn’t mean your saved records are empty.');
   expect(html).toContain('There’s no need to add them again.');expect(html).toContain('href="/items/payments"');expect(html).toContain('Try again');
   expect(html).toContain('Why isn’t anything showing?');expect(html).toContain('We don’t have a more specific cause to show here.');
   expect(html).not.toContain('href="/add');expect(html).not.toContain('not enough');
 });
 it('explains a failed read without claiming the account has no records',()=>{
   const html=renderToStaticMarkup(createElement(AppLoadError,{planning:true,readFailure:true}));
   expect(html).toContain('couldn’t retrieve all the information needed');expect(html).toContain('incomplete total');
   expect(html).not.toContain('We don’t have a more specific cause');expect(html).not.toMatch(/offline|no internet|server is down|no records saved/i);
 });
 it('provides a relevant fallback outside planning pages',()=>{
   pathname.mockReturnValue('/settings');
   const html=renderToStaticMarkup(createElement(ErrorPage,{retry:vi.fn()}));
   expect(html).toContain('href="/items"');expect(html).not.toContain('your household plan');
 });
 it('announces loading without showing made-up totals or an empty-account prompt',()=>{
   const html=renderToStaticMarkup(createElement(CheckupLoading));
   expect(html).toContain('role="status"');expect(html).toContain('Getting your checkup ready');
   expect(html).toContain('the totals and timeline aren’t ready to show yet');
   expect(html).not.toContain('₱0');expect(html).not.toContain('href="/add');
 });
});
