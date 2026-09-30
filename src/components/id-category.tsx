'use client';
import Link from 'next/link';
import { useId, useRef } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { reminderPresets, loanPresetKeys, type ReminderPreset } from '@/features/templates';
import { ReminderIcon } from './reminder-icon';

export function IdCategory({ demo = false, card = false, onChoose, group = 'ids' }: { demo?: boolean; card?: boolean; onChoose?: () => void; group?: 'ids' | 'clearances' | 'loans' }) {
  const isId = group === 'ids';
  const isLoan = group === 'loans';
  const label = isId ? 'IDs' : isLoan ? 'Loans' : 'Clearances';
  const icon = isId ? 'licence' : 'other';
  const presetKeys: ReminderPreset[] = isId ? ['prc-license', 'postal-id', 'pwd-solo-parent-id', 'other-id'] : isLoan ? [...loanPresetKeys] : ['nbi-clearance', 'police-clearance'];
  const choices = [
    ...(isId ? [['Driver’s License', 'Remember your printed expiration date.', '/add/licence']] : []),
    ...presetKeys.map(key => [reminderPresets[key].label, reminderPresets[key].description, '/add/other?preset=' + key]),
  ];
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return <>
    <button type="button" className={card ? 'category-card' : 'template-choice'} aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
      <ReminderIcon template={icon} />
      <div><strong>{label}{card && <ArrowRight size={17} aria-hidden="true" />}</strong><p>{isId ? 'Driver’s License, PRC License, Postal ID and more.' : isLoan ? 'Personal, home, car, business and other loan payments.' : 'NBI and Police Clearance dates and appointments.'}</p></div>
    </button>
    <dialog ref={dialog} className="template-dialog" aria-labelledby={titleId} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="section-heading"><h2 id={titleId}>{isId ? 'Which ID would you like to add?' : isLoan ? 'Which loan would you like to add?' : 'Which clearance would you like to add?'}</h2><button type="button" className="icon-button" aria-label={isId ? "Close ID picker" : isLoan ? "Close loan picker" : "Close clearance picker"} onClick={() => dialog.current?.close()}><X /></button></div>
      <p className="section-description">{isLoan ? 'Choose a loan, then add your next payment, frequency and end date.' : 'Choose your document, then add the date you want to remember. No identity numbers or scans needed.'}</p>
      <div className="template-grid">{choices.map(([label, description, href]) => <Link key={label} className="template-choice" href={(demo ? '/demo' : '') + href} onClick={() => { dialog.current?.close(); onChoose?.(); }}><ReminderIcon template={icon} /><div><strong>{label}</strong><p>{description}</p></div></Link>)}</div>
    </dialog>
  </>;
}
