import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/domain';
import { templates } from '@/features/templates';
import { alertStatus, dateStatus, type DateRow, type ItemWithDetails, currentOccurrence } from '@/features/items/domain';
import { ReminderIcon } from './reminder-icon';
import { AlertIndicator } from './alert-indicator';
export function ItemCard({ item, base = '' }: { item: ItemWithDetails; base?: string }) {
  const next = item.dates.flatMap(d => { const o = currentOccurrence(d); return o ? [{ date: d, occurrence: o }] : []; }).sort((a,b) => a.occurrence.due_on.localeCompare(b.occurrence.due_on))[0];
  return <Link href={base + '/items/' + item.id} className="purchase-card"><div className="purchase-card-top"><ReminderIcon template={item.template_key} category={item.category} /><AlertIndicator status={alertStatus(item)} /></div><span className="category-label">{item.archived_at ? 'Archived' : item.state === 'draft' ? 'Unfinished' : templates[item.template_key].label}</span><h3>{item.product_name || 'Unfinished ' + templates[item.template_key].label}</h3><p>{item.merchant || templates[item.template_key].description}</p><div className="purchase-card-bottom"><span>{next ? next.date.label + ' · ' + formatDate(next.occurrence.due_on, true) : 'Add a date whenever you’re ready'}</span><ArrowRight size={15} /></div></Link>;
}
export function ItemDateRow({ row, today, base = '' }: { row: DateRow; today: string; base?: string }) {
  return <Link className="expiry-row" href={base + '/items/' + row.item.id + '#date-' + row.date.id}><ReminderIcon template={row.item.template_key} category={row.item.category} size={20} /><div className="expiry-name"><strong className="reminder-name">{row.item.product_name}<AlertIndicator status={alertStatus(row.item, row.date)} /></strong><span>{row.date.label}</span></div><div className="expiry-date"><strong>{dateStatus(row, today)}</strong><span>{formatDate(row.occurrence.due_on, true)}</span></div><ArrowRight size={15} /></Link>;
}
