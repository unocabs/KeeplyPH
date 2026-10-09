'use client';

import Link from 'next/link';
import { useRef, useSyncExternalStore } from 'react';
import { ArrowRight, Settings2, Undo2, X } from 'lucide-react';
import { readinessChecks, readinessCopy, readinessHref, type HouseholdInsights } from '@/features/items/insights';
import type { ItemWithDetails } from '@/features/items/domain';
import { ItemIdentityIcon } from './reminder-icon';
import styles from './household-insights.module.css';

const changed = 'keeply-hidden-details-changed';
const fallback = new Map<string, string>();
function subscribe(update: () => void) {
  window.addEventListener('storage', update);
  window.addEventListener(changed, update);
  return () => { window.removeEventListener('storage', update); window.removeEventListener(changed, update); };
}
function snapshot(key: string) {
  if (fallback.has(key)) return fallback.get(key)!;
  try { return localStorage.getItem(key) ?? '[]'; } catch { return '[]'; }
}
function parseHidden(value: string): string[] {
  try { const ids: unknown = JSON.parse(value); return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []; } catch { return []; }
}

export function ReadinessSuggestions({ readiness, items, base, scope }: { readiness: HouseholdInsights['readiness']; items: ItemWithDetails[]; base: string; scope: string }) {
  const storageKey = 'keeply-hidden-details:' + scope;
  const hidden = parseHidden(useSyncExternalStore(subscribe, () => snapshot(storageKey), () => '[]'));
  const container = useRef<HTMLDivElement>(null);
  const id = (row: HouseholdInsights['readiness']['rows'][number]) => row.item_id + ':' + row.key;
  const dismissed = items.flatMap(item => readinessChecks(item).filter(check => check.state === 'dismissed').map(check => ({ item_id: item.id, product_name: item.product_name ?? 'Household item', key: check.key })));
  const rows = [...new Map([
    ...readiness.rows,
    ...items.flatMap(item => readinessChecks(item).filter(check => check.state === 'missing').map(check => ({ item_id: item.id, product_name: item.product_name ?? 'Household item', key: check.key }))),
  ].map(row => [id(row), row])).values()];
  const visible = rows.filter(row => !hidden.includes(id(row))).slice(0, 2);
  const hiddenRows = [...dismissed, ...rows.filter(row => hidden.includes(id(row)))];
  const hasHidden = hiddenRows.length > 0 || readiness.dismissed > 0;

  function setHidden(rowId: string, hide: boolean) {
    const previous = parseHidden(snapshot(storageKey));
    const value = JSON.stringify(hide ? [...new Set([...previous, rowId])] : previous.filter(value => value !== rowId));
    try { localStorage.setItem(storageKey, value); fallback.delete(storageKey); } catch { fallback.set(storageKey, value); }
    window.dispatchEvent(new Event(changed));
    requestAnimationFrame(() => container.current?.querySelector<HTMLElement>('button, summary, a')?.focus());
  }

  function card(row: HouseholdInsights['readiness']['rows'][number], isHidden = false) {
    const savedHidden = dismissed.some(candidate => id(candidate) === id(row));
    return <li key={id(row)}>
      <Link href={readinessHref(row.item_id, row.key, base)}><ItemIdentityIcon item={items.find(item => item.id === row.item_id)} size={21}/><span><strong>{row.product_name}</strong><small>{readinessCopy[row.key].label} to add</small></span><ArrowRight size={15} aria-hidden="true"/></Link>
      {savedHidden ? <Link className={styles.restoreSuggestion} href={base + '/items/' + row.item_id + '#readiness-heading'} aria-label={'Review hidden detail: ' + row.product_name + ', ' + readinessCopy[row.key].label} title="Review checklist options"><Settings2 size={16} aria-hidden="true"/></Link> : <button type="button" className={styles.dismissSuggestion} onClick={() => setHidden(id(row), !isHidden)} aria-label={(isHidden ? 'Restore suggestion: ' : 'Hide suggestion: ') + row.product_name + ', ' + readinessCopy[row.key].label} title={isHidden ? 'Show this suggestion again' : 'Hide this suggestion'}>{isHidden ? <Undo2 size={16} aria-hidden="true"/> : <X size={16} aria-hidden="true"/>}</button>}
    </li>;
  }

  return <div ref={container}>
    {visible.length > 0 && <ul className={styles.suggestions}>{visible.map(row => card(row))}</ul>}
    {hasHidden && <details className={styles.hiddenSuggestions}><summary>Show hidden</summary>
      {hiddenRows.length > 0 && <ul className={styles.suggestions}>{hiddenRows.map(row => card(row, true))}</ul>}
      {readiness.dismissed > dismissed.length && <Link className="text-button" href={base + '/items?filter=incomplete'}>Review hidden details <ArrowRight size={15} aria-hidden="true"/></Link>}
    </details>}
  </div>;
}
