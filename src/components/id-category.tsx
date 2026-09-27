'use client';
import Link from 'next/link';
import { useId, useRef } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { ReminderIcon } from './reminder-icon';

export function IdCategory({ demo = false, card = false, onChoose }: { demo?: boolean; card?: boolean; onChoose?: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return <>
    <button type="button" className={card ? 'category-card' : 'template-choice'} aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
      <ReminderIcon template="licence" />
      <div><strong>IDs{card && <ArrowRight size={17} aria-hidden="true" />}</strong><p>Driver’s License, UMID and National ID reminders.</p></div>
    </button>
    <dialog ref={dialog} className="template-dialog" aria-labelledby={titleId} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="section-heading"><h2 id={titleId}>Which ID would you like to add?</h2><button type="button" className="icon-button" aria-label="Close ID picker" onClick={() => dialog.current?.close()}><X /></button></div>
      <p className="section-description">Choose your ID, then add the date you want to remember. No ID numbers or scans needed.</p>
      <div className="template-grid">{[
        ['Driver’s License', 'Remember your printed expiration date.', '/add/licence'],
        ['UMID', 'Choose an appointment or follow-up date.', '/add/other?preset=umid'],
        ['National ID', 'Choose an appointment, update or follow-up date.', '/add/other?preset=national-id'],
      ].map(([label, description, href]) => <Link key={label} className="template-choice" href={(demo ? '/demo' : '') + href} onClick={() => { dialog.current?.close(); onChoose?.(); }}><ReminderIcon template="licence" /><div><strong>{label}</strong><p>{description}</p></div></Link>)}</div>
    </dialog>
  </>;
}
