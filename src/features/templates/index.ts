export const templateKeys = ['receipt', 'car', 'motorcycle', 'licence', 'passport', 'aircon', 'other'] as const;
export type TemplateKey = typeof templateKeys[number];
export type DateKind = 'warranty' | 'registration' | 'insurance' | 'service' | 'expiration' | 'other';
export type Offset = { unit: 'days' | 'months'; value: number };
export const dateLabels: Record<DateKind, string> = { warranty: 'Warranty', registration: 'Registration', insurance: 'Insurance renewal', service: 'Maintenance', expiration: 'Expiration', other: 'Important date' };
export const templates: Record<TemplateKey, { label: string; example: string; description: string; kinds: DateKind[]; files: boolean }> = {
  receipt: { label: 'Receipt & Warranty', example: 'Sony headphones', description: 'A receipt ready to find. Coverage easy to check.', kinds: ['warranty', 'other'], files: true },
  car: { label: 'Car', example: 'My Toyota Vios', description: 'Registration, insurance and the next service.', kinds: ['registration', 'insurance', 'service', 'warranty', 'other'], files: true },
  motorcycle: { label: 'Motorcycle', example: 'My Honda Click', description: 'Keep your renewal and maintenance dates together.', kinds: ['registration', 'insurance', 'service', 'warranty', 'other'], files: true },
  licence: { label: "Driver’s Licence", example: 'My driving licence', description: 'An alert before your printed expiry. No ID scan needed.', kinds: ['expiration'], files: false },
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
export function addIntent(template: TemplateKey, focus?: string, category?: string): string {
  const query = new URLSearchParams();
  if (focus && templates[template].kinds.includes(focus as DateKind)) query.set('focus', focus);
  if (template === 'receipt' && category === 'appliances') query.set('category', category);
  return '/add/' + template + (query.size ? '?' + query.toString() : '');
}
