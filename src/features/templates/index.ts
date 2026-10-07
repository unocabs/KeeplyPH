import { safeRenewalDate } from '@/lib/lto-schedule';
export const templateKeys = ['receipt', 'car', 'motorcycle', 'licence', 'passport', 'aircon', 'other'] as const;
export type TemplateKey = typeof templateKeys[number];
export type DateKind = 'warranty' | 'registration' | 'insurance' | 'service' | 'expiration' | 'other';
export type Offset = { unit: 'days' | 'months'; value: number };
export const dateLabels: Record<DateKind, string> = { warranty: 'Warranty', registration: 'Registration', insurance: 'Insurance renewal', service: 'Maintenance', expiration: 'Expiration', other: 'Important date' };
export const templates: Record<TemplateKey, { label: string; example: string; description: string; kinds: DateKind[]; files: boolean }> = {
  receipt: { label: 'Receipt & Warranty', example: 'Sony headphones', description: 'A receipt ready to find. Coverage easy to check.', kinds: ['warranty', 'other'], files: true },
  car: { label: 'Car', example: 'My Toyota Vios', description: 'Registration, insurance and the next service.', kinds: ['registration', 'insurance', 'service', 'warranty', 'other'], files: true },
  motorcycle: { label: 'Motorcycle', example: 'My Honda Click', description: 'Keep your renewal and maintenance dates together.', kinds: ['registration', 'insurance', 'service', 'warranty', 'other'], files: true },
  licence: { label: "Driver’s License", example: 'My driver’s license', description: 'An alert before your printed expiry. No ID scan needed.', kinds: ['expiration'], files: false },
  passport: { label: 'Passport', example: 'My passport', description: 'A little more time to plan your renewal. Dates only.', kinds: ['expiration'], files: false },
  aircon: { label: 'Aircon Maintenance', example: 'Bedroom aircon', description: 'Remember the last clean and plan the next one.', kinds: ['service'], files: true },
  other: { label: 'Custom reminder', example: 'An important date', description: 'A name and a date. One less thing to remember.', kinds: ['other'], files: false },
};
export function isTemplate(value: string): value is TemplateKey { return (templateKeys as readonly string[]).includes(value); }
export function defaultOffsets(template: TemplateKey, kind: DateKind): Offset[] {
  if (template === 'passport' && kind === 'expiration') return [...[12, 6, 3].map(value => ({ unit: 'months' as const, value })), { unit: 'days', value: 0 }];
  return (template === 'licence' ? [90, 30, 7, 0] : kind === 'service' ? [7, 1, 0] : [30, 7, 1, 0]).map(value => ({ unit: 'days', value }));
}
// Only supported, non-private intent survives the OAuth round trip.
export function addIntent(template: TemplateKey, focus?: string, category?: string, preset?: string, renewalDate?: string): string {
  const query = new URLSearchParams();
  if (focus && templates[template].kinds.includes(focus as DateKind)) query.set('focus', focus);
  if (template === 'receipt' && ['electronics', 'appliances', 'home', 'clothing', 'other'].includes(category || '')) query.set('category', category!);
  if (template === 'other' && isReminderPreset(preset)) query.set('preset', preset);
  const suggestedDate = template === 'car' && focus === 'registration' ? safeRenewalDate(renewalDate) : undefined;
  if (suggestedDate) query.set('renewalDate', suggestedDate);
  return '/add/' + template + (query.size ? '?' + query.toString() : '');
}

