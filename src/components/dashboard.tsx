'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ArrowRight, Bell, CalendarDays, CheckCircle2, CircleAlert, ReceiptText, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { formatDate, type Usage } from '@/lib/domain';
import type { UnconfirmedSummary } from '@/features/items/activity';
import { dateRows, comingUp, itemsForCategory, itemMatchesCategory, isActiveReminder, type ItemWithDetails } from '@/features/items/domain';
import { reminderCategories } from '@/features/templates/categories';
import { ItemCard, ItemDateRow, categoryLabel } from './item-ui';
import { TemplateIcon } from './reminder-icon';
import { AddItemButton } from './template-picker';
import { UpcomingTimeline } from './upcoming-timeline';
import styles from './dashboard.module.css';
import { HouseholdInsightCards } from './household-insights';
import type { HouseholdInsights } from '@/features/items/insights';

export function Dashboard({ items, usage, name, today, demo = false, setup, unconfirmed, insights }: { items: ItemWithDetails[]; usage: Usage; name: string; today: string; demo?: boolean; setup?: ReactNode; unconfirmed?: UnconfirmedSummary; insights?: HouseholdInsights }) {
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('recent');
  const [view, setView] = useState<'list' | 'calendar'>('calendar');
  const [expanded, setExpanded] = useState(false);
  const base = demo ? '/demo' : '';
  const active = items.filter(isActiveReminder);
  const matched = itemsForCategory(active, category);
  const allRows = dateRows(active);
  const upcoming = comingUp(allRows, today);
  const overdueRows = allRows.filter(row => row.occurrence.due_on < today);
  const overdue = usage.overdue ?? overdueRows.length;
  const unresolved = unconfirmed?.total ?? 0;
  const completePreview = demo || usage.active_reminders === active.length;
  const categories = reminderCategories.filter(group => active.some(item => itemMatchesCategory(item, group.key)));
  const browseQuery = category === 'all' ? '' : '?template=' + encodeURIComponent('category:' + category);
  const nextDue = (item: ItemWithDetails) => dateRows([item])[0]?.occurrence.due_on ?? '9999-12-31';
  const sorted = [...matched].sort((a, b) => sort === 'due' ? nextDue(a).localeCompare(nextDue(b)) || b.created_at.localeCompare(a.created_at) : b.created_at.localeCompare(a.created_at));

  if (!demo && usage.purchases === 0 && items.length === 0) return <div className={styles.dashboard}>
    <section className={styles.welcome} aria-labelledby="welcome-heading">
      <span className={styles.welcomeIcon}><ReceiptText size={28} aria-hidden="true" /></span>
      <div className="eyebrow">YOUR HOUSEHOLD, ORGANISED</div><h1 id="welcome-heading">Welcome to Keeply.</h1>
      <h2>What would you like to organise first?</h2>
      <p>Start with a bill, appliance warranty or home service. Save a name now, add details when you have them, and choose whether you want alerts.</p>
      <div className={styles.welcomeActions}><AddItemButton label="Add my first item" /><Link className="text-button" href="/demo">Explore a sample account <ArrowRight size={16} aria-hidden="true" /></Link></div>
      <p className={styles.welcomeFootnote}>Save unlimited items. Get alerts for {3 + (usage.bonus_slots ?? 0)} items free.</p>
    </section>{setup}<p className="privacy-note"><ShieldCheck size={15} aria-hidden="true" />Your household records and files are private to your account.</p>
  </div>;

  return <div className={styles.dashboard}>
    <div className={'page-heading ' + styles.heading}><div><div className="eyebrow">YOUR HOUSEHOLD</div><h1>Your household, organised.</h1><p>Welcome back, {name.split(' ')[0] || 'there'}. Here’s what needs your attention.</p></div><AddItemButton demo={demo} /></div>
    {demo && <a className={styles.sampleJump} href="#sample-capabilities">See what you can try in this sample account ↓</a>}
    <section className={'panel ' + styles.dates + ' ' + styles.attention} aria-labelledby="attention-heading">
      <div className="section-heading"><h2 id="attention-heading">{overdue + unresolved > 0 ? <CircleAlert size={21} aria-hidden="true" /> : <CheckCircle2 size={21} aria-hidden="true" />} Needs attention</h2>{overdue + unresolved > 0 && <span className={styles.countdown + ' ' + styles.urgent}>{overdue + unresolved} to review</span>}</div>
      {overdue > 0 && <div className={styles.attentionGroup}><div className="section-heading"><div><h3>Overdue or expired dates</h3><p className="hint">{overdue} {overdue === 1 ? 'date needs' : 'dates need'} a review.</p></div><Link href={base + '/items?filter=overdue'}>Review overdue dates <ArrowRight size={15} aria-hidden="true" /></Link></div><div className={styles.rows}>{overdueRows.slice(0,3).map(row => <ItemDateRow key={row.date.id} row={row} today={today} base={base} compact />)}</div></div>}
      {unresolved > 0 && <div className={styles.attentionGroup}><div className="section-heading"><div><h3 id="unconfirmed-heading">Occurrences to review</h3><p className="hint">{unresolved} {unresolved === 1 ? 'occurrence has' : 'occurrences have'} not been marked completed. A later cycle does not confirm them.</p></div><Link href={base + '/items/review'}>Review all occurrences <ArrowRight size={15} aria-hidden="true" /></Link></div><div className={styles.rows}>{unconfirmed?.rows.slice(0,3).map(row => <Link className={styles.row} key={row.occurrence_id} href={base + '/items/' + row.item_id + '?' + new URLSearchParams({date:row.date_id,occurrence:row.occurrence_id,action:'complete',due:row.due_on}) + '#date-' + row.date_id}><div><strong>{row.product_name}</strong><p className="hint">{row.label} · Scheduled {formatDate(row.due_on)}</p></div><span className={styles.rowAction}>Review</span></Link>)}</div></div>}
      {overdue + unresolved === 0 && <p className={styles.empty}>No overdue dates or unconfirmed occurrences in your saved records.</p>}
    </section>
    <div className={'stat-grid ' + styles.stats}>
      <Link href={base + '/items'} className="stat-card"><span className="stat-icon violet"><ReceiptText size={21} aria-hidden="true" /></span><div><span>Household items</span><strong>{usage.active_reminders ?? active.length}</strong><p>The things you manage</p></div></Link>
      <Link href={base + '/items?filter=reminders'} className="stat-card"><span className="stat-icon green"><Bell size={21} aria-hidden="true" /></span><div><span>Alert coverage</span><strong>{usage.reminders}<small> / {usage.slot_limit ?? 3}</small></strong><p>Alert slots in use</p></div></Link>
      <Link href={base + '/items?filter=upcoming'} className="stat-card"><span className="stat-icon amber"><CalendarDays size={21} aria-hidden="true" /></span><div><span>Upcoming dates</span><strong>{usage.upcoming ?? upcoming.length}</strong><p>Next 30 days</p></div></Link>
    </div>
    <section className={'panel ' + styles.dates} aria-labelledby="planning-heading">
      <div className="section-heading"><div><h2 id="planning-heading">Your next 30 days</h2><p className="section-description">Plan payments, services and important dates.</p></div><Link href={base + '/items?filter=upcoming'}>View all upcoming <ArrowRight size={15} aria-hidden="true" /></Link></div>
      <div className={styles.viewSwitch} role="group" aria-label="Planning view"><button type="button" aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>Calendar</button><button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button></div>
      {upcoming.length ? view === 'calendar' ? <UpcomingTimeline rows={upcoming} today={today} base={base} embedded /> : <><div className={styles.rows}>{upcoming.slice(0,expanded ? 10 : 5).map(row => <ItemDateRow key={row.date.id} row={row} today={today} base={base} compact />)}</div>{upcoming.length > 5 && <button type="button" className="text-button spaced" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Show fewer dates' : 'Show more dates'}</button>}</> : <div className={styles.empty}><p>No dates saved for the next 30 days.</p><Link className="text-button spaced" href={base + '/items?filter=dates'}>Browse all important dates <ArrowRight size={15} aria-hidden="true" /></Link></div>}
    </section>
    {insights && <HouseholdInsightCards insights={insights} base={base} demo={demo}/>}
    <section className={styles.library} aria-labelledby="all-reminders-heading">
      <div className={'section-heading ' + styles.libraryHeading}><div><h2 id="all-reminders-heading">Your household records</h2><p className="section-description">Find the details and history you’ve kept.</p></div><Link href={base + '/items' + browseQuery}>Browse all items <ArrowRight size={15} aria-hidden="true" /></Link></div>
      <div className={styles.filters} role="group" aria-label="Filter household records by category"><button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}><LayoutDashboard size={18} aria-hidden="true" />All{completePreview && <span>{active.length}</span>}</button>{categories.map(group => <button key={group.key} type="button" aria-pressed={category === group.key} onClick={() => setCategory(group.key)}><TemplateIcon template="other" group={group.key} size={18} />{categoryLabel(group.key)}</button>)}</div>
      {['maintenance', 'insurance'].includes(category) && <p className="hint space-bottom">Showing {category === 'maintenance' ? 'maintenance' : 'insurance'} records across your household items. Each item stays in its original category.</p>}
      <label className={styles.sort}><span className="sr-only">Sort household records</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="recent">Recently added</option><option value="due">Due soon</option></select></label>
      <div className={'purchase-grid ' + styles.cards}>{sorted.slice(0, 6).map(item => <ItemCard key={item.id} item={item} base={base} today={today} compact />)}</div>
      {!matched.length && <p className={styles.empty}>{active.length ? 'No records in this category.' : 'Add an item. A name is a good start.'}</p>}
      <div className={styles.browse}><p>{completePreview && matched.length <= 6 ? 'Your records, ready when you need them.' : 'Showing a selection. Browse all items for the complete list.'}</p></div>
    </section>
    {demo && <section className={'panel ' + styles.examples} aria-labelledby="sample-capabilities"><h2 id="sample-capabilities">Explore what you can keep</h2><p className="section-description">Explore these fictional records. Sample changes are previews only and are not saved. No alerts are sent.</p><div className={styles.exampleLinks}>
      <Link href={base + '/items/payments'}><strong>Payment planning</strong><span>Review amounts and their certainty <ArrowRight size={15} aria-hidden="true" /></span></Link>
      <Link href={base + '/items/cccccccc-cccc-4ccc-8ccc-cccccccccccc#activity-history-heading'}><strong>Maintenance history</strong><span>Service dates, actual costs and corrections <ArrowRight size={15} aria-hidden="true" /></span></Link>
      <Link href={base + '/items/11111111-1111-4111-8111-111111111111'}><strong>Receipts and warranties</strong><span>Purchase details and a sample receipt <ArrowRight size={15} aria-hidden="true" /></span></Link>
      <Link href="#readiness-summary-heading"><strong>Household readiness</strong><span>Find key details to add at your pace <ArrowRight size={15} aria-hidden="true" /></span></Link>
      <Link href="#household-brief-heading"><strong>Your household brief</strong><span>A week of dates from saved records <ArrowRight size={15} aria-hidden="true" /></span></Link>
      <Link href={base + '/items?q=cleaning'}><strong>Search your records</strong><span>Find notes, dates, history and file names <ArrowRight size={15} aria-hidden="true" /></span></Link>
    </div><Link className="text-button spaced" href={base + '/add?category=bills'}>Try adding a household bill <ArrowRight size={15} aria-hidden="true"/></Link></section>}
    {setup}<p className="privacy-note"><ShieldCheck size={15} aria-hidden="true" />Your household records and files are private to your account.</p>
  </div>;
}
