'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { CalendarDays, CircleAlert, Wallet, FolderOpen } from 'lucide-react';
import styles from './dashboard.module.css';

const sections = [
  { id: 'coming-up', label: 'Coming up', short: 'Coming up', icon: CalendarDays },
  { id: 'needs-a-check', label: 'Needs a check', short: 'To check', icon: CircleAlert },
  { id: 'plan-and-organise', label: 'Plan & organise', short: 'Plan', icon: Wallet },
  { id: 'saved-records', label: 'Saved records', short: 'Records', icon: FolderOpen },
];

export function DashboardSectionLink({ section, pathname, children, ...props }: Omit<ComponentProps<'a'>, 'href' | 'onClick'> & { section: string; pathname: string }) {
  return <a {...props} href={pathname + '#' + section} onClick={event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(section);
    if (!target) return;
    event.preventDefault();
    // Use Next's supported native history integration. Its hash-only Link
    // navigation can duplicate fragments in this installed release.
    if (window.location.hash !== '#' + section) window.history.pushState(null, '', pathname + '#' + section);
    const heading = target.matches('h2,h3') ? target : target.querySelector<HTMLElement>('h2,h3');
    heading?.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });
  }}>{children}</a>;
}

export function DashboardNavigation({ hasPlan, pathname }: { hasPlan: boolean; pathname: string }) {
  const [current, setCurrent] = useState('coming-up');
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const boundary = (nav.current?.getBoundingClientRect().bottom ?? 0) + 32;
      const available = sections.filter(section => document.getElementById(section.id));
      let active = available[0]?.id ?? 'coming-up';
      for (const section of available) {
        if (document.getElementById(section.id)!.getBoundingClientRect().top <= boundary) active = section.id;
      }
      setCurrent(active);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    const dashboard = nav.current?.parentElement;
    if (dashboard) observer.observe(dashboard);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
    };
  }, [hasPlan]);

  return <nav ref={nav} className={styles.sectionNav} aria-label="On this page">
    {sections.filter(section => hasPlan || section.id !== 'plan-and-organise').map(({ id, label, short, icon: Icon }) =>
      <DashboardSectionLink key={id} section={id} pathname={pathname} aria-label={label} aria-current={current === id ? 'location' : undefined}>
        <Icon size={17} aria-hidden="true" /><span className={styles.navLabel}>{label}</span><span className={styles.navShort} aria-hidden="true">{short}</span>
      </DashboardSectionLink>)}
  </nav>;
}
