import type { TemplateKey } from '@/features/templates';
export const utilityPresets = ['electric-bill', 'water-bill', 'internet-bill', 'mobile-bill', 'rent', 'association-dues', 'other-bill'] as const;
export type UtilityPreset = typeof utilityPresets[number];
// One asset per company, reused across service types. BATELEC I and II are distinct providers.
export const utilities = [
  { id: 'meralco', label: 'Meralco', logo: 'meralco', categories: ['electric-bill'] },
  { id: 'visayan-electric', label: 'Visayan Electric (VECO)', logo: 'visayan-electric', categories: ['electric-bill'] },
  { id: 'davao-light', label: 'Davao Light', logo: 'davao-light', categories: ['electric-bill'] },
  { id: 'more-power', label: 'MORE Power', logo: 'more-power', categories: ['electric-bill'] },
  { id: 'cepalco', label: 'CEPALCO', logo: 'cepalco', categories: ['electric-bill'] },
  { id: 'beneco', label: 'BENECO', logo: 'beneco', categories: ['electric-bill'] },
  { id: 'batelec-i', label: 'BATELEC I', logo: 'batelec-i', categories: ['electric-bill'] },
  { id: 'batelec-ii', label: 'BATELEC II', logo: 'batelec-ii', categories: ['electric-bill'] },
  { id: 'angeles-electric', label: 'Angeles Electric', logo: 'angeles-electric', categories: ['electric-bill'] },
  { id: 'sfelapco', label: 'SFELAPCO', logo: 'sfelapco', categories: ['electric-bill'] },
  { id: 'iligan-light', label: 'Iligan Light', logo: 'iligan-light', categories: ['electric-bill'] },
  { id: 'olongapo-electric', label: 'Olongapo Electricity Distribution', logo: 'olongapo-electric', categories: ['electric-bill'] },
  { id: 'maynilad', label: 'Maynilad', logo: 'maynilad', categories: ['water-bill'] },
  { id: 'manila-water', label: 'Manila Water', logo: 'manila-water', categories: ['water-bill'] },
  { id: 'primewater', label: 'PrimeWater', logo: 'primewater', categories: ['water-bill'] },
  { id: 'laguna-water', label: 'Laguna Water', logo: 'laguna-water', categories: ['water-bill'] },
  { id: 'boracay-water', label: 'Boracay Water', logo: 'boracay-water', categories: ['water-bill'] },
  { id: 'mcwd', label: 'Metropolitan Cebu Water District (MCWD)', logo: 'mcwd', categories: ['water-bill'] },
  { id: 'davao-water', label: 'Davao City Water District', logo: 'davao-water', categories: ['water-bill'] },
  { id: 'metro-pacific-iloilo-water', label: 'Metro Pacific Iloilo Water', logo: 'metro-pacific-iloilo-water', categories: ['water-bill'] },
  { id: 'subic-water', label: 'Subic Water', logo: 'subic-water', categories: ['water-bill'] },
  { id: 'metro-lipa-water', label: 'Metro Lipa Water District', logo: 'metro-lipa-water', categories: ['water-bill'] },
  { id: 'pldt', label: 'PLDT', logo: 'pldt', categories: ['internet-bill', 'mobile-bill'] },
  { id: 'globe', label: 'Globe', logo: 'globe', categories: ['internet-bill', 'mobile-bill'] },
  { id: 'converge', label: 'Converge', logo: 'converge', categories: ['internet-bill'] },
  { id: 'sky', label: 'SKY', logo: 'sky', categories: ['internet-bill', 'other-bill'] },
  { id: 'dito', label: 'DITO', logo: 'dito', categories: ['internet-bill', 'mobile-bill'] },
  { id: 'eastern', label: 'Eastern Communications', logo: 'eastern', categories: ['internet-bill'] },
  { id: 'cablelink', label: 'Cablelink', logo: 'cablelink', categories: ['internet-bill', 'other-bill'] },
  { id: 'smart', label: 'Smart', logo: 'smart', categories: ['mobile-bill'] },
] as const satisfies readonly { id: string; label: string; logo: string; categories: readonly UtilityPreset[] }[];
export type Utility = typeof utilities[number];
const serviceLabels: Record<string, Partial<Record<UtilityPreset, string>>> = {
  pldt: { 'internet-bill': 'PLDT Home', 'mobile-bill': 'PLDT landline' },
  globe: { 'internet-bill': 'Globe At Home', 'mobile-bill': 'Globe Postpaid' },
  dito: { 'internet-bill': 'DITO Home', 'mobile-bill': 'DITO Postpaid' },
  smart: { 'mobile-bill': 'Smart Postpaid' },
  sky: { 'internet-bill': 'SKY Fiber / SKY TruFiber', 'other-bill': 'SKYcable' },
  cablelink: { 'internet-bill': 'Cablelink Internet', 'other-bill': 'Cablelink cable TV' },
};
export function utilityPreset(template: TemplateKey, preset?: string | null): UtilityPreset | undefined {
  return template === 'other' ? utilityPresets.find(key => key === preset) : undefined;
}
export function availableUtilities(template: TemplateKey, preset?: string | null): readonly Utility[] {
  const category = utilityPreset(template, preset);
  return category ? utilities.filter(provider => (provider.categories as readonly string[]).includes(category)) : [];
}
export function getUtility(template: TemplateKey, preset?: string | null, id?: string | null): Utility | undefined {
  return availableUtilities(template, preset).find(provider => provider.id === id);
}
export function isUtility(id: string, preset?: string | null): boolean {
  return Boolean(utilityPreset('other', preset)) && (id === 'other' || Boolean(getUtility('other', preset, id)));
}
export function utilityServiceLabel(provider: Utility, preset: UtilityPreset) {
  return serviceLabels[provider.id]?.[preset] || provider.label;
}
export function utilityLabel(item: { template_key: TemplateKey; reminder_preset?: string | null; utility_id?: string | null; utility_name?: string | null }) {
  const preset = utilityPreset(item.template_key, item.reminder_preset);
  if (!preset) return undefined;
  const provider = getUtility(item.template_key, preset, item.utility_id);
  return item.utility_id === 'other' ? item.utility_name?.trim() || 'Other biller' : provider ? utilityServiceLabel(provider, preset) : undefined;
}
