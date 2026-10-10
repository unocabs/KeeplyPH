import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import type { ItemWithDetails } from '@/features/items/domain';
import type { Usage } from '@/lib/domain';
import { ReminderIcon } from './reminder-icon';

export function ReminderSaved({ id, usage, coverage, deliveryPaused, created, ideasEnabled, dateAlertsEnabled }: {
  id: string; usage: Usage; coverage: ItemWithDetails['coverage']; deliveryPaused?: boolean; created: boolean; ideasEnabled?: boolean; dateAlertsEnabled?: boolean;
}) {
  const first = created && usage.purchases === 1;
  return <section className="panel reminder-saved space-bottom" aria-label="Reminder saved">
    <div role="status">
      <h2 className="reminder-saved-title"><CheckCircle2 size={22} aria-hidden="true" />Your reminder is {created ? 'saved' : 'updated'}.</h2>
      <p className="reminder-saved-usage">Your household details are together, ready when you need them.</p>
      {dateAlertsEnabled === false && coverage !== 'off' && <p className="hint">Alerts are off for the date you just added. Your other dates keep their alert settings.</p>}
      {coverage === 'off' && <p className="hint">Alerts are off for this reminder. You can enable them whenever you’re ready.</p>}
      {coverage === 'paused_capacity' && <p className="hint">This reminder is saved. Review its alert settings to enable delivery.</p>}
      {coverage === 'covered' && deliveryPaused && <p className="hint">Alerts are selected for this reminder, but delivery is paused by your account settings. Check Alert Options.</p>}
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
    <div className="reminder-saved-actions">
      {created && <Link className="button secondary" href="/add">Add another reminder</Link>}
      <Link className="text-button" href={'/items/' + id} replace scroll={false}>Done for now</Link>
    </div>
    <p className="hint spaced">See your dates together in the <Link className="text-button" href="/planner">household planner →</Link></p>
  </section>;
}
