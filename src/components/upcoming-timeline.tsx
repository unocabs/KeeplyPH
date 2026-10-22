'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, X } from 'lucide-react';
import { daysUntil, formatDate, formatMoney } from '@/lib/domain';
import { dateStatus, type DateRow } from '@/features/items/domain';
import { dateAction } from '@/features/items/date-action';
import { occurrenceAmount } from '@/features/items/planning';
import { recurrenceFrequencies } from '@/features/items/recurrence';
import { timelineAlertGroups, timelinePosition } from '@/features/items/timeline';
import { itemCategory, paymentDate, presetCategory } from '@/features/templates/categories';
import { categoryLabel } from './item-ui';
import { reminderProviderLabel } from '@/features/items/provider-label';
import { ReminderIcon, ItemIdentityIcon } from './reminder-icon';
import { AddItemButton } from './template-picker';
import styles from './upcoming-timeline.module.css';

const channelNames = { email: 'Email', push: 'Device', sms: 'SMS' };
function shortDate(on: string) {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(on + 'T00:00:00Z'));
}
function dayAfter(today: string, days: number) {
  const date = new Date(today + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function UpcomingDateSummary({ row, today, base = '', titleId, onClose }: {
  row: DateRow; today: string; base?: string; titleId: string; onClose: () => void;
}) {
  const { item, date, occurrence } = row;
  const amount = occurrenceAmount(date, occurrence);
  const payment = paymentDate(item.reminder_preset, date.kind, date.label);
  const service = date.kind === 'service' || presetCategory(item.reminder_preset) === 'maintenance';
  const warranty = date.kind === 'warranty';
  const hasCost = !warranty && (payment || amount.amount != null || date.payment_amount_minor != null || occurrence.amount_certainty != null);
  const amountLabel = amount.amount != null && amount.certainty === 'estimated' ? 'Estimated amount' : 'Amount';
  const frequency = !warranty && recurrenceFrequencies.find(entry => entry.months === date.recurrence_months)?.label;
  const provider = reminderProviderLabel(item);
  const context = [provider && !item.product_name?.toLowerCase().includes(provider.toLowerCase()) ? provider : null, date.label, frequency].filter(Boolean).join(' · ');
  const note = date.notes?.trim() || item.notes?.trim();
  const amountHref = `${base}/items/${item.id}?${new URLSearchParams({ date: date.id, occurrence: occurrence.id, action: 'amount' })}#date-${date.id}`;
  const nextAction = dateAction(row, base);
  const action = payment && amount.amount == null ? { label: 'Add amount', href: amountHref }
    : { ...nextAction, label: nextAction.label === 'Mark paid' ? 'Record payment' : nextAction.label === 'Mark service done' ? 'Record service' : nextAction.label };
  const timing = warranty && occurrence.due_on === today ? 'Expires today' : dateStatus(row, today).replace('remaining', 'left');
  const proof = warranty && item.template_key === 'receipt';

  return <>
    <div className={styles.detailHeader}>
      <div className={styles.detailIdentity}><ItemIdentityIcon item={item} size={22}/><div><h2 id={titleId}>{item.product_name}</h2><p className={styles.detailContext}>{context}</p></div></div>
      <button type="button" className={styles.detailClose} aria-label="Close reminder details" onClick={onClose}><X size={21} aria-hidden="true" /></button>
    </div>
    <div className={styles.detailValue}>
      <p className={styles.valueLabel}>{payment ? amountLabel : warranty ? 'Recorded warranty expiry' : service ? 'Service due' : date.kind === 'expiration' ? 'Recorded expiry' : 'Due date'}</p>
      <p className={payment ? styles.amountValue : styles.dateValue}>{payment ? amount.amount == null ? <span className={styles.unknownAmount}>Amount not set</span> : formatMoney(amount.amount) : formatDate(occurrence.due_on)}</p>
      {payment && <p className={styles.paymentDue}>Due {formatDate(occurrence.due_on)}</p>}
      <p className={styles.detailTiming} data-due-today={occurrence.due_on === today ? '' : undefined}>{timing}</p>
      {!payment && hasCost && <div className={styles.supportingAmount}><p className={styles.valueLabel}>{amountLabel}</p><p>{amount.amount == null ? <>Amount not set{!item.archived_at && occurrence.status === 'open' && <> · <Link href={amountHref} onClick={onClose}>Add amount</Link></>}</> : formatMoney(amount.amount)}</p></div>}
    </div>
    {note && <p className={styles.detailNote}>{note}</p>}
    <div className={styles.detailActions}>
      {!item.archived_at && occurrence.status === 'open' && <Link className="button primary" href={action.href} onClick={onClose}>{action.label} <ArrowRight size={16} aria-hidden="true" /></Link>}
      <Link className={styles.recordLink} href={proof ? `${base}/purchases/${item.id}` : `${base}/items/${item.id}#date-${date.id}`} onClick={onClose}>{proof ? 'View receipt & purchase details' : 'View full record'}</Link>
    </div>
  </>;
}

export function UpcomingTimeline({ rows, today, base = '', embedded = false }: { rows: DateRow[]; today: string; base?: string; embedded?: boolean }) {
  const [selection, setSelected] = useState<DateRow | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [pointerFocusedDate, setPointerFocusedDate] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const rowsId = useId();
  const selected = rows.find(row => row.date.id === selection?.date.id && row.occurrence.id === selection.occurrence.id);
  useEffect(() => {
    if (selected) { if (!dialog.current?.open) dialog.current?.showModal(); }
    else dialog.current?.close();
  }, [selected]);
  const visible = rows.slice(0, expanded ? 10 : 5);
  const extraCount = Math.min(rows.length, 10) - 5;
  return <section className={embedded ? styles.embedded : styles.hero} aria-labelledby="coming-up-title">
    {embedded ? <h3 id="coming-up-title" className="sr-only">Calendar of upcoming dates</h3> : <div className={styles.header}><div><div className="eyebrow">COMING UP</div><h1 id="coming-up-title">A little less to remember</h1><p>Here’s what’s coming in the next 30 days.</p></div><AddItemButton demo={base === '/demo'} /></div>}
    <div className={styles.calendar}>
    <div className={styles.scale} aria-hidden="true"><span className={styles.range}>Next 30 days</span><div className={styles.axis}>{[0, 7, 14, 21, 30].map(day => <span key={day} className={day === 7 || day === 21 ? styles.extraLabel : undefined} style={{ left: `${day / 30 * 100}%` }}>{day === 0 ? <>{shortDate(today)}<small>Today</small></> : shortDate(dayAfter(today, day))}</span>)}</div></div>
    <div className={styles.rows} id={rowsId}>
    <div className={styles.grid} aria-hidden="true">{[0, 7, 14, 21, 30].map(day => <span key={day} className={day === 0 ? styles.todayLine : undefined} style={{ left: `${day / 30 * 100}%` }} />)}</div>
    {visible.map(row => {
      const due = row.occurrence.due_on;
      const dueToday = due === today;
      return <div className={styles.row} key={row.date.id} data-category={itemCategory(row.item)}>
        <div className={styles.identity}><strong>{row.item.product_name}</strong><span>{reminderProviderLabel(row.item) && <>{reminderProviderLabel(row.item)} · </>}{row.date.label} · {daysUntil(due, today) === 0 ? 'Today' : shortDate(due)}</span></div>
        <div className={styles.track}>
          {timelineAlertGroups(row, today).map(group => {
            const first = group[0].on;
            const last = group.at(-1)!.on;
            const span = daysUntil(last, first);
            const labels = group.map(alert => `${alert.channels.map(channel => channelNames[channel]).join(' / ')} alert · ${formatDate(alert.on)}`);
            const position = timelinePosition(first, today);
            return <span className={styles.alertMarker} style={{ left: `${position}%`, width: `calc(${span / 30 * 100}% + 24px)` }} key={first} data-edge={position < 20 ? 'start' : timelinePosition(last, today) > 80 ? 'end' : undefined}>
              <button type="button" className={styles.alert} aria-label={`${row.item.product_name}: ${labels.join('; ')}`} aria-describedby={`${row.date.id}-alert-${first}`}>
                {group.map(alert => <span key={alert.on} aria-hidden="true" style={{ left: `calc(12px + (100% - 24px) * ${span ? daysUntil(alert.on, first) / span : 0})` }} />)}
              </button>
              <span role="tooltip" id={`${row.date.id}-alert-${first}`} className={styles.tooltip}>{labels.map(label => <span key={label}>{label}</span>)}</span>
            </span>;
          })}
          <button type="button" className={styles.due} data-due-today={dueToday ? '' : undefined} data-pointer-focus={pointerFocusedDate === row.date.id ? '' : undefined} style={{ left: `${timelinePosition(due, today)}%` }} title={[reminderProviderLabel(row.item), row.date.label].filter(Boolean).join(' · ')} aria-label={`${row.item.product_name}${reminderProviderLabel(row.item) ? ' · ' + reminderProviderLabel(row.item) + ' · ' + categoryLabel(itemCategory(row.item)) : ''} due ${dueToday ? 'today, ' : ''}${formatDate(due)}. View reminder details`} aria-haspopup="dialog" onPointerDown={() => setPointerFocusedDate(row.date.id)} onKeyDown={() => setPointerFocusedDate(null)} onBlur={() => { if (!dialog.current?.open) setPointerFocusedDate(null); }} onClick={event => { setPointerFocusedDate(event.detail > 0 ? row.date.id : null); event.currentTarget.focus(); setSelected(row); }}>
            <ReminderIcon productType={row.item.product_type} productName={row.item.product_name} template={row.item.template_key} category={row.item.category} preset={row.item.reminder_preset} brand={row.item.car_brand} motorcycleBrand={row.item.motorcycle_brand} subscriptionBrand={row.item.subscription_brand} utilityId={row.item.utility_id} insurerId={row.item.insurer_id} lenderId={row.item.lender_id} size={20} />
            {dueToday && <span className={styles.todayBadge} aria-hidden="true">Today</span>}
          </button>
        </div>
      </div>;
    })}</div>
    <div className={styles.footer}>
      <div className={styles.footerSummary}><div className={styles.legend}><span><i aria-hidden="true" />Alert</span><span><CalendarDays size={15} aria-hidden="true" />Due date</span></div>{(embedded || rows.length > 5) && <Link href={base + '/items?filter=upcoming'}>View all upcoming <ArrowRight size={14} aria-hidden="true" /></Link>}</div>
      {extraCount > 0 && <button type="button" className={styles.expand} aria-expanded={expanded} aria-controls={rowsId} onClick={event => { event.currentTarget.focus(); setExpanded(value => !value); }}>{expanded ? 'Show less' : `Show more · ${extraCount} more`}</button>}
    </div>
    </div>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onClose={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      {selected && <UpcomingDateSummary row={selected} today={today} base={base} titleId={titleId} onClose={() => dialog.current?.close()}/>}
    </dialog>
  </section>;
}
