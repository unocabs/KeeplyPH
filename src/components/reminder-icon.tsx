import { CalendarDays, Car, IdCard, ReceiptText, Laptop, WashingMachine, House, Shirt } from 'lucide-react';
import type { TemplateKey } from '@/features/templates';
import type { Category } from '@/lib/domain';

/** One visual vocabulary across the picker, records, dates, and public pages. */
export function TemplateIcon({ template, category, size = 22 }: { template: TemplateKey; category?: Category | null; size?: number }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  if (template === 'passport') return <svg {...props}><rect x="5" y="2.5" width="15" height="19" rx="2"/><path d="M5 5H3v16a1 1 0 0 0 1 1M9 18h7"/><circle cx="12.5" cy="10" r="4"/><path d="M8.5 10h8M12.5 6c2 2 2 6 0 8-2-2-2-6 0-8Z"/></svg>;
  if (template === 'motorcycle') return <svg {...props}><circle cx="5" cy="17" r="3.5"/><circle cx="19" cy="17" r="3.5"/><path d="m19 17-4-11h-3M16 9h3M5 17l4-7h5l-3 7H5M7 10H4M9 10l2 7h4"/></svg>;
  if (template === 'aircon') return <svg {...props}><rect x="2" y="3" width="20" height="10" rx="2"/><path d="M2 10h20M17 6h2M7 16v2a2 2 0 0 1-2 2M12 16v5M17 16v2a2 2 0 0 0 2 2"/></svg>;
  const Icon = template === 'receipt' && category ? ({ electronics: Laptop, appliances: WashingMachine, home: House, clothing: Shirt, other: ReceiptText }[category]) : ({ receipt: ReceiptText, car: Car, licence: IdCard, other: CalendarDays }[template]);
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}
export function ReminderIcon({ template, category, size = 22 }: { template: TemplateKey; category?: Category | null; size?: number }) {
  return <span className={'reminder-icon type-' + (template === 'receipt' && category ? category : template)}><TemplateIcon template={template} category={category} size={size} /></span>;
}
