import {
  CalendarDays, CalendarClock, Car, IdCard, ReceiptText, Laptop, WashingMachine, House, Shirt,
  ShieldCheck, ShieldPlus, Plane, Wallet, Zap, Droplets, Wifi, Smartphone, Building2,
  Landmark, CreditCard, BriefcaseBusiness, Repeat2, CirclePlay, Cloud, Dumbbell, BadgeCheck,
  FileCheck2, Wrench, Bug, HeartPulse, Stethoscope, Syringe, GraduationCap, School,
  ClipboardList, BookOpen, Accessibility, HandCoins,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { isReminderPreset, type TemplateKey, type ReminderPreset, type DateKind } from '@/features/templates';
import { itemCategory, paymentPreset } from '@/features/templates/categories';
import type { Category } from '@/lib/domain';
import { supportsMotorcycleBrand } from '@/features/items/motorcycle-brands';
import { supportsCarBrand } from '@/features/items/car-brands';
import { CarBrandLogo } from './car-brand-logo';
import { getSubscriptionBrand } from '@/features/items/subscription-brands';
import { SubscriptionBrandLogo } from './subscription-brand-logo';

type GlyphProps = { size?: number; strokeWidth?: number; 'aria-hidden'?: boolean };
type Glyph = ComponentType<GlyphProps>;
function svgProps({ size = 22, strokeWidth = 1.7 }: GlyphProps) {
  return { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
}
function Passport(props: GlyphProps) {
  return <svg {...svgProps(props)}><rect x="5" y="2.5" width="15" height="19" rx="2"/><path d="M5 5H3v16a1 1 0 0 0 1 1M9 18h7"/><circle cx="12.5" cy="10" r="4"/><path d="M8.5 10h8M12.5 6c2 2 2 6 0 8-2-2-2-6 0-8Z"/></svg>;
}
function Motorcycle(props: GlyphProps) {
  return <svg {...svgProps(props)}><circle cx="5" cy="17" r="3.5"/><circle cx="19" cy="17" r="3.5"/><path d="m19 17-4-11h-3M16 9h3M5 17l4-7h5l-3 7H5M7 10H4M9 10l2 7h4"/></svg>;
}
function Aircon(props: GlyphProps) {
  return <svg {...svgProps(props)}><rect x="2" y="3" width="20" height="10" rx="2"/><path d="M2 10h20M17 6h2M7 16v2a2 2 0 0 1-2 2M12 16v5M17 16v2a2 2 0 0 0 2 2"/></svg>;
}
function Tooth(props: GlyphProps) {
  return <svg {...svgProps(props)}><path d="M12 4c-2-1.5-4.5-2-6-.5C3 6 5 10 6 13c1 3 1 8 3 8 1.5 0 1-6 3-6s1.5 6 3 6c2 0 2-5 3-8 1-3 3-7 0-9.5C16.5 2 14 2.5 12 4Z"/><path d="M9 3c1.5 1 3 2 5 2"/></svg>;
}
function HeartShield(props: GlyphProps) {
  return <svg {...svgProps(props)}><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="M12 14.5 8.6 11a2.2 2.2 0 0 1 3.4-2.7 2.2 2.2 0 0 1 3.4 2.7L12 14.5Z"/></svg>;
}

const categoryGlyphs: Record<string, Glyph> = {
  insurance: ShieldCheck, bills: Wallet, loans: Landmark, subscriptions: Repeat2,
  documents: IdCard, vehicles: Car, purchases: ReceiptText, maintenance: Wrench,
  health: HeartPulse, education: GraduationCap, custom: CalendarDays,
};
const templateGlyphs: Record<TemplateKey, Glyph> = {
  receipt: ReceiptText, car: Car, motorcycle: Motorcycle, licence: IdCard,
  passport: Passport, aircon: Aircon, other: CalendarDays,
};
const purchaseGlyphs: Record<Category, Glyph> = {
  electronics: Laptop, appliances: WashingMachine, home: House, clothing: Shirt, other: ReceiptText,
};
// Exhaustive so newly added types cannot silently inherit a generic calendar.
const presetGlyphs: Record<ReminderPreset, Glyph> = {
  'life-insurance': HeartShield, 'health-insurance': ShieldPlus, 'vehicle-insurance': Car,
  'home-insurance': House, 'travel-insurance': Plane, 'other-insurance': ShieldCheck,
  'water-bill': Droplets, 'electric-bill': Zap, 'internet-bill': Wifi, 'mobile-bill': Smartphone,
  rent: House, 'association-dues': Building2, 'other-bill': Wallet,
  'personal-loan': Wallet, 'home-loan': House, 'car-loan': Car, 'motorcycle-loan': Motorcycle,
  'salary-government-loan': Landmark, 'credit-card-installment': CreditCard,
  'business-loan': BriefcaseBusiness, 'digital-online-loan': Smartphone, 'other-loan': HandCoins,
  'car-payment': Car,
  streaming: CirclePlay, software: Cloud, gym: Dumbbell, 'professional-membership': BadgeCheck,
  'other-subscription': Repeat2,
  umid: IdCard, 'national-id': IdCard, 'prc-license': BadgeCheck, 'postal-id': IdCard,
  'pwd-solo-parent-id': Accessibility, 'other-id': IdCard,
  'nbi-clearance': FileCheck2, 'police-clearance': FileCheck2,
  'appliance-service': WashingMachine, 'home-maintenance': Wrench, 'pest-control': Bug, 'other-service': Wrench,
  'medical-appointment': Stethoscope, 'dental-appointment': Tooth, checkup: HeartPulse,
  vaccination: Syringe, 'other-appointment': CalendarDays,
  tuition: School, enrollment: ClipboardList, 'school-fees': ReceiptText, 'other-school-deadline': BookOpen,
};
interface IconProps {
  template: TemplateKey;
  category?: Category | null;
  preset?: string | null;
  group?: string;
  brand?: string | null;
  motorcycleBrand?: string | null;
  subscriptionBrand?: string | null;
  size?: number;
}
/** Shared identity across category choices, saved reminders and date lists. */
export function TemplateIcon({ template, category, preset, group, size = 22 }: IconProps) {
  const Icon = group ? categoryGlyphs[group] || CalendarDays
    : isReminderPreset(preset || undefined) ? presetGlyphs[preset as ReminderPreset]
    : template === 'receipt' && category ? purchaseGlyphs[category]
    : templateGlyphs[template] || CalendarDays;
  return <Icon size={size} strokeWidth={1.7} aria-hidden={true} />;
}
export function ReminderIcon(props: IconProps) {
  const group = props.group || itemCategory({ template_key: props.template, reminder_preset: props.preset });
  const subscription = getSubscriptionBrand(props.template, props.preset, props.subscriptionBrand);
  if (subscription) return <span className={'reminder-icon group-' + group} aria-hidden="true"><SubscriptionBrandLogo brand={subscription} fallback={<TemplateIcon {...props} />} /></span>;
  return <span className={'reminder-icon group-' + group} aria-hidden="true">{supportsMotorcycleBrand(props.template, props.preset) && props.motorcycleBrand ? <CarBrandLogo kind="motorcycle" brand={props.motorcycleBrand} fallback={<TemplateIcon {...props} />} /> : supportsCarBrand(props.template, props.preset) && props.brand ? <CarBrandLogo brand={props.brand} fallback={<TemplateIcon {...props} />} /> : <TemplateIcon {...props} />}</span>;
}
/** A date's purpose is separate from the item it belongs to. */
export function DateIcon({ kind, label, preset, size = 16 }: { kind: DateKind; label?: string; preset?: string | null; size?: number }) {
  const dateGlyphs: Record<DateKind, Glyph> = { warranty: BadgeCheck, registration: FileCheck2, insurance: ShieldCheck, service: Wrench, expiration: CalendarClock, other: CalendarDays };
  const Icon = kind === 'other' && label === 'Policy renewal / review' ? ShieldCheck
    : kind === 'other' && paymentPreset(preset) ? Wallet : dateGlyphs[kind];
  return <Icon size={size} strokeWidth={1.7} aria-hidden={true} />;
}
