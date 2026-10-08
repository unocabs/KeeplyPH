import { loanPresetKeys, reminderPresets, templates, type ReminderPreset, type TemplateKey } from './index';

export interface ReminderChoice { label: string; description: string; template: TemplateKey; preset?: ReminderPreset; focus?: string; category?: string; aliases?: string[] }
const template = (key: TemplateKey): ReminderChoice => ({ ...templates[key], template: key });
const presets = (...keys: ReminderPreset[]): ReminderChoice[] => keys.map(preset => ({ ...reminderPresets[preset], template: 'other', preset }));
const vehicleMaintenance: ReminderChoice[] = [
  { ...template('car'), label: 'Car maintenance / PMS', description: 'Keep your next service with your car.', focus: 'service', aliases: ['car service', 'oil change', 'preventive maintenance', 'pms'] },
  { ...template('motorcycle'), label: 'Motorcycle maintenance', description: 'Keep your next service with your motorcycle.', focus: 'service', aliases: ['motorbike service', 'motorcycle pms', 'oil change'] },
];
const vehicleInsurance: ReminderChoice[] = [
  { ...template('car'), label: 'Car insurance renewal', description: 'Keep the policy renewal date with your car.', focus: 'insurance' },
  { ...template('motorcycle'), label: 'Motorcycle insurance renewal', description: 'Keep the policy renewal date with your motorcycle.', focus: 'insurance' },
];
// Saved categories are independent of the sections where a choice is offered.
const presetGroups: Record<string, readonly ReminderPreset[]> = {
  insurance: ['life-insurance', 'health-insurance', 'vehicle-insurance', 'home-insurance', 'travel-insurance', 'other-insurance'],
  bills: ['electric-bill', 'water-bill', 'internet-bill', 'mobile-bill', 'rent', 'association-dues', 'other-bill'],
  loans: [...loanPresetKeys, 'car-payment'],
  subscriptions: ['streaming', 'ai-subscription', 'software', 'gym', 'professional-membership', 'other-subscription'],
  documents: ['prc-license', 'postal-id', 'pwd-solo-parent-id', 'umid', 'national-id', 'other-id', 'nbi-clearance', 'police-clearance'],
  maintenance: ['appliance-service', 'home-maintenance', 'pest-control', 'other-service'],
  health: ['medical-appointment', 'dental-appointment', 'checkup', 'vaccination', 'other-appointment'],
  education: ['tuition', 'enrollment', 'school-fees', 'other-school-deadline'],
};
export const reminderCategories: { key: string; label: string; description: string; choices: ReminderChoice[] }[] = [
  { key: 'bills', label: 'Bills & utilities', description: 'Utilities, rent and household dues.', choices: presets('electric-bill', 'water-bill', 'internet-bill', 'mobile-bill', 'rent', 'association-dues', 'other-bill') },
  { key: 'maintenance', label: 'Home maintenance & services', description: 'Aircon cleaning, appliance servicing and home upkeep.', choices: [template('aircon'), ...presets('appliance-service', 'home-maintenance', 'pest-control', 'other-service'), ...vehicleMaintenance] },
  { key: 'purchases', label: 'Purchases & warranties', description: 'Receipts and coverage for your purchases.', choices: ['appliances', 'home', 'electronics', 'clothing', 'other'].map(category => ({ label: category[0].toUpperCase() + category.slice(1), description: 'Keep your receipt and warranty dates.', template: 'receipt' as const, category })) },
  { key: 'subscriptions', label: 'Subscriptions & memberships', description: 'Streaming, AI, software, gym and membership payments.', choices: presets('streaming', 'gym', 'professional-membership', 'software', 'ai-subscription', 'other-subscription').map(choice => choice.preset === 'ai-subscription' ? { ...choice, aliases: ['artificial intelligence', 'ChatGPT', 'Claude', 'Gemini', 'Perplexity', 'Grok', 'Poe', 'GitHub Copilot', 'Cursor', 'Devin', 'Midjourney', 'Leonardo', 'Leonardo.Ai', 'Runway', 'ElevenLabs', 'Suno'] } : choice) },
  { key: 'loans', label: 'Loans & installments', description: 'Payment dates for every kind of loan.', choices: presets(...loanPresetKeys) },
  { key: 'vehicles', label: 'Vehicles', description: 'Cars and motorcycles: registration, insurance and maintenance.', choices: [{ ...template('car'), aliases: ['car renewal', 'car registration', 'lto'] }, { ...template('motorcycle'), aliases: ['motorcycle renewal', 'motorcycle registration', 'motorbike', 'lto'] }, ...vehicleMaintenance, ...vehicleInsurance] },
  { key: 'insurance', label: 'Insurance', description: 'Premium payments, policy renewals and reviews.', choices: [...presets('home-insurance', 'health-insurance', 'life-insurance', 'vehicle-insurance', 'travel-insurance', 'other-insurance'), ...vehicleInsurance] },
  { key: 'health', label: 'Health & appointments', description: 'Medical, dental and other appointments.', choices: presets('medical-appointment', 'dental-appointment', 'checkup', 'vaccination', 'other-appointment') },
  { key: 'education', label: 'Education & school', description: 'Tuition, enrollment and school deadlines.', choices: presets('tuition', 'enrollment', 'school-fees', 'other-school-deadline') },
  { key: 'documents', label: 'IDs & important dates', description: 'Expiration, renewal and appointment dates.', choices: [template('licence'), template('passport'), ...presets('prc-license', 'postal-id', 'pwd-solo-parent-id', 'umid', 'national-id', 'other-id', 'nbi-clearance', 'police-clearance')] },
  { key: 'custom', label: 'Other important dates', description: 'Appointments, personal plans and any other date.', choices: [template('other')] },
];

