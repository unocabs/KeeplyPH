'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, Check, Car, Bike } from 'lucide-react';
import { carBrands, getCarBrand } from '@/features/items/car-brands';
import { motorcycleBrands, getMotorcycleBrand } from '@/features/items/motorcycle-brands';
import { CarBrandLogo } from './car-brand-logo';
import styles from './car-brand-picker.module.css';

export function CarBrandPicker({ value, onChange, kind = 'car' }: { value: string; kind?: 'car' | 'motorcycle'; onChange: (brand: string) => void }) {
  const motorcycle = kind === 'motorcycle';
  const title = motorcycle ? 'Motorcycle' : 'Car';
  const Glyph = motorcycle ? Bike : Car;
  const choices = [{ id: '', label: 'No brand selected' }, ...(motorcycle ? motorcycleBrands : carBrands), { id: 'other', label: 'Other / not listed' }];
  const id = useId(), input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [active, setActive] = useState(0);
  const selected = (motorcycle ? getMotorcycleBrand(value) : getCarBrand(value))?.label || (value === 'other' ? 'Other / not listed' : 'No brand selected');
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
    <label htmlFor={id}>{title} brand <span className={styles.optional}>(optional)</span></label>
    <input type="hidden" name={motorcycle ? 'motorcycle_brand' : 'car_brand'} value={value} />
    <div className={styles.control}>
      <span className={styles.logo} aria-hidden="true"><CarBrandLogo kind={kind} brand={value} fallback={<Glyph size={20} />} /></span>
      <input ref={input} id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={id + '-options'} aria-activedescendant={open && results[active] ? id + '-option-' + results[active].id : undefined} autoComplete="off" value={open ? query : selected} placeholder={'Search ' + kind + ' brands…'} onFocus={show} onClick={() => { if (!open) show(); }} onChange={event => { setQuery(event.target.value); setOpen(true); setActive(0); }} onKeyDown={keyDown} />
      <button type="button" aria-label={(open ? 'Close ' : 'Show ') + kind + ' brands'} tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => { if (open) setOpen(false); else { input.current?.focus(); show(); } }}><ChevronDown size={18} aria-hidden="true" /></button>
    </div>
    {open && <div className={styles.menu}>
      <ul id={id + '-options'} role="listbox" aria-label={title + ' brands'}>
        {results.map((brand, index) => <li key={brand.id} id={id + '-option-' + brand.id} role="option" aria-selected={value === brand.id} className={index === active ? styles.active : ''} ref={node => { if (index !== active || !node?.parentElement) return; const list = node.parentElement; if (node.offsetTop < list.scrollTop) list.scrollTop = node.offsetTop; else if (node.offsetTop + node.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = node.offsetTop + node.offsetHeight - list.clientHeight; }} onMouseDown={event => event.preventDefault()} onClick={() => select(brand.id)}>
          <span className={styles.logo} aria-hidden="true"><CarBrandLogo kind={kind} brand={brand.id} fallback={<Glyph size={20} />} /></span><span>{brand.label}</span>{value === brand.id && <Check size={16} aria-hidden="true" />}
        </li>)}
      </ul>
      {!results.length && <div className={styles.empty}><p role="status">No matching brand found.</p><button type="button" className="text-button" onMouseDown={event => event.preventDefault()} onClick={() => select('other')}>Use Other / not listed</button></div>}
    </div>}
    {value && <div className={styles.help}><button type="button" className="text-button" onClick={() => select('')}>Clear brand</button></div>}
  </div>;
}
