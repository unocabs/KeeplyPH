'use client';

import Link from 'next/link';
import type {DiscoveryVariant} from '@/features/premium/discovery';
import { PremiumPlannerPreview } from './premium-planner-preview';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ArrowRight, Bell, CalendarDays, CheckCircle2, CircleAlert, ReceiptText, ShieldCheck, LayoutDashboard, Wallet, Wrench, FileText, Lightbulb, Sun, Search } from 'lucide-react';
import { type Usage } from '@/lib/domain';
import type { UnconfirmedSummary } from '@/features/items/activity';
import { dateRows, comingUp, itemsForCategory, itemMatchesCategory, isActiveReminder, type ItemWithDetails } from '@/features/items/domain';
import { reminderCategories } from '@/features/templates/categories';
import { ItemCard, ItemDateRow, categoryLabel } from './item-ui';
import { TemplateIcon } from './reminder-icon';
import { OverdueCards } from './overdue-cards';
import { AddItemButton } from './template-picker';
import { UpcomingTimeline } from './upcoming-timeline';
import styles from './dashboard.module.css';
import { DashboardNavigation, DashboardSectionLink } from './dashboard-navigation';
import { HouseholdInsightCards, HouseholdWeekSummary } from './household-insights';
import type { HouseholdInsights } from '@/features/items/insights';

