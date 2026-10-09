'use client';

import Link from 'next/link';
import { useRef, useSyncExternalStore } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { formatDate } from '@/lib/domain';
import type { UnconfirmedSummary } from '@/features/items/activity';
import type { ItemWithDetails } from '@/features/items/domain';
import { ItemIdentityIcon } from './reminder-icon';
import styles from './dashboard.module.css';

const changed = 'keeply-hidden-overdue-changed';
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
  try { const ids: unknown = JSON.parse(value); return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string').slice(-1000) : []; } catch { return []; }
}
function saveHidden(key: string, ids: string[]) {
  const value = JSON.stringify(ids.slice(-1000));
  try { localStorage.setItem(key, value); fallback.delete(key); } catch { fallback.set(key, value); }
  window.dispatchEvent(new Event(changed));
}

export function OverdueCards({ rows, items, base, scope }: { rows: UnconfirmedSummary['rows']; items: ItemWithDetails[]; base: string; scope: string }) {
  const key = 'keeply-hidden-overdue:' + scope;
  const hidden = parseHidden(useSyncExternalStore(subscribe, () => snapshot(key), () => '[]'));
  const visible = rows.filter(row => !hidden.includes(row.occurrence_id)).slice(0, 3);
  const hiddenCount = rows.filter(row => hidden.includes(row.occurrence_id)).length;
  const container = useRef<HTMLDivElement>(null);
  function hide(id: string) {
    saveHidden(key, [...new Set([...parseHidden(snapshot(key)), id])]);
    requestAnimationFrame(() => container.current?.querySelector<HTMLButtonElement>('button')?.focus());
  }
  function restore() {
    saveHidden(key, []);
    requestAnimationFrame(() => container.current?.querySelector<HTMLAnchorElement>('a')?.focus());
  }
  return <div ref={container}>
    {visible.length > 0 && <div className={styles.attentionRows}>{visible.map(row => <div className={styles.pastReminderCard} key={row.occurrence_id}>
      <Link className={styles.pastReminder} href={base + '/items/' + row.item_id + '?' + new URLSearchParams({ date: row.date_id, occurrence: row.occurrence_id, action: 'complete', due: row.due_on }) + '#date-' + row.date_id}><ItemIdentityIcon item={items.find(item => item.id === row.item_id)} size={20}/><div><strong>{row.product_name}</strong><span>{row.label} · {formatDate(row.due_on, true)}</span></div><ArrowRight size={15} aria-hidden="true"/></Link>
      <button type="button" className={styles.dismissReminder} aria-label={'Hide reminder: ' + row.product_name + ', ' + formatDate(row.due_on, true)} title="Hide this card" onClick={() => hide(row.occurrence_id)}><X size={16} aria-hidden="true"/></button>
    </div>)}</div>}
    <div className={styles.hiddenReminders}>
      <p role="status">{hiddenCount > 0 && <>{hiddenCount} {hiddenCount === 1 ? 'card hidden' : 'cards hidden'} {fallback.has(key) ? 'for this visit' : 'in this browser'}. Reminders are still in Review all.</>}</p>
      {hiddenCount > 0 && <button type="button" className="text-button" onClick={restore}>Show hidden ({hiddenCount})</button>}
    </div>
  </div>;
}
