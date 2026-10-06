import type { TemplateKey } from '@/features/templates';

export const insurancePresets = ['life-insurance', 'health-insurance', 'vehicle-insurance', 'home-insurance', 'travel-insurance', 'other-insurance'] as const;
export type InsurancePreset = typeof insurancePresets[number];
const lifeAndHealth = ['life-insurance', 'health-insurance'] as const;
const general = ['vehicle-insurance', 'home-insurance', 'travel-insurance'] as const;
// A single logo per brand is reused across its supported reminder types.
export const insurers = [
  { id: 'sun-life', label: 'Sun Life', logo: 'sun-life', categories: lifeAndHealth },
  { id: 'pru-life-uk', label: 'Pru Life UK', logo: 'pru-life-uk', categories: lifeAndHealth },
  { id: 'aia', label: 'AIA Philippines', logo: 'aia', categories: lifeAndHealth },
  { id: 'axa', label: 'AXA Philippines', logo: 'axa', categories: [...lifeAndHealth, ...general] },
  { id: 'manulife', label: 'Manulife', logo: 'manulife', categories: lifeAndHealth },
  { id: 'insular-life', label: 'Insular Life', logo: 'insular-life', categories: lifeAndHealth },
  { id: 'fwd', label: 'FWD', logo: 'fwd', categories: lifeAndHealth },
  { id: 'allianz-pnb-life', label: 'Allianz PNB Life', logo: 'allianz-pnb-life', categories: lifeAndHealth },
  { id: 'bdo-life', label: 'BDO Life', logo: 'bdo-life', categories: lifeAndHealth },
  { id: 'bpi-aia', label: 'BPI AIA', logo: 'bpi-aia', categories: lifeAndHealth },
  { id: 'sun-life-grepa', label: 'Sun Life Grepa', logo: 'sun-life-grepa', categories: lifeAndHealth },
  { id: 'manulife-chinabank', label: 'Manulife China Bank Life', logo: 'manulife-chinabank', categories: lifeAndHealth },
  { id: 'eastwest-ageas', label: 'EastWest Ageas', logo: 'eastwest-ageas', categories: lifeAndHealth },
  { id: 'generali', label: 'Generali', logo: 'generali', categories: lifeAndHealth },
  { id: 'singlife', label: 'Singlife', logo: 'singlife', categories: lifeAndHealth },
  { id: 'malayan', label: 'Malayan Insurance', logo: 'malayan', categories: general },
  { id: 'standard', label: 'Standard Insurance', logo: 'standard', categories: general },
  { id: 'pioneer', label: 'Pioneer Insurance', logo: 'pioneer', categories: [...lifeAndHealth, ...general] },
  { id: 'bpi-ms', label: 'BPI/MS', logo: 'bpi-ms', categories: ['health-insurance', ...general] },
  { id: 'oona', label: 'Oona Insurance', logo: 'oona', categories: ['health-insurance', ...general] },
  { id: 'cocogen', label: 'COCOGEN', logo: 'cocogen', categories: general },
  { id: 'fpg', label: 'FPG Insurance', logo: 'fpg', categories: general },
  { id: 'mercantile', label: 'Mercantile Insurance', logo: 'mercantile', categories: general },
  { id: 'pga-sompo', label: 'PGA Sompo', logo: 'pga-sompo', categories: general },
  { id: 'prudential-guarantee', label: 'Prudential Guarantee', logo: 'prudential-guarantee', categories: general },
  { id: 'pacific-cross', label: 'Pacific Cross', logo: 'pacific-cross', categories: ['health-insurance', 'travel-insurance'] },
  { id: 'maxicare', label: 'Maxicare', logo: 'maxicare', categories: ['health-insurance'], hmo: true },
  { id: 'medicard', label: 'MediCard', logo: 'medicard', categories: ['health-insurance'], hmo: true },
] as const satisfies readonly { id: string; label: string; logo: string; categories: readonly InsurancePreset[]; hmo?: boolean }[];
export type Insurer = typeof insurers[number];
export type InsurerId = Insurer['id'] | 'other';
export function insurancePreset(template: TemplateKey, preset?: string | null): InsurancePreset | undefined {
  return template === 'other' ? insurancePresets.find(key => key === preset) : undefined;
}
export function availableInsurers(template: TemplateKey, preset?: string | null): readonly Insurer[] {
  const category = insurancePreset(template, preset);
  return category ? insurers.filter(insurer => category === 'other-insurance' || (insurer.categories as readonly string[]).includes(category)) : [];
}
export function getInsurer(template: TemplateKey, preset?: string | null, id?: string | null): Insurer | undefined {
  return availableInsurers(template, preset).find(insurer => insurer.id === id);
}
export function isInsurer(id: string, preset?: string | null): id is InsurerId {
  return Boolean(insurancePreset('other', preset)) && (id === 'other' || Boolean(getInsurer('other', preset, id)));
}
export function insurerLabel(item: { template_key: TemplateKey; reminder_preset?: string | null; insurer_id?: string | null; insurer_name?: string | null }) {
  if (!insurancePreset(item.template_key, item.reminder_preset)) return undefined;
  return item.insurer_id === 'other' ? item.insurer_name?.trim() || 'Other insurer / provider' : getInsurer(item.template_key, item.reminder_preset, item.insurer_id)?.label;
}
