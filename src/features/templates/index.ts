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
  other: { label: 'Something else', example: 'An important date', description: 'A name and a date. One less thing to remember.', kinds: ['other'], files: false },
};
export function isTemplate(value: string): value is TemplateKey { return (templateKeys as readonly string[]).includes(value); }
export function defaultOffsets(template: TemplateKey, kind: DateKind): Offset[] {
  if (template === 'passport' && kind === 'expiration') return [12, 6, 3].map(value => ({ unit: 'months', value }));
  return (template === 'licence' ? [90, 30, 7] : kind === 'service' ? [7, 1] : [30, 7, 1]).map(value => ({ unit: 'days', value }));
}
// Only supported, non-private intent survives the OAuth round trip.
export function addIntent(template: TemplateKey, focus?: string, category?: string, preset?: string): string {
  const query = new URLSearchParams();
  if (focus && templates[template].kinds.includes(focus as DateKind)) query.set('focus', focus);
  if (template === 'receipt' && category === 'appliances') query.set('category', category);
  if (template === 'other' && isReminderPreset(preset)) query.set('preset', preset);
  return '/add/' + template + (query.size ? '?' + query.toString() : '');
}

// Presets use the existing custom-date contract; only these public choices survive sign-in.
export const reminderPresets = {
  'personal-loan': { label: 'Personal Loan', example: 'My personal loan', dateLabel: 'Personal Loan payment', description: 'Track payment dates, an optional amount and reminders until your end date.', identity: false },
  'home-loan': { label: 'Home Loan', example: 'My home loan', dateLabel: 'Home Loan payment', description: 'Track payment dates, an optional amount and reminders until your end date.', identity: false },
  'car-loan': { label: 'Car Loan', example: 'My car loan', dateLabel: 'Car Loan payment', description: 'Track payment dates, an optional amount and reminders until your end date.', identity: false },
  'motorcycle-loan': { label: 'Motorcycle Loan', example: 'My motorcycle loan', dateLabel: 'Motorcycle Loan payment', description: 'Track payment dates, an optional amount and reminders until your end date.', identity: false },
  'salary-government-loan': { label: 'Salary / Government Loan', example: 'My salary / government loan', dateLabel: 'Salary / Government Loan payment', description: 'Track payment dates, an optional amount and reminders until your end date.', identity: false },
  'credit-card-installment': { label: 'Credit Card / Installment', example: 'My credit card / installment', dateLabel: 'Credit Card / Installment payment', description: 'Track payment dates, an optional amount and reminders until your end date.', identity: false },
  'business-loan': { label: 'Business Loan', example: 'My business loan', dateLabel: 'Business Loan payment', description: 'Track payment dates, an optional amount and reminders until your end date.', identity: false },
  'digital-online-loan': { label: 'Digital / Online Loan', example: 'My digital / online loan', dateLabel: 'Digital / Online Loan payment', description: 'Track payment dates, an optional amount and reminders until your end date.', identity: false },
  'other-loan': { label: 'Other Loan', example: 'My other loan', dateLabel: 'Other Loan payment', description: 'Track payment dates, an optional amount and reminders until your end date.', identity: false },
  umid: { label: 'UMID', example: 'My UMID', dateLabel: 'UMID appointment or follow-up', description: 'Choose an appointment or follow-up date. Do not assume an expiry date.', identity: true },
  'national-id': { label: 'National ID', example: 'My National ID', dateLabel: 'National ID appointment or follow-up', description: 'Remember an appointment, update or follow-up you choose.', identity: true },
  'prc-license': { label: 'PRC License', example: 'My PRC license', dateLabel: 'PRC license renewal', description: 'Remember your printed expiration date or renewal appointment.', identity: true },
  'postal-id': { label: 'Postal ID', example: 'My Postal ID', dateLabel: 'Postal ID renewal', description: 'Add the date on your ID or your next renewal appointment.', identity: true },
  'pwd-solo-parent-id': { label: 'PWD / Solo Parent ID', example: 'My PWD / Solo Parent ID', dateLabel: 'ID renewal or appointment', description: 'Name your ID and choose the renewal or appointment date you need.', identity: true },
  'other-id': { label: 'Other ID', example: 'My ID', dateLabel: 'ID renewal or follow-up', description: 'Add any other ID, with a helpful name and the date you want to remember.', identity: true },
  'police-clearance': { label: 'Police Clearance', example: 'My police clearance', dateLabel: 'Police clearance renewal', description: 'Remember the validity date on your clearance or your next appointment.', identity: true },
  'nbi-clearance': { label: 'NBI Clearance', example: 'My NBI clearance', dateLabel: 'NBI clearance renewal', description: 'Remember the validity date on your clearance or your next appointment.', identity: true },
  'water-bill': { label: 'Water Bill', example: 'My water bill', dateLabel: 'Water bill due date', description: 'Add the due date from your water bill and choose an email reminder.', identity: false },
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
