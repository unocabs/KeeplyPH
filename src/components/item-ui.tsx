import Link from 'next/link';
import { CalendarDays, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/domain';
import { templates } from '@/features/templates';
import { dateStatus, type DateRow, type ItemWithDetails, currentOccurrence } from '@/features/items/domain';
import { TemplateIcon } from './template-picker';
export function ItemCard({ item, base = '' }: { item: ItemWithDetails; base?: string }) {
  const next = item.dates.flatMap(d => { const o = currentOccurrence(d); return o ? [{ date: d, occurrence: o }] : []; }).sort((a,b) => a.occurrence.due_on.localeCompare(b.occurrence.due_on))[0];
  return <Link href={base + '/items/' + item.id} className="purchase-card"><div className="purchase-card-top"><span className="stat-icon violet"><TemplateIcon template={item.template_key} /></span><span className="category-label">{item.archived_at ? 'Archived' : item.state === 'draft' ? 'Unfinished' : templates[item.template_key].label}</span></div><h3>{item.product_name || 'Unfinished ' + templates[item.template_key].label}</h3><p>{item.merchant || templates[item.template_key].description}</p>{item.state==='saved'&&!item.archived_at&&<span className="coverage-label">{item.coverage==='covered'?'Reminders included':item.coverage==='paused_capacity'?'Reminders paused':'Safely kept · reminders not active'}</span>}<div className="purchase-card-bottom"><span>{next ? next.date.label + ' · ' + formatDate(next.occurrence.due_on, true) : 'Add a date whenever you’re ready'}</span><ArrowRight size={15} /></div></Link>;
}
export function ItemDateRow({ row, today, base = '' }: { row: DateRow; today: string; base?: string }) {
  return <Link className="expiry-row" href={base + '/items/' + row.item.id + '#date-' + row.date.id}><span className="stat-icon violet"><CalendarDays size={20} /></span><div className="expiry-name"><strong>{row.item.product_name}</strong><span>{row.date.label}</span></div><div className="expiry-date"><strong>{dateStatus(row, today)}</strong><span>{formatDate(row.occurrence.due_on, true)}</span></div><ArrowRight size={15} /></Link>;
}
