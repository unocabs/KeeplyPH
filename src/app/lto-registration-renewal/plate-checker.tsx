'use client';

import { useState } from 'react';
import { ltoSchedule } from '@/lib/lto-schedule';
import styles from './page.module.css';

export function PlateChecker({ currentYear }: { currentYear: number }) {
  const [plate, setPlate] = useState('');
  const [year, setYear] = useState(String(currentYear));
  const [checked, setChecked] = useState(false);
  const result = checked ? ltoSchedule(plate, Number(year)) : null;
  function clearResult() { setChecked(false); }
  return <aside id="renewal-calculator" className={styles.example}>
    <span className="eyebrow">CHECK YOUR PLATE</span><h3>Find your renewal window <a className={styles.headingAnchor} href="#renewal-calculator" aria-label="Link to renewal calculator">🔗</a></h3>
    <p>Enter a regular car plate or just its last two digits.</p>
    <form onSubmit={event => { event.preventDefault(); setChecked(true); }} className={styles.checker}>
      <label htmlFor="renewal-plate">Plate number or last two digits</label>
      <input id="renewal-plate" value={plate} onChange={event => { setPlate(event.target.value); clearResult(); }} placeholder="CCC 2398 or 98" autoComplete="off" spellCheck={false} maxLength={12} aria-describedby="plate-help" />
      <label htmlFor="renewal-year">Renewal year</label>
      <input id="renewal-year" type="number" min="2000" max="2100" required value={year} onChange={event => { setYear(event.target.value); clearResult(); }} />
      <button type="submit" className="button primary">Check schedule</button>
    </form>
    <div aria-live="polite" aria-atomic="true">
      {checked && (result ? <div className={styles.result}><strong>{result.month} {result.start}–{result.end}, {result.year}</strong><p>Standard renewal window. Last digit {result.last} → {result.month}; second-to-last digit {result.preceding} → days {result.start}–{result.end}.</p><p>Visit on a working day within this window. Holidays and LTO extensions can affect your actual deadline.</p></div> : <p className={styles.error}>Enter two digits (like 98), or a regular car plate with three letters and three or four digits (like CCC 2398). Choose a year from 2000 to 2100.</p>)}
    </div>
    <p id="plate-help" className={styles.disclosure}>Your entry stays in this page and is not saved or sent. Choose the year from your registration record; this checker cannot tell whether you are overdue or still covered by an initial registration.</p>
    <noscript><p>Use the month and week tables above to check your plate’s schedule.</p></noscript>
  </aside>;
}
