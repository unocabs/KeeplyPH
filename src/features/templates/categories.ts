import { loanPresetKeys, reminderPresets, templates, type ReminderPreset, type TemplateKey } from './index';

export interface ReminderChoice { label: string; description: string; template: TemplateKey; preset?: ReminderPreset; focus?: string; category?: string }
const template = (key: TemplateKey): ReminderChoice => ({ ...templates[key], template: key });
const presets = (...keys: ReminderPreset[]): ReminderChoice[] => keys.map(preset => ({ ...reminderPresets[preset], template: 'other', preset }));
export const reminderCategories: { key: string; label: string; description: string; choices: ReminderChoice[] }[] = [
  { key: 'insurance', label: 'Insurance', description: 'Premium payments, policy renewals and reviews.', choices: presets('life-insurance', 'health-insurance', 'vehicle-insurance', 'home-insurance', 'travel-insurance', 'other-insurance') },
  { key: 'bills', label: 'Bills & household', description: 'Utilities, rent and household dues.', choices: presets('electric-bill', 'water-bill', 'internet-bill', 'mobile-bill', 'rent', 'association-dues', 'other-bill') },
  { key: 'loans', label: 'Loans & installments', description: 'Payment dates for every kind of loan.', choices: presets(...loanPresetKeys) },
  { key: 'subscriptions', label: 'Subscriptions & memberships', description: 'Streaming, software, gym and membership payments.', choices: presets('streaming', 'software', 'gym', 'professional-membership', 'other-subscription') },
  { key: 'documents', label: 'IDs, documents & clearances', description: 'Expiration, renewal and appointment dates.', choices: [template('licence'), template('passport'), ...presets('prc-license', 'postal-id', 'pwd-solo-parent-id', 'umid', 'national-id', 'other-id', 'nbi-clearance', 'police-clearance')] },
  { key: 'vehicles', label: 'Vehicles', description: 'Registration, insurance, maintenance and payments.', choices: [template('car'), template('motorcycle')] },
  { key: 'purchases', label: 'Purchases & warranties', description: 'Receipts and coverage for your purchases.', choices: ['electronics', 'appliances', 'home', 'clothing', 'other'].map(category => ({ label: category[0].toUpperCase() + category.slice(1), description: 'Keep your receipt and warranty dates.', template: 'receipt' as const, category })) },
  { key: 'maintenance', label: 'Maintenance & services', description: 'Aircon, appliances and home upkeep.', choices: [template('aircon'), ...presets('appliance-service', 'home-maintenance', 'pest-control', 'other-service')] },
  { key: 'health', label: 'Health & appointments', description: 'Medical, dental and other appointments.', choices: presets('medical-appointment', 'dental-appointment', 'checkup', 'vaccination', 'other-appointment') },
  { key: 'education', label: 'Education', description: 'Tuition, enrollment and school deadlines.', choices: presets('tuition', 'enrollment', 'school-fees', 'other-school-deadline') },
  { key: 'custom', label: 'Custom reminder', description: 'Any other date, with the same scheduling controls.', choices: [template('other')] },
];
export function choiceHref(choice: ReminderChoice) {
  const query = new URLSearchParams();
  if (choice.preset) query.set('preset', choice.preset);
  if (choice.focus) query.set('focus', choice.focus);
  if (choice.category) query.set('category', choice.category);
  return '/add/' + choice.template + (query.size ? '?' + query.toString() : '');
}
export function presetCategory(preset?: string | null) {
  // Retain the legacy car-payment link without duplicating it in the picker.
  if (preset === 'car-payment') return 'loans';
  return reminderCategories.find(group => group.choices.some(choice => choice.preset === preset && Boolean(preset)))?.key;
}
export function paymentPreset(preset?: string | null) {
  return ['insurance', 'bills', 'loans', 'subscriptions'].includes(presetCategory(preset) || '') || ['tuition', 'school-fees'].includes(preset || '');
}
export function itemCategory(item: { template_key: TemplateKey; reminder_preset?: string | null }) {
  return presetCategory(item.reminder_preset) || ({ receipt: 'purchases', car: 'vehicles', motorcycle: 'vehicles', licence: 'documents', passport: 'documents', aircon: 'maintenance', other: 'custom' }[item.template_key]);
}
