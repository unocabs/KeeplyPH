'use client';
import { useId, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { categories, warrantyStatus, type PurchaseWithDetails } from '@/lib/domain';
import { PurchaseCard, EmptyPurchases } from './purchase-ui';
export function PurchaseList({ purchases, today, initialFilter = 'all', demo = false }: { purchases: PurchaseWithDetails[]; today: string; initialFilter?: string; demo?: boolean }) {
  const [search, setSearch] = useState(''), [filter, setFilter] = useState(initialFilter), [category, setCategory] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false), [from, setFrom] = useState(''), [to, setTo] = useState('');
  const filterId = useId();
  const activeCount = Number(filter !== 'all') + Number(Boolean(category)) + Number(Boolean(from)) + Number(Boolean(to));
  const base = demo ? '/demo' : '';
  const filtered = purchases.filter(p => {
    const status = warrantyStatus(p.warranty, today);
    return (!search || (p.product_name + ' ' + p.merchant).toLowerCase().includes(search.toLowerCase()))
      && (filter === 'all' || (filter === 'active' ? ['active', 'expiring'].includes(status) : status === filter))
      && (!category || p.category === category) && (!from || Boolean(p.purchased_on && p.purchased_on >= from)) && (!to || Boolean(p.purchased_on && p.purchased_on <= to));
  });
  return <><div className="page-heading"><div><div className="eyebrow">YOUR PERSONAL COLLECTION</div><h1>Receipt Reminders</h1><p>Every receipt. Every warranty. Right where you need it.</p></div><Link className="button primary" href={base + '/purchases/new'}><Plus size={18} />Add Reminder</Link></div>
    <div className="list-toolbar"><label className="search-field"><Search size={18} /><input aria-label="Search receipt reminders" placeholder="Search product or store…" maxLength={100} value={search} onChange={e => setSearch(e.target.value)} /></label><button className={'button secondary ' + (filtersOpen ? 'selected' : '')} onClick={() => setFiltersOpen(!filtersOpen)} aria-label={activeCount ? `Filters (${activeCount} active)` : 'Filters'} aria-expanded={filtersOpen} aria-controls={filterId}><SlidersHorizontal size={17} />Filters{activeCount > 0 && <span className="filter-count">{activeCount}</span>}</button></div>
    <div id={filterId} className={'receipt-filters' + (filtersOpen ? ' is-open' : '')}>
    <div className="filter-tabs" role="group" aria-label="Warranty status">{[['all', 'All receipt reminders'], ['active', 'Active warranties'], ['expiring', 'Expiring soon'], ['expired', 'Expired'], ['none', 'No warranty']].map(([value, label]) => <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>
    <div className="filter-panel receipt-filter-fields"><label>Category<select aria-label="Category" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></label><label>Purchased from<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>Purchased to<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label><button className="text-button" onClick={() => { setCategory(''); setFrom(''); setTo(''); setSearch(''); setFilter('all'); }}><X size={14} />Clear filters</button></div>
    </div>
    <p className="result-count">{filtered.length} {filtered.length === 1 ? 'purchase' : 'purchases'}</p>
    {filtered.length ? <div className="purchase-grid">{filtered.map(p => <PurchaseCard key={p.id} purchase={p} today={today} base={base} />)}</div> : purchases.length ? <div className="empty-state compact"><Search size={30} /><h3>No purchases found.</h3><p>Try another product name, store, or filter.</p><button className="button secondary" onClick={() => { setSearch(''); setFilter('all'); setCategory(''); setFrom(''); setTo(''); }}>Clear search and filters</button></div> : <EmptyPurchases base={base} />}
  </>;
}
