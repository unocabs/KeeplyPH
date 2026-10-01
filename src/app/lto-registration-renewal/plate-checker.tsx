'use client';

import { useState } from 'react';
import Link from 'next/link';
import { addIntent } from '@/features/templates';
import { ltoSchedule, suggestedRenewalDate } from '@/lib/lto-schedule';
import styles from './page.module.css';

export function PlateChecker({ currentYear }: { currentYear: number }) {
  const [plate, setPlate] = useState('');
  const [year, setYear] = useState(String(currentYear));
  const [checked, setChecked] = useState(false);
  const result = checked ? ltoSchedule(plate, Number(year)) : null;
  const reminderDate = suggestedRenewalDate(plate, Number(year));
  function clearResult() { setChecked(false); }
  return <section id="renewal-calculator" className={`${styles.example} ${styles.calculator}`} aria-labelledby="calculator-heading">
    <span className="eyebrow">FREE · NO SIGN-IN NEEDED</span><h2 id="calculator-heading">Car registration renewal date calculator <a className={styles.headingAnchor} href="#renewal-calculator" aria-label="Link to renewal calculator">🔗</a></h2>
    <p>Check when to renew your car registration in the Philippines. Enter a regular car plate or just its last two digits to calculate the standard LTO renewal month and date window. Confirm the actual deadline using your registration record and current LTO advisories.</p>
    <form onSubmit={event => { event.preventDefault(); setChecked(true); }} className={styles.checker}>
      <label htmlFor="renewal-plate">Plate number or last two digits</label>
      <input id="renewal-plate" value={plate} onChange={event => { setPlate(event.target.value); clearResult(); }} placeholder="CCC 2398 or 98" autoComplete="off" spellCheck={false} maxLength={12} aria-describedby="plate-help" />
      <label htmlFor="renewal-year">Renewal year</label>
      <input id="renewal-year" type="number" min="2000" max="2100" required value={year} onChange={event => { setYear(event.target.value); clearResult(); }} />
      <div className={styles.checkerActions}><button type="submit" className="button primary">Check my renewal schedule</button>
        {reminderDate ? <Link className="button secondary" href={addIntent('car', 'registration', undefined, undefined, reminderDate)}>Set reminder →</Link> : <button type="button" className="button secondary" disabled>Set reminder →</button>}</div>
    </form>
    {reminderDate && <p className={styles.disclosure}>Suggested reminder date: <strong>{reminderDate}</strong> (window start). You can review and change it before saving.</p>}
    <div aria-live="polite" aria-atomic="true">
      {checked && (result ? <div className={styles.result}><strong>{result.month} {result.start}–{result.end}, {result.year}</strong><p>Standard renewal window. Last digit {result.last} → {result.month}; second-to-last digit {result.preceding} → days {result.start}–{result.end}.</p><p>Visit on a working day within this window. Holidays and LTO extensions can affect your actual deadline.</p></div> : <p className={styles.error}>Enter two digits (like 98), or a regular car plate with three letters and three or four digits (like CCC 2398). Choose a year from 2000 to 2100.</p>)}
    </div>
    <p id="plate-help" className={styles.disclosure}>Your plate stays in this page. “Set reminder” carries only the window’s start date into an editable reminder form, including through sign-in. Nothing is saved until you confirm the form. Choose the year from your registration record; this checker cannot tell whether you are overdue or still covered by an initial registration.</p>
    <p className={styles.source}>Based on the <a href="https://lto.gov.ph/wp-content/uploads/2023/10/FDM-vol.-2-2nd-Edition.pdf">LTO Filipino Driver’s Manual</a>, printed page 17. <a href="#schedule">See the plate number month and week tables ↓</a></p>
    <noscript><p>JavaScript is needed for the calculator. Use the <a href="#schedule">month and week tables below</a> to check your plate’s schedule.</p></noscript>
  </section>;
}
