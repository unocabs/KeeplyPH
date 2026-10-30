'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { addIntent } from '@/features/templates';
import { formatDate, todayIn } from '@/lib/domain';
import { planAirconCleaning } from '@/lib/aircon-plan';
import styles from './page.module.css';

export function CleaningPlanner({ today }: { today: string }) {
  const [last, setLast] = useState('');
  const [interval, setInterval] = useState('');
  const [custom, setCustom] = useState('');
  const [unknown, setUnknown] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof planAirconCleaning> | null>(null);
  const lastInput = useRef<HTMLInputElement>(null);
  const intervalInput = useRef<HTMLSelectElement>(null);
  const customInput = useRef<HTMLInputElement>(null);
  const chosen = interval === 'custom' ? custom : interval;
  const error = result && 'error' in result ? result : null;
  const computed = result && 'plan' in result ? result : null;
  function clear() { setResult(null); }

  return <section id="cleaning-planner" className={styles.planner} aria-labelledby="planner-title">
    <div className={styles.plannerHeading}><span className={styles.eyebrow}>A DATE YOU CAN PLAN AROUND</span><h2 id="planner-title">When is your next<br className={styles.desktopBreak} /> professional clean?</h2><p>Use your last completed visit and the interval recommended for your unit. Check your manual or ask your technician if you are unsure.</p></div>
    <div className={styles.plannerGrid}>
      <div>
        <label className={styles.unknownChoice}><input type="checkbox" checked={unknown} onChange={event => { setUnknown(event.target.checked); clear(); }} /><span>I don’t know the last cleaning date</span></label>
        {unknown ? <div className={styles.unknownHelp} role="status"><h3>Start with the service history.</h3><p>Ask your landlord or previous provider for the record. If it is unavailable, tell a qualified technician the history is unknown and arrange an assessment.</p><p>Record the work actually completed after the visit. You can then plan from that date.</p><a href="#booking-checklist" className={styles.inlineLink}>Prepare for a service visit <ArrowRight size={16} aria-hidden="true" /></a></div> : <form noValidate onSubmit={event => {
          event.preventDefault();
          const next = planAirconCleaning(last, chosen, todayIn());
          setResult(next);
          if ('error' in next) (next.field === 'last' ? lastInput.current : interval === 'custom' ? customInput.current : intervalInput.current)?.focus();
        }}>
          <label className={styles.field} htmlFor="last-cleaned">Last professional cleaning date<input ref={lastInput} id="last-cleaned" type="date" min="1900-01-01" max={today} required value={last} onChange={event => { setLast(event.target.value); clear(); }} aria-describedby={error?.field === 'last' ? 'last-error' : 'last-help'} aria-invalid={error?.field === 'last' || undefined} /></label>
          <p id="last-help" className={styles.fieldHelp}>Use a completed professional clean, rather than a filter rinse.</p>
          {error?.field === 'last' && <p id="last-error" className={styles.error} role="alert">{error.error}</p>}
          <label className={styles.field} htmlFor="cleaning-interval">Your recommended service interval<select ref={intervalInput} id="cleaning-interval" required value={interval} onChange={event => { setInterval(event.target.value); clear(); }} aria-describedby={error?.field === 'interval' ? 'interval-error' : 'interval-help'} aria-invalid={error?.field === 'interval' || undefined}><option value="">Choose your interval</option>{[3, 4, 6, 12].map(months => <option key={months} value={months}>{months} months</option>)}<option value="custom">Another interval</option></select></label>
          {interval === 'custom' && <label className={styles.field} htmlFor="custom-interval">Service interval in months<input ref={customInput} id="custom-interval" type="number" inputMode="numeric" min={1} max={120} step={1} required value={custom} onChange={event => { setCustom(event.target.value); clear(); }} aria-describedby={error?.field === 'interval' ? 'interval-error' : 'interval-help'} aria-invalid={error?.field === 'interval' || undefined} /></label>}
          <p id="interval-help" className={styles.fieldHelp}>These are choices, not a recommendation. <a href="#schedule">Read the schedule guidance</a>.</p>
          {error?.field === 'interval' && <p id="interval-error" className={styles.error} role="alert">{error.error}</p>}
          <button className={styles.primary} type="submit">Calculate my next clean <ArrowRight size={17} aria-hidden="true" /></button>
        </form>}
      </div>
      <div className={styles.result} aria-live="polite" aria-atomic="true">
        {computed && !unknown ? <>
          <CalendarDays size={24} aria-hidden="true" /><p className={styles.eyebrow}>NEXT PLANNED PROFESSIONAL CLEAN</p>
          <p className={styles.resultDate}><time dateTime={computed.plan.serviceDate}>{formatDate(computed.plan.serviceDate)}</time></p>
          <p>{formatDate(computed.last)} + {computed.plan.serviceInterval} {computed.plan.serviceInterval === 1 ? 'month' : 'months'}.</p>
          {computed.plan.serviceDate < todayIn() ? <p className={styles.pastPlan}>This planned date has passed. Review the service history and arrange the next appropriate visit. It does not tell us the unit’s condition.</p> : <p>A planning date based on your chosen interval. Symptoms or your technician’s assessment may call for a visit sooner.</p>}
          <p className={styles.fieldHelp}>If that day does not exist in the target month, we use its last day.</p>
          <Link className={styles.primary} href={addIntent('aircon', undefined, undefined, undefined, undefined, computed.plan)}>Save this plan in Keeply <ArrowRight size={17} aria-hidden="true" /></Link>
          <p className={styles.fieldHelp}>Google sign-in is required to save. Review your date and interval in the form. Alerts are optional; nothing is saved until you submit.</p>
        </> : <>
          <CalendarDays size={28} aria-hidden="true" /><h3>{unknown ? 'No date to guess.' : 'A little less calendar maths.'}</h3>
          <p>{unknown ? 'Keep the history unknown until you have a service record or a completed visit.' : 'Your next planned date will appear here, along with the interval you chose.'}</p>
          <div className={styles.resultNote}><strong>Two tasks, kept separate.</strong><p>A filter rinse or a self-clean cycle does not restart your professional-service schedule.</p></div>
          <p className={styles.fieldHelp}>No account needed to calculate. Your entries stay on this page until you choose to carry the plan into Keeply.</p>
        </>}
      </div>
    </div>
    <noscript><style>{`.${styles.plannerGrid}{display:none}`}</style><p className={styles.noScript}>The calculator needs JavaScript. Add your agreed number of calendar months to the last professional cleaning date, using the last day if needed. For example, October 29 plus four months is February 28 in 2027. The guide below is available without the calculator.</p></noscript>
  </section>;
}
