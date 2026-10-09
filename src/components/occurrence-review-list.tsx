import Link from 'next/link';
import { formatDate } from '@/lib/domain';
import type { UnconfirmedSummary } from '@/features/items/activity';

export function OccurrenceReviewList({ summary, paged = false, base = '' }: { summary: UnconfirmedSummary; paged?: boolean; base?: string }) {
  const last = summary.rows.at(-1);
  return <><Link className="back-link" href={base + "/dashboard"}>← Your household</Link><div className="page-heading"><div><h1>Occurrences to review</h1><p>{summary.total} {summary.total === 1 ? 'occurrence has' : 'occurrences have'} not been marked completed.</p><p className="hint">Review what happened. A later cycle never confirms an earlier payment or service.</p></div></div>
    <section className="panel">{!summary.rows.length && <p>{summary.total ? 'You have reached the end of this list.' : 'No unconfirmed occurrences to review.'}</p>}
      {summary.rows.map(row => <div className="file-row" key={row.occurrence_id}><div><strong>{row.product_name}</strong><p className="hint">{row.label} · Scheduled {formatDate(row.due_on)}</p></div><Link className="text-button" href={base + '/items/' + row.item_id + '?' + new URLSearchParams({ date:row.date_id,occurrence:row.occurrence_id,action:'complete',due:row.due_on }) + '#date-' + row.date_id}>Review</Link></div>)}
      {summary.has_more && last && <Link className="button secondary spaced" href={base + '/items/review?' + new URLSearchParams({ before:last.due_on,id:last.occurrence_id })}>Next occurrences →</Link>}
      {paged && <Link className="text-button spaced" href={base + "/items/review"}>Back to the first page</Link>}
    </section></>;
}
