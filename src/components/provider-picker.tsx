'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './lender-picker.module.css';

export function ProviderPicker({ value, onChange, title, fieldName, choices, logo, note }: {
  value: string; onChange: (value: string) => void; title: string; fieldName: string;
  choices: readonly { id: string; label: string }[]; logo: (value: string) => ReactNode; note?: ReactNode;
}) {
  const id = useId(), input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [active, setActive] = useState(0);
  const selected = choices.find(choice => choice.id === value)?.label || choices[0].label;
  const results = choices.filter(brand => brand.label.toLowerCase().includes(query.trim().toLowerCase()));
  function select(brand: string) { onChange(brand); setOpen(false); setQuery(''); setActive(0); }
  function show() { setOpen(true); setQuery(''); setActive(0); }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      if (!open) { show(); return; }
      setActive(index => Math.max(0, Math.min(results.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
    } else if (open && ['Home', 'End'].includes(event.key)) {
      event.preventDefault(); setActive(event.key === 'Home' ? 0 : Math.max(0, results.length - 1));
    } else if (open && event.key === 'Enter') {
      event.preventDefault(); if (results[active]) select(results[active].id);
    }
  }
  return <div className={'full ' + styles.picker} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label htmlFor={id}>{title} <span className={styles.optional}>(optional)</span></label>
    <input type="hidden" name={fieldName} value={value} />
    <div className={styles.control}>
      <span className={styles.logo} aria-hidden="true">{logo(value)}</span>
      <input ref={input} id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={id + '-options'} aria-activedescendant={open && results[active] ? id + '-option-' + results[active].id : undefined} autoComplete="off" value={open ? query : selected} placeholder="Search providers…" onFocus={show} onClick={() => { if (!open) show(); }} onChange={event => { setQuery(event.target.value); setOpen(true); setActive(0); }} onKeyDown={keyDown} />
      <button type="button" aria-label={(open ? 'Close ' : 'Show ') + 'providers'} tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => { if (open) setOpen(false); else { input.current?.focus(); show(); } }}><ChevronDown size={18} aria-hidden="true" /></button>
    </div>
    {open && <div className={styles.menu}>
      <ul id={id + '-options'} role="listbox" aria-label="Providers">
        {results.map((brand, index) => <li key={brand.id} id={id + '-option-' + brand.id} role="option" aria-selected={value === brand.id} className={index === active ? styles.active : ''} ref={node => { if (index !== active || !node?.parentElement) return; const list = node.parentElement; if (node.offsetTop < list.scrollTop) list.scrollTop = node.offsetTop; else if (node.offsetTop + node.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = node.offsetTop + node.offsetHeight - list.clientHeight; }} onMouseDown={event => event.preventDefault()} onClick={() => select(brand.id)}>
          <span className={styles.logo} aria-hidden="true">{logo(brand.id)}</span><span>{brand.label}</span>{value === brand.id && <Check size={16} aria-hidden="true" />}
        </li>)}
      </ul>
      {!results.length && <div className={styles.empty}><p role="status">No matching provider found.</p><button type="button" className="text-button" onMouseDown={event => event.preventDefault()} onClick={() => select('other')}>Use {choices.find(choice => choice.id === 'other')?.label}</button></div>}
    </div>}
    {note && <p className={styles.dealerNote}>{note}</p>}
    {value && <div className={styles.help}><button type="button" className="text-button" onClick={() => select('')}>Clear {fieldName === 'lender_id' ? 'lender' : fieldName === 'utility_id' ? 'biller' : 'insurer'}</button></div>}
  </div>;
}
