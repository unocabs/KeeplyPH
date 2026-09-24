'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { Plus, X, ReceiptText, Car, Bike, IdCard, BookOpen, Wind, CalendarDays } from 'lucide-react';
import { templateKeys, templates, type TemplateKey } from '@/features/templates';
const icons = { receipt: ReceiptText, car: Car, motorcycle: Bike, licence: IdCard, passport: BookOpen, aircon: Wind, other: CalendarDays };
export function TemplateIcon({ template, size = 22 }: { template: TemplateKey; size?: number }) { const Icon = icons[template]; return <Icon size={size} aria-hidden="true" />; }
export function TemplateChoices({ demo = false, onChoose }: { demo?: boolean; onChoose?: () => void }) {
  return <div className="template-grid">{templateKeys.map(key => <Link className="template-choice" key={key} href={(demo ? '/demo' : '') + '/add/' + key} onClick={onChoose}><span className="stat-icon violet"><TemplateIcon template={key} /></span><div><strong>{templates[key].label}</strong><p>{templates[key].description}</p></div></Link>)}</div>;
}
export function AddItemButton({ demo = false, floating = false }: { demo?: boolean; floating?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <><button className={'button primary ' + (floating ? 'floating-add' : '')} aria-label="Add item" onClick={() => dialog.current?.showModal()}><Plus size={20} /><span>{floating ? '' : 'Add item'}</span></button><dialog ref={dialog} className="template-dialog" aria-labelledby="picker-title" onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}><div className="section-heading"><h2 id="picker-title">What do you want to keep?</h2><button className="icon-button" aria-label="Close item picker" onClick={() => dialog.current?.close()}><X /></button></div><p className="section-description">Start with what matters. We’ll take it from there.</p><TemplateChoices demo={demo} onChoose={() => dialog.current?.close()} /></dialog></>;
}
