// Temporary local review page. Remove before committing or deploying.
import { notFound } from 'next/navigation';
import { UpcomingTimeline } from '@/components/upcoming-timeline';
import { timelineRows } from '@/features/items/timeline';
import dashboardStyles from '@/components/dashboard.module.css';
import { Dashboard } from '@/components/dashboard';
import { sampleItems } from '@/lib/demo';
import { addMonths, type Usage } from '@/lib/domain';
import { AppShell } from '@/components/app-shell';
export const metadata = { title: 'Local timeline preview', robots: { index: false, follow: false } };
export default async function Review({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { state } = await searchParams;
  const today = '2026-10-05';
  const examples = sampleItems(today);
  const items = state === 'empty' ? [] : [examples[0], examples[3], examples[8], examples[6], examples[5], examples[4]].slice(0, ['one', 'today', 'edge', 'off'].includes(state || '') ? 1 : 6);
  if (state === 'today' || state === 'edge') {
    const date = items[0].dates[0];
    const occurrence = date.occurrences.find(occurrence => occurrence.status === 'open')!;
    const value = new Date(today + 'T00:00:00Z');
    value.setUTCDate(value.getUTCDate() + (state === 'edge' ? 30 : 0));
    occurrence.due_on = value.toISOString().slice(0, 10);
    date.offsets.push({ unit: 'days', value: 0 });
  }
  if (state === 'off') items[0].coverage = 'off';
  // Populate this local fixture from the demo's configured offsets, never arbitrary chart dots.
  for (const item of items) for (const date of item.dates) {
    const due = date.occurrences.find(occurrence => occurrence.status === 'open')?.due_on;
    if (!due || !date.reminders_enabled || item.coverage !== 'covered') continue;
    date.scheduled_alerts = date.offsets.map(offset => {
      const value = new Date(due + 'T00:00:00Z');
      value.setUTCDate(value.getUTCDate() - offset.value);
      return { on: offset.unit === 'months' ? addMonths(due, -offset.value) : value.toISOString().slice(0, 10), channel: 'email' as const };
    }).filter(alert => alert.on >= today);
  }
  const usage: Usage = { purchases: 8, reminders: 3, storage_bytes: 0, premium: false, premium_until: null };
  return <AppShell name="Preview" hasExtraSlots demo><div><p style={{ marginBottom: '16px', color: 'var(--muted)' }}>Local preview · Sample reminders and alert dates</p>{items.length ? <><div className={dashboardStyles.dashboard}><UpcomingTimeline rows={timelineRows(items, today)} today={today} base="/demo" /></div><div className="local-timeline-body"><style>{'.local-timeline-body > div > .page-heading { display: none; }'}</style><Dashboard items={items} usage={usage} name="Preview" today={today} demo /></div></> : <Dashboard items={items} usage={usage} name="Preview" today={today} />}</div></AppShell>;
}
