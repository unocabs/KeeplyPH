'use client';
import { useId, useState, type ReactNode } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';

export function ListFilterFields({ children, activeCount = 0 }: { children: ReactNode; activeCount?: number }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <>
    <button type="button" className="button secondary filter-toggle" aria-label={activeCount ? `Filters (${activeCount} active)` : 'Filters'} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      <SlidersHorizontal size={18} aria-hidden="true" />
      <span className="filter-toggle-text">Filters</span>
      {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
      <ChevronDown size={14} className={open ? 'filter-chevron is-open' : 'filter-chevron'} aria-hidden="true" />
    </button>
    <div id={id} className={'list-filter-fields' + (open ? ' is-open' : '')}>{children}</div>
  </>;
}
