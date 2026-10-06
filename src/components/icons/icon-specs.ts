import type { DateKind, ReminderPreset, TemplateKey } from '@/features/templates';
import type { Category } from '@/lib/domain';
import type { IconSpec } from './category-glyph';

export const categoryIcons: Record<string, IconSpec> = {
  vehicles: { icon: 'car' }, insurance: { icon: 'shield-check' }, bills: { icon: 'receipt' },
  loans: { icon: 'bank' }, subscriptions: { icon: 'repeat' }, documents: { icon: 'id' },
  purchases: { icon: 'receipt' }, maintenance: { icon: 'wrench' },
  health: { icon: 'heart' }, education: { icon: 'cap' }, custom: { icon: 'calendar', modifier: 'plus' },
};
export const templateIcons: Record<TemplateKey, IconSpec> = {
  receipt: { icon: 'receipt' }, car: { icon: 'car' },
  motorcycle: { icon: 'motorcycle' }, licence: { icon: 'id' }, passport: { icon: 'passport' },
  aircon: { icon: 'aircon' }, other: { icon: 'calendar', modifier: 'plus' },
};
export const purchaseIcons: Record<Category, IconSpec> = {
  electronics: { icon: 'laptop', modifier: 'warranty' }, appliances: { icon: 'appliance', modifier: 'warranty' },
  home: { icon: 'house' }, clothing: { icon: 'shirt' },
  other: { icon: 'receipt' },
};
// Exhaustive so a new preset requires an intentional visual identity.
export const presetIcons: Record<ReminderPreset, IconSpec> = {
  'life-insurance': { icon: 'shield-heart' }, 'health-insurance': { icon: 'shield-medical' },
  'vehicle-insurance': { icon: 'car', modifier: 'insurance' }, 'home-insurance': { icon: 'house', modifier: 'insurance' },
  'travel-insurance': { icon: 'plane', modifier: 'insurance' }, 'other-insurance': { icon: 'shield-check' },
  'water-bill': { icon: 'receipt', modifier: 'water' }, 'electric-bill': { icon: 'receipt', modifier: 'electric' },
  'internet-bill': { icon: 'receipt', modifier: 'wifi' }, 'mobile-bill': { icon: 'phone' },
  rent: { icon: 'house' }, 'association-dues': { icon: 'building' },
  'other-bill': { icon: 'receipt' },
  'personal-loan': { icon: 'wallet', modifier: 'payment' }, 'home-loan': { icon: 'house', modifier: 'payment' },
  'car-loan': { icon: 'car', modifier: 'payment' }, 'motorcycle-loan': { icon: 'motorcycle', modifier: 'payment' },
  'salary-government-loan': { icon: 'bank', modifier: 'payment' }, 'credit-card-installment': { icon: 'card', modifier: 'payment' },
  'business-loan': { icon: 'briefcase', modifier: 'payment' }, 'digital-online-loan': { icon: 'laptop', modifier: 'payment' },
  'other-loan': { icon: 'document', modifier: 'payment' }, 'car-payment': { icon: 'car', modifier: 'payment' },
  streaming: { icon: 'play' }, software: { icon: 'cloud' }, gym: { icon: 'dumbbell' },
  'professional-membership': { icon: 'badge' }, 'other-subscription': { icon: 'card', modifier: 'renewal' },
  umid: { icon: 'id' }, 'national-id': { icon: 'id' }, 'prc-license': { icon: 'id' },
  'postal-id': { icon: 'id' }, 'pwd-solo-parent-id': { icon: 'accessibility' }, 'other-id': { icon: 'id' },
  'nbi-clearance': { icon: 'document', modifier: 'verified' }, 'police-clearance': { icon: 'document', modifier: 'insurance' },
  'appliance-service': { icon: 'appliance', modifier: 'maintenance' }, 'home-maintenance': { icon: 'house', modifier: 'maintenance' },
  'pest-control': { icon: 'bug' }, 'other-service': { icon: 'wrench' },
  'medical-appointment': { icon: 'stethoscope' }, 'dental-appointment': { icon: 'tooth' }, checkup: { icon: 'heart' },
  vaccination: { icon: 'syringe' }, 'other-appointment': { icon: 'calendar', modifier: 'medical' },
  tuition: { icon: 'school', modifier: 'payment' }, enrollment: { icon: 'checklist' },
  'school-fees': { icon: 'receipt' }, 'other-school-deadline': { icon: 'book' },
};
export const dateIcons: Record<DateKind, IconSpec> = {
  warranty: { icon: 'badge' }, registration: { icon: 'document', modifier: 'verified' },
  insurance: { icon: 'shield-check' }, service: { icon: 'wrench' },
  expiration: { icon: 'calendar', modifier: 'clock' }, other: { icon: 'calendar' },
};
