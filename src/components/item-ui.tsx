import Link from 'next/link';
import { ArrowRight, CalendarDays, BellOff } from 'lucide-react';
import { daysUntil, formatDate } from '@/lib/domain';
import { templates, getReminderPreset } from '@/features/templates';
import { itemCategory, reminderCategories } from '@/features/templates/categories';
import { alertStatus, dateStatus, type DateRow, type ItemWithDetails, currentOccurrence } from '@/features/items/domain';
import { dateAction } from '@/features/items/date-action';
import { reminderProviderLabel } from '@/features/items/provider-label';
import { ReminderIcon, DateIcon } from './reminder-icon';
import { AlertIndicator } from './alert-indicator';
import styles from './dashboard.module.css';

export function categoryLabel(category: string) {
  const short: Record<string, string> = { vehicles: 'Vehicles', documents: 'Personal', subscriptions: 'Subscriptions', purchases: 'Purchases', bills: 'Bills', loans: 'Loans', maintenance: 'Maintenance', health: 'Health', education: 'Education', custom: 'Custom' };
  return short[category] || reminderCategories.find(group => group.key === category)?.label || category;
}
function CategoryBadge({ item }: { item: ItemWithDetails }) {
  const category = itemCategory(item);
  return <span className={styles.category + ' ' + (styles[category] || '')}>{categoryLabel(category)}</span>;
}
function CountdownBadge({ row, today }: { row: DateRow; today: string }) {
  const days = daysUntil(row.occurrence.due_on, today);
  const tone = days <= 7 ? styles.urgent : days <= 30 ? styles.soon : styles.later;
  return <span className={styles.countdown + ' ' + tone}>{dateStatus(row, today).replace('remaining', 'left')}</span>;
}
function AlertState({ item, date }: { item: ItemWithDetails; date?: DateRow['date'] }) {
  const status = alertStatus(item, date);
  return status === 'off' ? <span className={styles.alertOff} role="img" aria-label="Alerts off" title="Alerts off"><BellOff size={16} strokeWidth={1.8} aria-hidden="true" /></span> : <AlertIndicator status={status} />;
}
export function ItemCard({ item, base = '', today, compact = false }: { item: ItemWithDetails; base?: string; today?: string; compact?: boolean }) {
  const next = item.dates.flatMap(date => { const occurrence = currentOccurrence(date); return occurrence ? [{ date, occurrence, item }] : []; }).sort((a, b) => a.occurrence.due_on.localeCompare(b.occurrence.due_on))[0];
  const template = getReminderPreset(item.template_key, item.reminder_preset || undefined) || templates[item.template_key];
  if (compact) return <Link href={base + '/items/' + item.id} className={'purchase-card ' + styles.card}>
    <div className={styles.cardTop}><ReminderIcon productType={item.product_type} productName={item.product_name} template={item.template_key} category={item.category} preset={item.reminder_preset} brand={item.car_brand} motorcycleBrand={item.motorcycle_brand} subscriptionBrand={item.subscription_brand} utilityId={item.utility_id} insurerId={item.insurer_id} lenderId={item.lender_id} /><div className={styles.cardIdentity}><CategoryBadge item={item} /></div><AlertState item={item} /></div>
    <h3>{item.product_name || 'Unfinished ' + template.label}</h3><p>{reminderProviderLabel(item) || item.merchant || (base === '/demo' ? item.notes : null) || templates[item.template_key].description}</p>
    <div className={styles.cardBottom}><span className={styles.cardDate}>{next ? <><CalendarDays size={15} aria-hidden="true" /><span>{formatDate(next.occurrence.due_on, true)}</span></> : 'Add a date whenever you’re ready'}</span>{next && today && <CountdownBadge row={next} today={today} />}<span className={styles.cardArrow}><ArrowRight size={16} aria-hidden="true" /></span></div>
  </Link>;
  return <Link href={base + '/items/' + item.id} className="purchase-card"><div className="purchase-card-top"><ReminderIcon productType={item.product_type} productName={item.product_name} template={item.template_key} category={item.category} preset={item.reminder_preset} brand={item.car_brand} motorcycleBrand={item.motorcycle_brand} subscriptionBrand={item.subscription_brand} utilityId={item.utility_id} insurerId={item.insurer_id} lenderId={item.lender_id} /><AlertIndicator status={alertStatus(item)} /></div><span className="category-label">{item.archived_at ? 'Archived' : item.state === 'draft' ? 'Unfinished' : template.label}</span><h3>{item.product_name || 'Unfinished ' + template.label}</h3><p>{reminderProviderLabel(item) || item.merchant || (base === '/demo' ? item.notes : null) || templates[item.template_key].description}</p><div className="purchase-card-bottom"><span>{next ? next.date.label + ' · ' + formatDate(next.occurrence.due_on, true) : 'Add a date whenever you’re ready'}</span><ArrowRight size={15} /></div></Link>;
}
export function ItemDateRow({ row, today, base = '', compact = false }: { row: DateRow; today: string; base?: string; compact?: boolean }) {
  if (compact) {
    const action = dateAction(row, base);
    return <div className={styles.row}>
      <Link className={styles.rowMain} href={base + '/items/' + row.item.id + '#date-' + row.date.id}>
        <ReminderIcon productType={row.item.product_type} productName={row.item.product_name} template={row.item.template_key} category={row.item.category} preset={row.item.reminder_preset} brand={row.item.car_brand} motorcycleBrand={row.item.motorcycle_brand} subscriptionBrand={row.item.subscription_brand} utilityId={row.item.utility_id} insurerId={row.item.insurer_id} lenderId={row.item.lender_id} size={20} />
        <div className={styles.rowContent}><div className={styles.rowTitle}><strong>{row.item.product_name}</strong><CategoryBadge item={row.item} /></div><span className={styles.rowPurpose}><DateIcon kind={row.date.kind} label={row.date.label} preset={row.item.reminder_preset} size={13} />{[reminderProviderLabel(row.item), row.date.label].filter(Boolean).join(' · ')}</span><span className={styles.rowDate}><CalendarDays size={15} aria-hidden="true" />{formatDate(row.occurrence.due_on, true)}{alertStatus(row.item, row.date) === 'enabled' && <AlertState item={row.item} date={row.date} />}</span></div>
      </Link>
      <div className={styles.rowStatus}>
        <Link className={styles.rowAction} href={action.href} aria-label={`${action.label} for ${row.item.product_name} — ${row.date.label}`}>{action.label}</Link>
        <CountdownBadge row={row} today={today} />
      </div>
    </div>;
  }
  return <Link className="expiry-row" href={base + '/items/' + row.item.id + '#date-' + row.date.id}><ReminderIcon productType={row.item.product_type} productName={row.item.product_name} template={row.item.template_key} category={row.item.category} preset={row.item.reminder_preset} brand={row.item.car_brand} motorcycleBrand={row.item.motorcycle_brand} subscriptionBrand={row.item.subscription_brand} utilityId={row.item.utility_id} insurerId={row.item.insurer_id} lenderId={row.item.lender_id} size={20} /><div className="expiry-name"><strong className="reminder-name">{row.item.product_name}<AlertIndicator status={alertStatus(row.item, row.date)} /></strong><span className="date-caption"><DateIcon kind={row.date.kind} label={row.date.label} preset={row.item.reminder_preset} size={13} />{[reminderProviderLabel(row.item), row.date.label].filter(Boolean).join(' · ')}</span></div><div className="expiry-date"><strong>{dateStatus(row, today)}</strong><span>{formatDate(row.occurrence.due_on, true)}</span></div><ArrowRight size={15} /></Link>;
}
