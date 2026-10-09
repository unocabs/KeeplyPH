import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/domain';
import type { UnconfirmedSummary } from '@/features/items/activity';
import type { DateRow } from '@/features/items/domain';
import styles from './dashboard.module.css';

export function ReminderReviewRows({ summary, rows = [], base = '' }: { summary: UnconfirmedSummary; rows?: DateRow[]; base?: string }) {
  const reminders = [
    ...rows.map(row => ({ item_id: row.item.id, product_name: row.item.product_name, date_id: row.date.id, occurrence_id: row.occurrence.id, due_on: row.occurrence.due_on, label: row.date.label })),
    ...summary.rows,
  ].sort((a, b) => a.due_on.localeCompare(b.due_on) || a.occurrence_id.localeCompare(b.occurrence_id));
  return <div className={styles.reviewRows}>{reminders.map(row => <Link className={styles.pastReminder} key={row.occurrence_id} href={base + '/items/' + row.item_id + '?' + new URLSearchParams({ date: row.date_id, occurrence: row.occurrence_id, action: 'complete', due: row.due_on }) + '#date-' + row.date_id}><div><strong>{row.product_name}</strong><span>{row.label} · Scheduled {formatDate(row.due_on)}</span></div><span className={styles.reviewAction}>Review <ArrowRight size={15} aria-hidden="true" /></span></Link>)}</div>;
}

export function OccurrenceReviewList({ summary, paged = false, base = '' }: { summary: UnconfirmedSummary; paged?: boolean; base?: string }) {
  const last = summary.rows.at(-1);
  return <><Link className="back-link" href={base + '/items?filter=overdue'}>← Overdue or expired</Link><div className="page-heading"><div><h1>Past reminders to check</h1><p>{summary.total} {summary.total === 1 ? 'reminder has' : 'reminders have'} not been marked done.</p><p className="hint">Mark anything you’ve already taken care of. A later reminder does not confirm an earlier payment or service.</p></div></div>
    <section className="panel">{!summary.rows.length && <p>{summary.total ? 'You have reached the end of this list.' : 'You’re all caught up. No past reminders to check.'}</p>}
      <ReminderReviewRows summary={summary} base={base} />
      {summary.has_more && last && <Link className="button secondary spaced" href={base + '/items/review?' + new URLSearchParams({ before: last.due_on, id: last.occurrence_id })}>More past reminders →</Link>}
      {paged && <Link className="text-button spaced" href={base + '/items/review'}>Back to the first page</Link>}
    </section></>;
}

export function OverdueReminderList({ rows, summary, base = '', currentNext, pastNext, paged = false }: { rows: DateRow[]; summary: UnconfirmedSummary; base?: string; currentNext?: string; pastNext?: string; paged?: boolean }) {
  return <><Link className="back-link" href={base + '/dashboard'}>← Your household</Link><div className="page-heading"><div><h1>Overdue or expired</h1><p>Past dates and reminders you haven’t marked done, together in one place.</p></div></div><section className="panel"><ReminderReviewRows rows={rows} summary={summary} base={base} />{!rows.length && !summary.rows.length && <p>{paged ? 'You have reached the end of this list.' : 'You’re all caught up. No overdue reminders.'}</p>}<p className="hint spaced">A repeating schedule does not confirm an earlier payment or service. Review each reminder to record what happened.</p></section><div className={styles.reviewPagination}>{paged && <Link className="button secondary" href={base + '/items?filter=overdue'}>First page</Link>}{currentNext && <Link className="button secondary" href={currentNext}>More overdue items →</Link>}{pastNext && <Link className="button secondary" href={pastNext}>More past reminders →</Link>}</div></>;
}
