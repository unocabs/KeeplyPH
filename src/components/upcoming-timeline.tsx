'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, X } from 'lucide-react';
import { daysUntil, formatDate } from '@/lib/domain';
import { alertStatus, dateStatus, type DateRow } from '@/features/items/domain';
import { timelineAlerts, timelineAlertGroups, timelinePosition } from '@/features/items/timeline';
import { itemCategory } from '@/features/templates/categories';
import { categoryLabel } from './item-ui';
import { lenderLabel } from '@/features/items/lenders';
import { ReminderIcon } from './reminder-icon';
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

export function UpcomingTimeline({ rows, today, base = '' }: { rows: DateRow[]; today: string; base?: string }) {
  const [selected, setSelected] = useState<DateRow | null>(null);
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const rowsId = useId();
  const alerts = selected ? timelineAlerts(selected, today) : [];
  const visible = rows.slice(0, expanded ? 10 : 5);
  const extraCount = Math.min(rows.length, 10) - 5;
  return <section className={styles.hero} aria-labelledby="coming-up-title">
    <div className={styles.header}><div><div className="eyebrow">COMING UP</div><h1 id="coming-up-title">A little less to remember</h1><p>Here’s what’s coming in the next 30 days.</p></div><AddItemButton demo={base === '/demo'} /></div>
    <div className={styles.calendar}>
    <div className={styles.scale} aria-hidden="true"><span className={styles.range}>Next 30 days</span><div className={styles.axis}>{[0, 7, 14, 21, 30].map(day => <span key={day} className={day === 7 || day === 21 ? styles.extraLabel : undefined} style={{ left: `${day / 30 * 100}%` }}>{day === 0 ? <>{shortDate(today)}<small>Today</small></> : shortDate(dayAfter(today, day))}</span>)}</div></div>
    <div className={styles.rows} id={rowsId}>
    <div className={styles.grid} aria-hidden="true">{[0, 7, 14, 21, 30].map(day => <span key={day} className={day === 0 ? styles.todayLine : undefined} style={{ left: `${day / 30 * 100}%` }} />)}</div>
    {visible.map(row => {
      const due = row.occurrence.due_on;
      return <div className={styles.row} key={row.item.id} data-category={itemCategory(row.item)}>
        <div className={styles.identity}><strong>{row.item.product_name}</strong><span>{lenderLabel(row.item) && <>{lenderLabel(row.item)} · </>}{row.date.label} · {daysUntil(due, today) === 0 ? 'Today' : shortDate(due)}</span></div>
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
          <button type="button" className={styles.due} style={{ left: `${timelinePosition(due, today)}%` }} title={[lenderLabel(row.item), row.date.label].filter(Boolean).join(' · ')} aria-label={`${row.item.product_name}${lenderLabel(row.item) ? ' · ' + lenderLabel(row.item) + ' · Loan' : ''} due ${formatDate(due)}. View reminder details`} aria-haspopup="dialog" onClick={event => { event.currentTarget.focus(); setSelected(row); dialog.current?.showModal(); }}>
            <ReminderIcon template={row.item.template_key} category={row.item.category} preset={row.item.reminder_preset} brand={row.item.car_brand} motorcycleBrand={row.item.motorcycle_brand} subscriptionBrand={row.item.subscription_brand} lenderId={row.item.lender_id} size={20} />
          </button>
        </div>
      </div>;
    })}</div>
    <div className={styles.footer}>
      <div className={styles.footerSummary}><div className={styles.legend}><span><i aria-hidden="true" />Alert</span><span><CalendarDays size={15} aria-hidden="true" />Due date</span></div>{rows.length > 5 && <Link href={base + '/items?filter=upcoming'}>View all upcoming <ArrowRight size={14} aria-hidden="true" /></Link>}</div>
      {extraCount > 0 && <button type="button" className={styles.expand} aria-expanded={expanded} aria-controls={rowsId} onClick={event => { event.currentTarget.focus(); setExpanded(value => !value); }}>{expanded ? 'Show less' : `Show more · ${extraCount} more`}</button>}
    </div>
    </div>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="section-heading"><h2 id={titleId}>{selected?.item.product_name}</h2><button type="button" className="icon-button" aria-label="Close reminder details" onClick={() => dialog.current?.close()}><X size={21} aria-hidden="true" /></button></div>
      {selected && <><p className={styles.caption}>{[categoryLabel(itemCategory(selected.item)), lenderLabel(selected.item), selected.date.label].filter(Boolean).join(' · ')}</p>
        <div className={styles.detailDue}><span>Due {formatDate(selected.occurrence.due_on)}</span><strong>{dateStatus(selected, today).replace('remaining', 'left')}</strong></div>
        <h3>Alerts {alertStatus(selected.item, selected.date) === 'enabled' ? 'enabled' : alertStatus(selected.item, selected.date) === 'paused' ? 'paused' : 'off'}</h3>
        {alerts.length ? <ul className={styles.alertList}>{alerts.map(alert => <li key={alert.on}><span>{formatDate(alert.on)}</span><small>{alert.channels.map(channel => channelNames[channel]).join(' / ')}</small></li>)}</ul> : <p className={styles.caption}>No alerts scheduled in the next 30 days.</p>}
        <Link className="button primary" href={base + '/items/' + selected.item.id + '#date-' + selected.date.id} onClick={() => dialog.current?.close()}>View reminder <ArrowRight size={16} aria-hidden="true" /></Link>
      </>}
    </dialog>
  </section>;
}