export function choiceHref(choice: ReminderChoice) {
  const query = new URLSearchParams();
  if (choice.preset) query.set('preset', choice.preset);
  if (choice.focus) query.set('focus', choice.focus);
  if (choice.category) query.set('category', choice.category);
  return '/add/' + choice.template + (query.size ? '?' + query.toString() : '');
}
export function presetCategory(preset?: string | null) {
  return Object.entries(presetGroups).find(([, keys]) => keys.includes(preset as ReminderPreset))?.[0];
}
export function paymentPreset(preset?: string | null) {
  return ['insurance', 'bills', 'loans', 'subscriptions'].includes(presetCategory(preset) || '') || ['tuition', 'school-fees'].includes(preset || '');
}
/** Defaults apply only to new dates; existing schedules remain as saved. */
export function defaultRecurrenceMonths(preset?: string | null): number | null {
  if (presetCategory(preset) === 'loans') return 1;
  return ['electric-bill', 'water-bill', 'internet-bill', 'mobile-bill', 'rent', 'association-dues', 'streaming', 'ai-subscription', 'software', 'gym'].includes(preset || '') ? 1 : null;
}
export function paymentDate(preset: string | null | undefined, kind: string, label: string): boolean {
  if (kind !== 'other' || !paymentPreset(preset)) return false;
  return presetCategory(preset) !== 'insurance' || label === reminderPresets[preset as ReminderPreset]?.dateLabel;
}
export function itemCategory(item: { template_key: TemplateKey; reminder_preset?: string | null }) {
  return presetCategory(item.reminder_preset) || ({ receipt: 'purchases', car: 'vehicles', motorcycle: 'vehicles', licence: 'documents', passport: 'documents', aircon: 'maintenance', other: 'custom' }[item.template_key]);
}

export function matchingReminderChoices(query: string, selected?: string | null) {
  const search = query.trim().toLowerCase();
  const seen = new Set<string>();
  return reminderCategories.filter(group => search || !selected || group.key === selected)
    .map(group => ({ ...group, choices: group.choices.filter(choice => {
      if (search && ![group.label, choice.label, choice.description, ...(choice.aliases || [])].join(' ').toLowerCase().includes(search)) return false;
      const href = choiceHref(choice);
      if (search && seen.has(href)) return false;
      seen.add(href);
      return true;
    }) })).filter(group => group.choices.length);
}
export function vehicleIntentLabel(template: TemplateKey, focus?: string) {
  if (!['car', 'motorcycle'].includes(template)) return templates[template].label;
  return [...vehicleMaintenance, ...vehicleInsurance].find(choice => choice.template === template && choice.focus === focus)?.label || templates[template].label;
}
