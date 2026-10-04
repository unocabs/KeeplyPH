'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { Plus, X, ArrowRight } from 'lucide-react';
import type { Category } from '@/lib/domain';
import { reminderCategories, choiceHref, matchingReminderChoices } from '@/features/templates/categories';
import { ReminderIcon } from './reminder-icon';
export { TemplateIcon } from './reminder-icon';
export function TemplateChoices({ demo = false, onChoose }: { demo?: boolean; onChoose?: () => void }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const search = query.trim().toLowerCase();
  const matches = matchingReminderChoices(query, selected);
  return <div className="reminder-picker">
    <label>Find a reminder type<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Try PMS, car renewal or bills" /></label>
    {selected && !search && <button type="button" className="text-button spaced" onClick={() => setSelected(null)}>← All categories</button>}
    {!selected && !search ? <div className="template-grid spaced">{reminderCategories.map(group => <button type="button" className="template-choice" key={group.key} onClick={() => setSelected(group.key)}><ReminderIcon template={group.choices[0].template} group={group.key} /><div><strong>{group.label}</strong><p>{group.description}</p></div><ArrowRight size={17} aria-hidden="true" /></button>)}</div> : matches.map(group => <section className="spaced" key={group.key}><h3>{group.label}</h3><p className="section-description">{group.description}</p><div className="template-grid spaced">{group.choices.map(choice => <Link className="template-choice" key={choiceHref(choice)} href={(demo ? '/demo' : '') + choiceHref(choice)} onClick={onChoose}><ReminderIcon template={choice.template} preset={choice.preset} category={choice.category as Category | undefined} /><div><strong>{choice.label}</strong><p>{choice.description}</p></div></Link>)}</div></section>)}
    {!matches.length && <p className="spaced">No matching type. <Link className="text-button" href={(demo ? '/demo' : '') + '/add/other'} onClick={onChoose}>Add a custom reminder →</Link></p>}
  </div>;
}
export function AddItemButton({ demo = false, floating = false, label = 'Add Reminder' }: { demo?: boolean; floating?: boolean; label?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <><button className={'button primary ' + (floating ? 'floating-add' : '')} aria-label={label} onClick={() => dialog.current?.showModal()}><Plus size={floating ? 28 : 20} aria-hidden="true" />{!floating && <span>{label}</span>}</button><dialog ref={dialog} className="template-dialog" aria-labelledby="picker-title" onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}><div className="section-heading"><h2 id="picker-title">What do you want to remember?</h2><button className="icon-button" aria-label="Close reminder picker" onClick={() => dialog.current?.close()}><X /></button></div><p className="section-description">Choose a category or search for what you need.</p><TemplateChoices demo={demo} onChoose={() => dialog.current?.close()} /></dialog></>;
}
