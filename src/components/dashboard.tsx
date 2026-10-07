'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Bell, CalendarDays, ReceiptText, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { type Usage } from '@/lib/domain';
import { dateRows, comingUp, itemsForCategory, itemMatchesCategory, isActiveReminder, type ItemWithDetails } from '@/features/items/domain';
import { reminderCategories } from '@/features/templates/categories';
import { ItemCard, ItemDateRow, categoryLabel } from './item-ui';
import { TemplateIcon } from './reminder-icon';
import { AddItemButton } from './template-picker';
import { HeroReminders } from './hero-reminders';
import { UpcomingTimeline } from './upcoming-timeline';
import { timelineRows } from '@/features/items/timeline';
import styles from './dashboard.module.css';

function ActiveReminderValue({ count }: { count: number }) {
  const value = useRef<HTMLElement>(null);
  const [fits, setFits] = useState(false);
  useEffect(() => {
    const element = value.current;
    if (!element) return;
    const measure = () => {
      const number = element.firstElementChild as HTMLElement;
      const suffix = element.lastElementChild as HTMLElement;
      setFits(number.getBoundingClientRect().width + suffix.getBoundingClientRect().width + 4 <= element.clientWidth);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(element.firstElementChild!);
    observer.observe(element.lastElementChild!);
    measure();
    return () => observer.disconnect();
  }, [count]);
  return <strong ref={value} className={styles.activeValue} aria-label={`${count} active reminders / unlimited`}><span aria-hidden="true">{count}</span><small aria-hidden="true" className={styles.unlimited + (fits ? ' ' + styles.fits : '')}>/ unlimited</small></strong>;
}

export function Dashboard({ items, usage, name, today, demo = false, setup }: { items: ItemWithDetails[]; usage: Usage; name: string; today: string; demo?: boolean; setup?: ReactNode }) {
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('recent');
  const base = demo ? '/demo' : '';
  const active = items.filter(isActiveReminder);
  const matched = itemsForCategory(active, category);
  const rows = dateRows(matched);
  const soon = comingUp(rows, today);
  const future = rows.filter(row => row.occurrence.due_on >= today).slice(0, 5);
  const near = future.filter(row => soon.includes(row));
  const later = future.filter(row => !soon.includes(row));
  const overdueRows = rows.filter(row => row.occurrence.due_on < today).slice(0, 3);
  const allRows = dateRows(active);
  const timeline = timelineRows(active, today);
  const overdue = category === 'all' ? usage.overdue ?? allRows.filter(row => row.occurrence.due_on < today).length : rows.filter(row => row.occurrence.due_on < today).length;
  const completePreview = demo || usage.active_reminders === active.length;
  const categories = reminderCategories.filter(group => active.some(item => itemMatchesCategory(item, group.key)));
  const browseQuery = category === 'all' ? '' : '&template=' + encodeURIComponent('category:' + category);
  const nextDue = (item: ItemWithDetails) => dateRows([item])[0]?.occurrence.due_on ?? '9999-12-31';
  const sorted = [...matched].sort((a, b) => sort === 'due' ? nextDue(a).localeCompare(nextDue(b)) || b.created_at.localeCompare(a.created_at) : b.created_at.localeCompare(a.created_at));

  // Use the account-wide saved count so archived reminders do not trigger onboarding.
  if (!demo && usage.purchases === 0 && items.length === 0) return <div className={styles.dashboard}>
    <section className={styles.welcome} aria-labelledby="welcome-heading">
      <span className={styles.welcomeIcon}><Bell size={28} aria-hidden="true" /></span>
      <div className="eyebrow">A LITTLE LESS TO REMEMBER</div>
      <h1 id="welcome-heading">Welcome to Keeply.</h1>
      <h2>What’s one date you don’t want to forget?</h2>
      <p>Start with a bill, car renewal, or passport expiry. Choose a type, add a date, and decide when to be reminded.</p>
      <div className={styles.welcomeActions}>
        <AddItemButton label="Add my first reminder" />
        <Link className="text-button" href="/demo">Explore a sample account <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <p className={styles.welcomeFootnote}>Save unlimited reminders. Get alerts for {3 + (usage.bonus_slots ?? 0)} reminders free.</p>
    </section>
    {setup}
    <p className="privacy-note"><ShieldCheck size={15} aria-hidden="true" />Your reminders and files are private to your account.</p>
  </div>;

  return <div className={styles.dashboard}>
    {timeline.length ? <UpcomingTimeline rows={timeline} today={today} base={base} /> : <div className={'page-heading ' + styles.hero}>
      <HeroReminders variant="dashboard" />
      <div><div className="eyebrow">A LITTLE LESS TO REMEMBER</div><h1>Everything in its place.</h1><p>Welcome back, {name.split(' ')[0] || 'there'}. A little peace of mind, all together.</p></div>
      <AddItemButton demo={demo} />
    </div>}
    {setup}
    <div className={styles.filters} role="group" aria-label="Filter overview by category">
      <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}><LayoutDashboard size={18} aria-hidden="true" />All{completePreview && <span>{active.length}</span>}</button>
      {categories.map(group => {
        const selected = category === group.key;
        const label = categoryLabel(group.key);
        const count = active.filter(item => itemMatchesCategory(item, group.key)).length;
        return <button key={group.key} type="button" className={selected ? undefined : styles.iconFilter} aria-label={label + (completePreview ? `, ${count} reminders` : '')} title={label} aria-pressed={selected} onClick={() => setCategory(group.key)}><TemplateIcon template="other" group={group.key} size={18} />{selected && label}{completePreview && <span aria-hidden="true">{count}</span>}</button>;
      })}
    </div>
    {['maintenance', 'insurance'].includes(category) && <p className="hint space-bottom">Showing {category === 'maintenance' ? 'maintenance' : 'insurance'} dates across your reminders. Each reminder stays in its original category.</p>}
    <div className={'stat-grid ' + styles.stats}>
      <Link href={base + '/items'} className="stat-card"><span className="stat-icon violet"><ReceiptText size={21} /></span><div><span>Active reminders</span><ActiveReminderValue count={usage.active_reminders ?? active.length} /><p>Your current reminders</p></div></Link>
      <Link href={base + '/items?filter=reminders'} className="stat-card"><span className="stat-icon green"><Bell size={21} /></span><div><span>Alert coverage</span><strong>{usage.reminders}<small> / {usage.slot_limit ?? 3}</small></strong><p>Alert slots in use</p></div></Link>
      <Link href={base + '/items?filter=upcoming'} className="stat-card"><span className="stat-icon amber"><CalendarDays size={21} /></span><div><span>Coming up</span><strong>{usage.upcoming ?? comingUp(allRows, today).length}</strong><p>Next 30 days</p></div></Link>
    </div>
    <section className={'panel ' + styles.dates} aria-labelledby="upcoming-heading">
      <div className="section-heading"><div><h2 id="upcoming-heading">Upcoming</h2><p className="section-description">Important dates, with room to plan ahead.</p></div><Link href={base + '/items?filter=dates' + browseQuery}>View all <ArrowRight size={15} /></Link></div>
      {overdue > 0 && <div className="alert error spaced"><Link href={base + '/items?filter=overdue' + browseQuery}>{overdue} overdue or expired {overdue === 1 ? 'date' : 'dates'} — review →</Link></div>}
      {overdueRows.length > 0 && <div className={styles.overdueDates}><h3>Needs attention</h3><div className={styles.rows}>{overdueRows.map(row => <ItemDateRow key={row.date.id} row={row} today={today} base={base} compact />)}</div></div>}
      <div className={styles.rows}>{near.map(row => <ItemDateRow key={row.date.id} row={row} today={today} base={base} compact />)}</div>
      {!near.length && <p className={styles.empty}>Nothing due in the next 30 days{category !== 'all' ? ' in this category' : ''}.</p>}
      {!future.length && <Link className="text-button spaced" href={base + '/add'}>Add an important date →</Link>}
    </section>
    {later.length > 0 && <section className={'panel ' + styles.dates} aria-labelledby="later-heading"><div className="section-heading"><div><h2 id="later-heading">Later</h2><p className="section-description">For the bigger dates ahead.</p></div></div><div className={styles.rows}>{later.map(row => <ItemDateRow key={row.date.id} row={row} today={today} base={base} compact />)}</div></section>}
    <section className={styles.library} aria-labelledby="all-reminders-heading">
      <div className={'section-heading ' + styles.libraryHeading}><div><h2 id="all-reminders-heading">All reminders</h2><p className="section-description">Your recently added reminders.</p></div><label className={styles.sort}><span className="sr-only">Sort overview reminders</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="recent">Recently added</option><option value="due">Due soon</option></select></label></div>
      <div className={'purchase-grid ' + styles.cards}>{sorted.slice(0, 6).map(item => <ItemCard key={item.id} item={item} base={base} today={today} compact />)}</div>
      {!matched.length && <p className={styles.empty}>{active.length ? 'No reminders in this category.' : 'Add your first reminder. A name is a good start.'}</p>}
      <div className={styles.browse}><p>{completePreview && matched.length <= 6 ? 'Everything in this overview, ready when you need it.' : 'This overview shows a selection of your reminders.'}</p><Link href={base + '/items' + (browseQuery ? '?' + browseQuery.slice(1) : '')}>Browse all reminders <ArrowRight size={15} /></Link></div>
    </section>
    <p className="privacy-note"><ShieldCheck size={15} />Your reminders and files are private to your account.</p>
  </div>;
}
