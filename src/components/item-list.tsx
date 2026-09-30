'use client';
import { reminderCategories, itemCategory } from '@/features/templates/categories';
import Link from 'next/link';
import type { ItemQuery } from '@/features/items/queries';
import { useState } from 'react';
import { templates, getReminderPreset } from '@/features/templates';
import { dateRows, comingUp, type ItemWithDetails } from '@/features/items/domain';
import { ItemCard, ItemDateRow } from './item-ui';
import { AddItemButton } from './template-picker';
export function ItemList({ items, today, initialFilter = 'all', demo = false, serverQuery }: { items: ItemWithDetails[]; today: string; initialFilter?: string; demo?: boolean; serverQuery?: ItemQuery }) {
  const [query,setQuery] = useState(''), [type,setType] = useState('all'), [filter,setFilter] = useState(initialFilter);
  if(!demo) return <PagedItems items={items} today={today} query={serverQuery||{filter:initialFilter}}/>;
  const base = demo ? '/demo' : '';
  const matched = items.filter(i => (type === 'all' || 'category:' + itemCategory(i) === type) && [i.product_name, (getReminderPreset(i.template_key, i.reminder_preset || undefined) || templates[i.template_key]).label, ...i.dates.flatMap(d => [d.label, ...d.occurrences.map(o => o.due_on)])].join(' ').toLowerCase().includes(query.toLowerCase()));
  const rows = dateRows(matched);
  const shownDates = filter === 'upcoming' ? comingUp(rows,today) : filter === 'overdue' ? rows.filter(r => r.occurrence.due_on < today) : filter === 'reminders' ? rows.filter(r => r.item.coverage==='covered' && r.date.reminders_enabled && r.occurrence.due_on >= today) : rows;
  const dateView = ['upcoming','overdue','dates'].includes(filter);
  const shown = matched.filter(i => filter === 'archived' ? Boolean(i.archived_at) : filter === 'drafts' ? i.state === 'draft' : i.state === 'saved' && !i.archived_at && (filter!=='reminders'||i.coverage==='covered') && (filter!=='uncovered'||i.coverage!=='covered'));
  return <><div className="page-heading"><div><h1>{filter === 'all' ? 'Active Reminders' : filter === 'archived' ? 'Archived Reminders' : filter === 'drafts' ? 'Unfinished Reminders' : 'Reminders'}</h1><p>Find a reminder, a document, or the date you need.</p></div><AddItemButton demo={demo} /></div><div className="filter-panel"><label>Search<input type="search" placeholder="Name, type or date (YYYY-MM-DD)" value={query} onChange={e => setQuery(e.target.value)} /></label><label>Category<select value={type} onChange={e => setType(e.target.value)}><option value="all">All categories</option>{reminderCategories.map(group => <option key={group.key} value={'category:' + group.key}>{group.label}</option>)}</select></label><label>Show<select value={filter} onChange={e => setFilter(e.target.value)}>{[['all','Active Reminders'],['upcoming','Next 30 days'],['dates','All important dates'],['overdue','Overdue / expired'],['reminders','With alert coverage'],['uncovered','Without alert coverage'],['archived','Archived'],['drafts','Unfinished']].map(([k,l]) => <option key={k} value={k}>{l}</option>)}</select></label></div><p className="section-description space-bottom">{dateView ? shownDates.length + ' dates' : shown.length + ' reminders'} · Little things, safely kept.</p>{dateView ? <section className="panel">{shownDates.map(row => <ItemDateRow key={row.date.id} row={row} today={today} base={base} />)}{!shownDates.length && <p>No dates match this view.</p>}</section> : <div className="purchase-grid">{shown.map(item => <ItemCard key={item.id} item={item} base={base} />)}{!shown.length && <p>No reminders here yet. Add something you want to keep.</p>}</div>}</>;
}

function PagedItems({items,today,query}:{items:ItemWithDetails[];today:string;query:ItemQuery}) {
 const filter=query.filter||'all'; const rows=dateRows(items);const dates=['dates','upcoming','overdue'].includes(filter);
 const shown=filter==='upcoming'?comingUp(rows,today):filter==='overdue'?rows.filter(r=>r.occurrence.due_on<today):rows;
 const next=new URLSearchParams({filter,q:query.q||'',template:query.template||'all'});const last=items.at(-1);if(last){next.set('cursor',last.created_at);next.set('cursorId',last.id);}
 return <><div className="page-heading"><div><h1>{filter === 'all' ? 'Active Reminders' : filter === 'archived' ? 'Archived Reminders' : filter === 'drafts' ? 'Unfinished Reminders' : 'Reminders'}</h1><p>Your active reminders, with alerts you choose.</p></div><AddItemButton/></div>
 <form action="/items" className="filter-panel"><label>Search<input name="q" type="search" maxLength={160} defaultValue={query.q} placeholder="Name, type or date"/></label><label>Category<select name="template" defaultValue={query.template||'all'}><option value="all">All categories</option>{reminderCategories.map(group => <option key={group.key} value={'category:' + group.key}>{group.label}</option>)}</select></label><label>Show<select name="filter" defaultValue={filter}>{[['all','Active Reminders'],['reminders','With alert coverage'],['uncovered','Without alert coverage'],['upcoming','Next 30 days'],['overdue','Overdue / expired'],['dates','All dates'],['archived','Archived'],['drafts','Unfinished']].map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label><button className="button secondary">Find reminders</button></form>
 <p className="hint space-bottom">Showing {items.length} reminders on this page.</p>{dates?<section className="panel">{shown.map(r=><ItemDateRow key={r.date.id} row={r} today={today}/>)}{!shown.length&&<p>No dates here.</p>}</section>:<div className="purchase-grid">{items.map(i=><ItemCard key={i.id} item={i}/>)}{!items.length&&<p>No reminders match this view.</p>}</div>}
 <div className="form-actions">{query.cursor&&<Link className="button secondary" href={'/items?'+new URLSearchParams({filter,q:query.q||'',template:query.template||'all'})}>First page</Link>}{items.length===25&&<Link className="button secondary" href={'/items?'+next}>Next page →</Link>}</div></>;
}
