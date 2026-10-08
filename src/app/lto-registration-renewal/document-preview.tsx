'use client';

import { useEffect, useId, useRef, useState } from 'react';
import styles from './page.module.css';

const examples = {
  orcr: {
    label: 'Official Receipt / Certificate of Registration (OR/CR)',
    intro: 'These are two different documents: the OR records payment, while the CR records the vehicle’s registration details.',
    documents: [
      { title: 'Official Receipt (OR)', fields: ['Receipt number and payment date', 'Registered owner / payer', 'Vehicle identifiers', 'Fee breakdown', 'Total amount paid'], note: 'Look for the receipt date, vehicle identifiers and payment breakdown. Use your actual registration record to confirm the renewal year.' },
      { title: 'Certificate of Registration (CR)', fields: ['Registered owner', 'Plate / motor vehicle file number', 'Engine and chassis identifiers', 'Make, model and vehicle classification', 'Registration and issuing-office details'], note: 'Match the vehicle details to your car. Keep the original registration document safely with your vehicle records.' },
    ],
  },
  coc: {
    label: 'Insurance Certificate of Cover (COC)',
    intro: 'This identifies the insurance cover for the vehicle. Ask your insurer to confirm that the record has been transmitted for LTO renewal.',
    documents: [{ title: 'Certificate of Cover (COC)', fields: ['Insurer and certificate / policy reference', 'Insured owner', 'Covered vehicle identifiers', 'Coverage start and end dates', 'Type of cover'], note: 'Look for the insurer, the vehicle covered and the insurance dates. A purchase receipt alone is different from the certificate of cover.' }],
  },
  inspection: {
    label: 'Inspection report',
    intro: 'Your inspection route determines the report you receive. A PMVIC transmits its inspection report; the LTO MVIR is the alternative for the applicable walk-in route.',
    documents: [{ title: 'Vehicle inspection report', fields: ['Inspection center / office', 'Report reference and inspection date', 'Vehicle identifiers', 'Inspection checks and findings', 'Result / remarks'], note: 'Look for your vehicle details, the inspection date and the results. Ask the center whether its report supports your intended renewal route.' }],
  },
  cec: {
    label: 'Certificate of Emission Compliance (CEC)',
    intro: 'For the applicable emissions-testing route, the testing center conducts the test and electronically transmits the certificate.',
    documents: [{ title: 'Emission compliance certificate', fields: ['Emission testing center', 'Certificate reference and test date', 'Vehicle identifiers', 'Emissions measurements', 'Compliance result'], note: 'Look for the testing center, vehicle details, test date and result. Check with the center that transmission is complete.' }],
  },
};

export function DocumentPreview({ kind }: { kind: keyof typeof examples }) {
  const example = examples[kind];
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return <>
    <button type="button" className={styles.documentButton} aria-haspopup="dialog" onClick={() => { dialog.current?.showModal(); setOpen(true); }}>{example.label}<span>View sample ↗</span></button>
    <dialog ref={dialog} className={styles.documentDialog} aria-labelledby={titleId} aria-describedby={descriptionId} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}><h2 id={titleId}>{example.label}</h2><button type="button" className="button secondary" autoFocus onClick={() => dialog.current?.close()} aria-label="Close document preview">Close ×</button></header>
        <p>{example.intro}</p>
        <p id={descriptionId} className={styles.note}>Illustrative examples only, not official forms. Layouts, field names and delivery formats may differ by issuer, office and document version. These diagrams show details to look for; they are not a complete checklist or proof of validity.</p>
        <div className={styles.documentExamples}>{example.documents.map(doc => <figure key={doc.title}>
          <svg viewBox="0 0 400 460" role="img" aria-label={`Illustrative ${doc.title}: ${doc.fields.join(', ')}. Not an official document.`}>
            <rect x="1" y="1" width="398" height="458" rx="12" fill="#fff" stroke="#d7d0e5" />
            <rect x="20" y="20" width="360" height="40" rx="6" fill="#eee9fc" />
            <text x="200" y="46" textAnchor="middle" fontSize="13" fontWeight="700" fill="#5940aa">EXAMPLE ONLY · NOT AN OFFICIAL DOCUMENT</text>
            <text x="24" y="94" fontSize="18" fontWeight="700" fill="#262235">{doc.title}</text>
            {doc.fields.map((field,index) => <g key={field}><text x="24" y={132+index*59} fontSize="12" fill="#534d65">{field}</text><rect x="24" y={143+index*59} width={index%2 ? 240 : 320} height="12" rx="3" fill="#e9e6ef" /></g>)}
            <text x="24" y="438" fontSize="11" fill="#6d637e">Keeply · Visual guide · No personal data</text>
          </svg>
          <figcaption>{doc.note}</figcaption>
        </figure>)}</div>
      </div>
    </dialog>
  </>;
}
