'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Bell, MessageSquare, LayoutDashboard, NotebookTabs, ShieldCheck, Settings, ArrowUpRight, LogOut, LockKeyhole, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { AddItemButton } from './template-picker';
import { Brand } from './brand';
import { signOut } from '@/features/account/actions';
import { AccountAvatar } from './account-avatar';

export function AppShell({ children, name, avatarUrl, alertCoverage, hasExtraSlots, demo = false, signedIn = false }: { children: React.ReactNode; name: string; avatarUrl?: string | null; alertCoverage?: { covered: number; total: number }; hasExtraSlots: boolean; demo?: boolean; signedIn?: boolean }) {
  const pathname = usePathname();
  const filter = useSearchParams().get('filter');
  const [open, setOpen] = useState(false);
  const base = demo ? '/demo' : '';
  const nav = [{ name: 'Overview', href: base + '/dashboard', icon: LayoutDashboard }, { name: 'Household planner', href: base + '/planner', icon: ShieldCheck }, { name: 'Household items', href: base + '/items', icon: NotebookTabs }, { name: 'Important dates', href: base + '/items?filter=dates', icon: ShieldCheck }, { name: 'Alert Options', href: base + '/settings/alerts', icon: Bell }];
  return <div className="app-shell">
    <header className="mobile-header"><Brand href={base + '/dashboard'} /><button className="icon-button" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></header>
    {open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={'sidebar ' + (open ? 'is-open' : '')}>
      <div className="sidebar-brand"><Brand href={base + '/dashboard'} /><span className="workspace-label">YOUR HOUSEHOLD</span></div>
      <nav className="primary-nav" aria-label="Main navigation">{nav.map(item => <Link key={item.name} href={item.href} onClick={() => setOpen(false)} className={'nav-link ' + ((item.name === 'Household planner' && pathname.endsWith('/planner')) || (item.name === 'Alert Options' && pathname.endsWith('/settings/alerts')) || (item.name === 'Overview' && (pathname.endsWith('/dashboard') || pathname === '/demo')) || (item.name === 'Household items' && (pathname.includes('/items') || pathname.includes('/purchases')) && !['dates','upcoming','overdue'].includes(filter || '')) || (item.name === 'Important dates' && pathname.includes('/items') && ['dates','upcoming','overdue'].includes(filter || '')) ? 'active' : '')}><item.icon size={19} /><span>{item.name}</span></Link>)}</nav>
      <div className="sidebar-bottom">
        {!hasExtraSlots && <div className="upgrade-card"><span className="mini-icon"><ShieldCheck size={18} /></span><strong>A little more breathing room</strong><p>Plan the months ahead.<br />Try 30 days when you install.</p><Link href={base + '/settings/billing'}>Explore Premium <ArrowUpRight size={15} /></Link></div>}
        {!demo && <Link href="/feedback" className={'nav-link ' + (pathname === '/feedback' ? 'active' : '')} onClick={() => setOpen(false)}><MessageSquare size={19} aria-hidden="true"/>Add feedback</Link>}
        <Link href={base + '/settings'} className="nav-link" onClick={() => setOpen(false)}><Settings size={19} />Settings</Link>
        <div className="account-row"><AccountAvatar name={name} src={demo ? null : avatarUrl}/><div><strong>{name || 'Your account'}</strong><span>{demo ? 'Sample account' : alertCoverage ? `Alerts on ${alertCoverage.covered} of ${alertCoverage.total} ${alertCoverage.total === 1 ? 'item' : 'items'}` : 'Your account'}</span></div>{!demo && <form action={signOut}><button className="icon-button" aria-label="Sign out"><LogOut size={17} /></button></form>}</div>
      </div>
    </aside>
    <div className="workspace">
      {demo ? <div className="demo-banner">Explore a sample household account. Items and files are fictional; no alerts are sent. <Link href={signedIn ? "/dashboard" : "/login"}>{signedIn ? "Open your account" : "Start your own account"} <ArrowUpRight size={14} /></Link></div> : <div className="workspace-top"><span><LockKeyhole size={13} /> Your household details, kept private</span><span>Made for everyday peace of mind</span></div>}
      <main className="main-content" id="main-content">{children}</main>
      {!pathname.includes('/settings') && !pathname.includes('/add') && !pathname.endsWith('/edit') && !pathname.endsWith('/new') && <AddItemButton demo={demo} floating />}<footer className="app-footer"><span>One less thing to worry about.</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><span>Keeply © {new Date().getFullYear()}</span></div></footer>
    </div>
  </div>;
}
