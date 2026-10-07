'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, Check, CirclePlay, Dumbbell } from 'lucide-react';
import { subscriptionBrands, getSubscriptionBrand } from '@/features/items/subscription-brands';
import { SubscriptionBrandLogo } from './subscription-brand-logo';
import { CategoryGlyph } from './icons/category-glyph';
import styles from './subscription-brand-picker.module.css';

export function SubscriptionBrandPicker({ value, onChange, preset }: { value: string; preset: 'streaming' | 'gym' | 'ai-subscription'; onChange: (brand: string) => void }) {
  const title = preset === 'ai-subscription' ? 'AI service' : preset === 'gym' ? 'Gym' : 'Service';
  const otherLabel = preset === 'ai-subscription' ? 'Other AI service' : 'Other / not listed';
  const collection = preset === 'ai-subscription' ? 'AI services' : title + ' brands';
  const noneLabel = preset === 'ai-subscription' ? 'No AI service selected' : 'No brand selected';
  const Glyph = preset === 'gym' ? Dumbbell : CirclePlay;
  const choices = [{ id: '', label: noneLabel }, ...subscriptionBrands.filter(brand => brand.preset === preset), { id: 'other', label: otherLabel }];
  function logo(value: string) {
    const brand = getSubscriptionBrand('other', preset, value);
    const fallback = preset === 'ai-subscription' ? <CategoryGlyph icon="sparkles" size={20} /> : <Glyph size={20} />;
    return brand ? <SubscriptionBrandLogo brand={brand} fallback={fallback} /> : fallback;
  }
  const id = useId(), input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [active, setActive] = useState(0);
  const selected = getSubscriptionBrand('other', preset, value)?.label || (value === 'other' ? otherLabel : noneLabel);
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
    <label htmlFor={id}>{title}{preset === 'ai-subscription' ? '' : ' brand'} <span className={styles.optional}>(optional)</span></label>
    <input type="hidden" name="subscription_brand" value={value} />
    <div className={styles.control}>
      <span className={styles.logo} aria-hidden="true">{logo(value)}</span>
      <input ref={input} id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={id + '-options'} aria-activedescendant={open && results[active] ? id + '-option-' + results[active].id : undefined} autoComplete="off" value={open ? query : selected} placeholder={'Search ' + collection.toLowerCase() + '…'} onFocus={show} onClick={() => { if (!open) show(); }} onChange={event => { setQuery(event.target.value); setOpen(true); setActive(0); }} onKeyDown={keyDown} />
      <button type="button" aria-label={(open ? 'Close ' : 'Show ') + collection.toLowerCase()} tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => { if (open) setOpen(false); else { input.current?.focus(); show(); } }}><ChevronDown size={18} aria-hidden="true" /></button>
    </div>
    {open && <div className={styles.menu}>
      <ul id={id + '-options'} role="listbox" aria-label={collection}>
        {results.map((brand, index) => <li key={brand.id} id={id + '-option-' + brand.id} role="option" aria-selected={value === brand.id} className={index === active ? styles.active : ''} ref={node => { if (index !== active || !node?.parentElement) return; const list = node.parentElement; if (node.offsetTop < list.scrollTop) list.scrollTop = node.offsetTop; else if (node.offsetTop + node.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = node.offsetTop + node.offsetHeight - list.clientHeight; }} onMouseDown={event => event.preventDefault()} onClick={() => select(brand.id)}>
          <span className={styles.logo} aria-hidden="true">{logo(brand.id)}</span><span>{brand.label}</span>{value === brand.id && <Check size={16} aria-hidden="true" />}
        </li>)}
      </ul>
      {!results.length && <div className={styles.empty}><p role="status">No matching {preset === 'ai-subscription' ? 'AI service' : 'brand'} found.</p><button type="button" className="text-button" onMouseDown={event => event.preventDefault()} onClick={() => select('other')}>Use {otherLabel}</button></div>}
    </div>}
    {value && <div className={styles.help}><button type="button" className="text-button" onClick={() => select('')}>Clear {preset === 'ai-subscription' ? 'AI service' : 'brand'}</button></div>}
  </div>;
}
