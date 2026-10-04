import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { capabilities } from '@/features/entitlements/domain';
import type { ItemWithDetails } from '@/features/items/domain';
import type { Usage } from '@/lib/domain';
import { ReminderIcon } from './reminder-icon';

export function ReminderSaved({ id, usage, coverage, deliveryPaused, created, ideasEnabled, dateAlertsEnabled }: {
  id: string; usage: Usage; coverage: ItemWithDetails['coverage']; deliveryPaused?: boolean; created: boolean; ideasEnabled?: boolean; dateAlertsEnabled?: boolean;
}) {
  const { slots, used, available } = capabilities(usage);
  const first = created && usage.purchases === 1;
  const full = available === 0;
  return <section className="panel reminder-saved space-bottom" aria-label="Reminder saved">
    <div role="status">
      <h2 className="reminder-saved-title"><CheckCircle2 size={22} aria-hidden="true" />Your reminder is {created ? 'saved' : 'updated'}.</h2>
      <p className="reminder-saved-usage">You’re using <strong>{used} of {slots}{slots === 3 ? ' free' : ''} alert slots</strong>. {full
        ? 'All your alert slots are in use.'
        : <>You have <strong>{available} {available === 1 ? 'slot' : 'slots'} available</strong> for more reminders.</>}</p>
      {dateAlertsEnabled === false && coverage !== 'off' && <p className="hint">Alerts are off for the date you just added. Your other dates keep their alert settings.</p>}
      {coverage === 'off' && <p className="hint">Alerts are off for this reminder. Saving it does not use an alert slot.</p>}
      {coverage === 'paused_capacity' && <p className="hint">This reminder is saved, but it needs an available alert slot before it can send alerts.</p>}
      {coverage === 'covered' && deliveryPaused && <p className="hint">An alert slot is assigned to this reminder, but delivery is paused by your account settings. Check Alert Options.</p>}
    </div>
    {first && <>
      {!ideasEnabled && <p className="hint spaced">Want occasional ideas for more useful reminders? <Link className="text-button" href="/settings/alerts">Choose Reminder ideas &amp; tips in Alert Options →</Link></p>}
      <h3 className="spaced">What else would you like to remember?</h3>
      <div className="reminder-saved-suggestions">
        <Link href="/add/other?preset=personal-loan"><ReminderIcon template="other" preset="personal-loan" size={20} />Loan payment</Link>
        <Link href="/add/other?preset=other-bill"><ReminderIcon template="other" preset="other-bill" size={20} />Bill</Link>
        <Link href="/add/receipt?focus=warranty"><ReminderIcon template="receipt" size={20} />Warranty</Link>
        <Link href="/add"><ReminderIcon template="other" size={20} />Another important date</Link>
      </div>
    </>}
    {full && <p className="reminder-saved-usage">You can keep saving unlimited reminders. To enable alerts for more, view alert packs or manage your active alerts.</p>}
    <div className="reminder-saved-actions">
      {created && <Link className="button secondary" href="/add">Add another reminder</Link>}
      {full && <><Link className="button primary" href="/pricing">View alert packs</Link><Link className="text-button" href="/items?filter=reminders">Manage active alerts</Link></>}
      <Link className="text-button" href={'/items/' + id} replace scroll={false}>Done for now</Link>
    </div>
    {!full && <p className="hint spaced">Need more alerts? <Link className="text-button" href="/pricing">See pricing →</Link></p>}
  </section>;
}