export function Dashboard({ items, usage, name, today, demo = false, setup, unconfirmed, insights, accountId, discoveryVariant = 'contextual' }: { items: ItemWithDetails[]; usage: Usage; name: string; today: string; demo?: boolean; setup?: ReactNode; unconfirmed?: UnconfirmedSummary; insights?: HouseholdInsights; accountId?: string;discoveryVariant?:DiscoveryVariant }) {
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('recent');
  const [view, setView] = useState<'list' | 'calendar'>('calendar');
  const [expanded, setExpanded] = useState(false);
  const base = demo ? '/demo' : '';
  const pathname = usePathname() ?? (demo ? '/demo' : '/dashboard');
  const active = items.filter(isActiveReminder);
  const matched = itemsForCategory(active, category);
  const allRows = dateRows(active);
  const upcoming = comingUp(allRows, today);
  const overdueRows = allRows.filter(row => row.occurrence.due_on < today);
  const overdue = usage.overdue ?? overdueRows.length;
  const unresolved = unconfirmed?.total ?? 0;
  const attentionCount = overdue + unresolved;
  const pastReminders = [
    ...overdueRows.map(row => ({ occurrence_id: row.occurrence.id, item_id: row.item.id, date_id: row.date.id, product_name: row.item.product_name ?? 'Household item', label: row.date.label, due_on: row.occurrence.due_on })),
    ...(unconfirmed?.rows ?? []),
  ].sort((a, b) => a.due_on.localeCompare(b.due_on) || a.occurrence_id.localeCompare(b.occurrence_id));
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
      <p className={styles.welcomeFootnote}>Keep your household records and choose the alerts that help.</p>
    </section><PremiumPlannerPreview demo={demo} usage={usage}/>{setup}<p className="privacy-note"><ShieldCheck size={15} aria-hidden="true" />Your household records and files are private to your account.</p>
  </div>;

  return <div className={styles.dashboard}>
    <div className={'page-heading ' + styles.heading}><div><h1>Your household, organised.</h1><p>Welcome back, {name.split(' ')[0] || 'there'}.</p></div><AddItemButton demo={demo} /></div>
    <DashboardNavigation hasPlan={!!insights} pathname={pathname} />
    {discoveryVariant==='control'&&<PremiumPlannerPreview demo={demo} usage={usage}/>}
    <section id="coming-up" className={styles.chapter} aria-labelledby="planning-heading">
    <div className={styles.chapterLabel}><CalendarDays size={15} aria-hidden="true"/>Coming up</div>
    <div className={'panel ' + styles.dates + (view === 'calendar' && upcoming.length ? ' ' + styles.calendarPanel : '')}>
      <div className="section-heading"><div><h2 tabIndex={-1} id="planning-heading">Your next 30 days</h2><p className="section-description">Plan payments, services and important dates.</p></div><Link href={base + '/items?filter=upcoming'}>View all upcoming <ArrowRight size={15} aria-hidden="true" /></Link></div>
      <div className={styles.viewSwitch} role="group" aria-label="Planning view"><button type="button" aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>Calendar</button><button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button></div>
      {upcoming.length ? view === 'calendar' ? <UpcomingTimeline rows={upcoming} today={today} base={base} embedded /> : <><div className={styles.rows}>{upcoming.slice(0,expanded ? 10 : 5).map(row => <ItemDateRow key={row.date.id} row={row} today={today} base={base} compact />)}</div>{upcoming.length > 5 && <button type="button" className="text-button spaced" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Show fewer dates' : 'Show more dates'}</button>}</> : <div className={styles.empty}><p>No dates saved for the next 30 days.</p><Link className="text-button spaced" href={base + '/items?filter=dates'}>Browse all important dates <ArrowRight size={15} aria-hidden="true" /></Link></div>}
      {insights && <HouseholdWeekSummary insights={insights} items={active} base={base} demo={demo}/>}
    </div>
    </section>
    {discoveryVariant==='contextual'&&<PremiumPlannerPreview demo={demo} usage={usage}/>}
    <section id="needs-a-check" className={styles.chapter} aria-labelledby="attention-heading">
    <div className={styles.chapterLabel}><CircleAlert size={15} aria-hidden="true"/>Needs a check</div>
    <div className={'panel ' + styles.dates + ' ' + styles.attention + (attentionCount > 0 ? ' ' + styles.hasOverdue : '')}>
      <div className="section-heading"><div><h2 tabIndex={-1} id="attention-heading">{overdue + unresolved > 0 ? <CircleAlert size={19} aria-hidden="true" /> : <CheckCircle2 size={19} aria-hidden="true" />} Overdue or expired</h2><p className="section-description">{attentionCount > 0 ? <><strong className={styles.attentionCount}>{attentionCount}</strong> {attentionCount === 1 ? 'reminder needs' : 'reminders need'} a check. Mark anything you’ve already taken care of.</> : 'You’re all caught up. No overdue reminders.'}</p></div>{overdue + unresolved > 0 && <Link href={base + '/items?filter=overdue'}>Review all <ArrowRight size={15} aria-hidden="true" /></Link>}</div>
      {pastReminders.length > 0 && <OverdueCards rows={pastReminders} items={active} base={base} scope={demo ? 'demo' : accountId ?? 'preview'}/>}
    </div>
    </section>
    {insights && <section id="plan-and-organise" className={styles.chapter+' '+styles.organise} aria-labelledby="organise-heading">
      <div className={styles.chapterLabel}><Wallet size={15} aria-hidden="true"/>Plan &amp; organise</div>
      <div className={styles.chapterHeading}><h2 tabIndex={-1} id="organise-heading">A little planning, less to remember.</h2><p>Set aside for payments and keep useful details for later.</p></div>
      <HouseholdInsightCards insights={insights} items={active} base={base} scope={demo ? 'demo' : accountId ?? 'preview'}/>
    </section>}
    <section id="saved-records" className={styles.chapter+' '+styles.library} aria-labelledby="all-reminders-heading">
      <div className={styles.chapterLabel}><LayoutDashboard size={15} aria-hidden="true"/>Your saved records</div>
      <div className={'section-heading ' + styles.libraryHeading}><div><h2 tabIndex={-1} id="all-reminders-heading">Your household records</h2><p className="section-description">Find the details and history you’ve kept.</p></div><Link href={base + '/items' + browseQuery}>Browse all items <ArrowRight size={15} aria-hidden="true" /></Link></div>
    <div className={'stat-grid ' + styles.stats}>
      <Link href={base + '/items'} className="stat-card"><span className="stat-icon violet"><ReceiptText size={21} aria-hidden="true" /></span><div><span>Household items</span><strong>{usage.active_reminders ?? active.length}</strong><p>The things you manage</p></div></Link>
      <Link href={base + '/items?filter=reminders'} className="stat-card"><span className="stat-icon green"><Bell size={21} aria-hidden="true" /></span><div><span>Alert coverage</span><strong>{usage.reminders}</strong><p>Items with alerts</p></div></Link>
      <Link href={base + '/items?filter=upcoming'} className="stat-card"><span className="stat-icon amber"><CalendarDays size={21} aria-hidden="true" /></span><div><span>Upcoming dates</span><strong>{usage.upcoming ?? upcoming.length}</strong><p>Next 30 days</p></div></Link>
    </div>
      <div className={styles.filters} role="group" aria-label="Filter household records by category"><button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}><LayoutDashboard size={18} aria-hidden="true" />All{completePreview && <span>{active.length}</span>}</button>{categories.map(group => <button key={group.key} type="button" aria-pressed={category === group.key} onClick={() => setCategory(group.key)}><TemplateIcon template="other" group={group.key} size={18} />{categoryLabel(group.key)}</button>)}</div>
      {['maintenance', 'insurance'].includes(category) && <p className="hint space-bottom">Showing {category === 'maintenance' ? 'maintenance' : 'insurance'} records across your household items. Each item stays in its original category.</p>}
      <label className={styles.sort}><span className="sr-only">Sort household records</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="recent">Recently added</option><option value="due">Due soon</option></select></label>
      <div className={'purchase-grid ' + styles.cards}>{sorted.slice(0, 6).map(item => <ItemCard key={item.id} item={item} base={base} today={today} compact />)}</div>
      {!matched.length && <p className={styles.empty}>{active.length ? 'No records in this category.' : 'Add an item. A name is a good start.'}</p>}
      {completePreview && matched.length <= 6 && <div className={styles.browse}><p>Your records, ready when you need them.</p></div>}
    </section>
    {demo && <section className={'panel ' + styles.examples} aria-labelledby="sample-capabilities"><h2 id="sample-capabilities">Explore what you can keep</h2><p className="section-description">Explore these fictional records. Sample changes are previews only and are not saved. No alerts are sent.</p><div className={styles.exampleLinks}>
      <Link href={base + '/items/payments'}><span className={styles.exampleTitle}><span className={styles.exampleIcon}><Wallet size={21} aria-hidden="true"/></span><strong>Payment planning</strong></span><span>Check upcoming payment amounts <ArrowRight size={15} aria-hidden="true" /></span></Link>
      <Link href={base + '/items/cccccccc-cccc-4ccc-8ccc-cccccccccccc#activity-history-heading'}><span className={styles.exampleTitle}><span className={styles.exampleIcon}><Wrench size={21} aria-hidden="true"/></span><strong>Maintenance history</strong></span><span>Service dates, actual costs and corrections <ArrowRight size={15} aria-hidden="true" /></span></Link>
      <Link href={base + '/items/11111111-1111-4111-8111-111111111111'}><span className={styles.exampleTitle}><span className={styles.exampleIcon}><FileText size={21} aria-hidden="true"/></span><strong>Receipts and warranties</strong></span><span>Purchase details and a sample receipt <ArrowRight size={15} aria-hidden="true" /></span></Link>
      <DashboardSectionLink section="readiness-summary-heading" pathname={pathname}><span className={styles.exampleTitle}><span className={styles.exampleIcon}><Lightbulb size={21} aria-hidden="true"/></span><strong>Details to add</strong></span><span>Save useful details for later <ArrowRight size={15} aria-hidden="true" /></span></DashboardSectionLink>
      <DashboardSectionLink section="household-brief-heading" pathname={pathname}><span className={styles.exampleTitle}><span className={styles.exampleIcon}><Sun size={21} aria-hidden="true"/></span><strong>This week at home</strong></span><span>A week of dates from saved records <ArrowRight size={15} aria-hidden="true" /></span></DashboardSectionLink>
      <Link href={base + '/items?q=cleaning'}><span className={styles.exampleTitle}><span className={styles.exampleIcon}><Search size={21} aria-hidden="true"/></span><strong>Search your records</strong></span><span>Find notes, dates, history and file names <ArrowRight size={15} aria-hidden="true" /></span></Link>
    </div><Link className="text-button spaced" href={base + '/add?category=bills'}>Try adding a household bill <ArrowRight size={15} aria-hidden="true"/></Link></section>}
    {setup}<p className="privacy-note"><ShieldCheck size={15} aria-hidden="true" />Your household records and files are private to your account.</p>
  </div>;
}