// Presets use the existing custom-date contract; only these public choices survive sign-in.
export const reminderPresets = {
  'life-insurance': { label: 'Life Insurance', example: 'My life insurance', dateLabel: 'Life Insurance premium payment', description: 'Keep premium payments and policy renewal or review dates together.', identity: false },
  'health-insurance': { label: 'Health Insurance / HMO', example: 'My health insurance / hmo', dateLabel: 'Health Insurance / HMO premium payment', description: 'Keep premium payments and policy renewal or review dates together.', identity: false },
  'vehicle-insurance': { label: 'Vehicle Insurance', example: 'My vehicle insurance', dateLabel: 'Vehicle Insurance premium payment', description: 'Keep premium payments and policy renewal or review dates together.', identity: false },
  'home-insurance': { label: 'Home / Property Insurance', example: 'My home / property insurance', dateLabel: 'Home / Property Insurance premium payment', description: 'Keep premium payments and policy renewal or review dates together.', identity: false },
  'travel-insurance': { label: 'Travel Insurance', example: 'My travel insurance', dateLabel: 'Travel Insurance premium payment', description: 'Keep premium payments and policy renewal or review dates together.', identity: false },
  'other-insurance': { label: 'Other Insurance', example: 'My other insurance', dateLabel: 'Other Insurance premium payment', description: 'Keep premium payments and policy renewal or review dates together.', identity: false },
  'internet-bill': { label: 'Internet Bill', example: 'My internet bill', dateLabel: 'Internet Bill payment', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'mobile-bill': { label: 'Mobile / Telephone Bill', example: 'My mobile / telephone bill', dateLabel: 'Mobile / Telephone Bill payment', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'rent': { label: 'Rent', example: 'My rent', dateLabel: 'Rent payment', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'association-dues': { label: 'Association Dues', example: 'My association dues', dateLabel: 'Association Dues payment', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'other-bill': { label: 'Other Bill', example: 'My other bill', dateLabel: 'Other Bill payment', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'streaming': { label: 'Streaming Subscription', example: 'My streaming subscription', dateLabel: 'Streaming Subscription payment', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'ai-subscription': { label: 'AI Subscription', example: 'My AI subscription', dateLabel: 'AI Subscription payment', description: 'Remember your next AI service payment or renewal.', identity: false },
  'software': { label: 'Software / Cloud Storage', example: 'My software / cloud storage', dateLabel: 'Software / Cloud Storage payment', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'gym': { label: 'Gym Membership', example: 'My gym membership', dateLabel: 'Gym Membership payment', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'professional-membership': { label: 'Professional Membership', example: 'My professional membership', dateLabel: 'Professional Membership payment', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'other-subscription': { label: 'Other Subscription', example: 'My other subscription', dateLabel: 'Other Subscription payment', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'appliance-service': { label: 'Appliance Maintenance', example: 'My appliance maintenance', dateLabel: 'Appliance Maintenance date', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'home-maintenance': { label: 'Home Maintenance', example: 'My home maintenance', dateLabel: 'Home Maintenance date', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'pest-control': { label: 'Pest Control', example: 'My pest control', dateLabel: 'Pest Control date', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'other-service': { label: 'Other Service', example: 'My other service', dateLabel: 'Other Service date', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'medical-appointment': { label: 'Medical Appointment', example: 'My medical appointment', dateLabel: 'Medical Appointment date', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'dental-appointment': { label: 'Dental Appointment', example: 'My dental appointment', dateLabel: 'Dental Appointment date', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'checkup': { label: 'Health Checkup', example: 'My health checkup', dateLabel: 'Health Checkup date', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'vaccination': { label: 'Vaccination', example: 'My vaccination', dateLabel: 'Vaccination date', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'other-appointment': { label: 'Other Appointment', example: 'My other appointment', dateLabel: 'Other Appointment date', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'tuition': { label: 'Tuition', example: 'My tuition', dateLabel: 'Tuition payment', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'enrollment': { label: 'Enrollment', example: 'My enrollment', dateLabel: 'Enrollment date', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'school-fees': { label: 'School Fees', example: 'My school fees', dateLabel: 'School Fees payment', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'other-school-deadline': { label: 'Other School Deadline', example: 'My other school deadline', dateLabel: 'Other School Deadline date', description: 'Choose your next date and an optional repeat schedule.', identity: false },
  'personal-loan': { label: 'Personal Loan', example: 'My personal loan', dateLabel: 'Personal Loan payment', description: 'Track payment dates, an optional amount and your chosen repeat schedule.', identity: false },
  'home-loan': { label: 'Home Loan', example: 'My home loan', dateLabel: 'Home Loan payment', description: 'Track payment dates, an optional amount and your chosen repeat schedule.', identity: false },
  'car-loan': { label: 'Car Loan', example: 'My car loan', dateLabel: 'Car Loan payment', description: 'Track payment dates, an optional amount and your chosen repeat schedule.', identity: false },
  'motorcycle-loan': { label: 'Motorcycle Loan', example: 'My motorcycle loan', dateLabel: 'Motorcycle Loan payment', description: 'Track payment dates, an optional amount and your chosen repeat schedule.', identity: false },
  'salary-government-loan': { label: 'Salary / Government Loan', example: 'My salary / government loan', dateLabel: 'Salary / Government Loan payment', description: 'Track payment dates, an optional amount and your chosen repeat schedule.', identity: false },
  'credit-card-installment': { label: 'Credit Card / Installment', example: 'My credit card / installment', dateLabel: 'Credit Card / Installment payment', description: 'Track payment dates, an optional amount and your chosen repeat schedule.', identity: false },
  'business-loan': { label: 'Business Loan', example: 'My business loan', dateLabel: 'Business Loan payment', description: 'Track payment dates, an optional amount and your chosen repeat schedule.', identity: false },
  'digital-online-loan': { label: 'Digital / Online Loan', example: 'My digital / online loan', dateLabel: 'Digital / Online Loan payment', description: 'Track payment dates, an optional amount and your chosen repeat schedule.', identity: false },
  'other-loan': { label: 'Other Loan', example: 'My other loan', dateLabel: 'Other Loan payment', description: 'Track payment dates, an optional amount and your chosen repeat schedule.', identity: false },
  umid: { label: 'UMID', example: 'My UMID', dateLabel: 'UMID appointment or follow-up', description: 'Choose an appointment or follow-up date. Do not assume an expiry date.', identity: true },
  'national-id': { label: 'National ID', example: 'My National ID', dateLabel: 'National ID appointment or follow-up', description: 'Remember an appointment, update or follow-up you choose.', identity: true },
  'prc-license': { label: 'PRC License', example: 'My PRC license', dateLabel: 'PRC license renewal', description: 'Remember your printed expiration date or renewal appointment.', identity: true },
  'postal-id': { label: 'Postal ID', example: 'My Postal ID', dateLabel: 'Postal ID renewal', description: 'Add the date on your ID or your next renewal appointment.', identity: true },
  'pwd-solo-parent-id': { label: 'PWD / Solo Parent ID', example: 'My PWD / Solo Parent ID', dateLabel: 'ID renewal or appointment', description: 'Name your ID and choose the renewal or appointment date you need.', identity: true },
  'other-id': { label: 'Other ID', example: 'My ID', dateLabel: 'ID renewal or follow-up', description: 'Add any other ID, with a helpful name and the date you want to remember.', identity: true },
  'police-clearance': { label: 'Police Clearance', example: 'My police clearance', dateLabel: 'Police clearance renewal', description: 'Remember the validity date on your clearance or your next appointment.', identity: true },
  'nbi-clearance': { label: 'NBI Clearance', example: 'My NBI clearance', dateLabel: 'NBI clearance renewal', description: 'Remember the validity date on your clearance or your next appointment.', identity: true },
  'water-bill': { label: 'Water Bill', example: 'My water bill', dateLabel: 'Water bill due date', description: 'Add the due date from your water bill and choose an reminder.', identity: false },
  'electric-bill': { label: 'Electric Bill', example: 'My electric bill', dateLabel: 'Electric bill due date', description: 'Keep your electricity payment deadline easy to remember.', identity: false },
  'car-payment': { label: 'Car Payment', example: 'My car payment', dateLabel: 'Car payment due date', description: 'Remember your next car loan installment or vehicle bill.', identity: false },
} as const;
export type ReminderPreset = keyof typeof reminderPresets;
export function isReminderPreset(value?: string): value is ReminderPreset {
  return Boolean(value && Object.hasOwn(reminderPresets, value));
}
export function getReminderPreset(template: TemplateKey, value?: string) {
  return template === 'other' && isReminderPreset(value) ? reminderPresets[value] : undefined;
}

export const loanPresetKeys = ['personal-loan', 'home-loan', 'car-loan', 'motorcycle-loan', 'salary-government-loan', 'credit-card-installment', 'business-loan', 'digital-online-loan', 'other-loan'] as const;
export function isLoanPreset(value?: string): boolean { return Boolean(value && (loanPresetKeys as readonly string[]).includes(value)); }
