import { loanPresetKeys, type TemplateKey } from '@/features/templates';

export const loanPresets = loanPresetKeys;
export type LoanPreset = typeof loanPresets[number];
const bankCategories: readonly LoanPreset[] = ['personal-loan', 'home-loan', 'car-loan', 'motorcycle-loan', 'business-loan', 'credit-card-installment'];
// One entry and one logo source per provider, shared across eligible loan types.
export const lenders = [
  { id: 'bdo', label: 'BDO', logo: 'bdo', categories: bankCategories },
  { id: 'bpi', label: 'BPI', logo: 'bpi', categories: bankCategories },
  { id: 'unionbank', label: 'UnionBank', logo: 'unionbank', categories: bankCategories },
  { id: 'metrobank', label: 'Metrobank', logo: 'metrobank', categories: bankCategories },
  { id: 'security-bank', label: 'Security Bank', logo: 'security-bank', categories: bankCategories },
  { id: 'rcbc', label: 'RCBC', logo: 'rcbc', categories: bankCategories },
  { id: 'eastwest', label: 'EastWest', logo: 'eastwest', categories: bankCategories },
  { id: 'psbank', label: 'PSBank', logo: 'psbank', categories: bankCategories },
  { id: 'pnb', label: 'PNB', logo: 'pnb', categories: bankCategories },
  { id: 'chinabank', label: 'Chinabank', logo: 'chinabank', categories: bankCategories },
  { id: 'landbank', label: 'LANDBANK', logo: 'landbank', categories: bankCategories },
  { id: 'dbp', label: 'DBP', logo: 'dbp', categories: bankCategories },
  { id: 'home-credit', label: 'Home Credit', logo: 'home-credit', categories: ['personal-loan', 'credit-card-installment', 'digital-online-loan'] },
  { id: 'cimb', label: 'CIMB', logo: 'cimb', categories: ['personal-loan', 'digital-online-loan'] },
  { id: 'pag-ibig', label: 'Pag-IBIG', logo: 'pag-ibig', categories: ['home-loan', 'salary-government-loan'] },
  { id: 'toyota-financial', label: 'Toyota Financial Services', logo: 'toyota-financial', categories: ['car-loan'] },
  { id: 'sumisho', label: 'Sumisho', logo: 'sumisho', categories: ['motorcycle-loan'] },
  { id: 'aeon-credit', label: 'AEON Credit', logo: 'aeon-credit', categories: ['motorcycle-loan'] },
  { id: 'motortrade', label: 'Motortrade', logo: 'motortrade', categories: ['motorcycle-loan'], dealer: true },
  { id: 'sb-corporation', label: 'SB Corporation', logo: 'sb-corporation', categories: ['business-loan'] },
  { id: 'sss', label: 'SSS', logo: 'sss', categories: ['salary-government-loan'] },
  { id: 'gsis', label: 'GSIS', logo: 'gsis', categories: ['salary-government-loan'] },
  { id: 'hsbc', label: 'HSBC', logo: 'hsbc', categories: ['credit-card-installment'] },
  { id: 'billease', label: 'BillEase', logo: 'billease', categories: ['credit-card-installment', 'digital-online-loan'] },
  { id: 'atome', label: 'Atome', logo: 'atome', categories: ['credit-card-installment', 'digital-online-loan'] },
  { id: 'gloan', label: 'GCash · GLoan', logo: 'gcash', categories: ['digital-online-loan'] },
  { id: 'ggives', label: 'GCash · GGives', logo: 'gcash', categories: ['credit-card-installment', 'digital-online-loan'] },
  { id: 'maya', label: 'Maya', logo: 'maya', categories: ['digital-online-loan'] },
  { id: 'spaylater', label: 'Shopee · SPayLater', logo: 'shopee', categories: ['credit-card-installment', 'digital-online-loan'] },
  { id: 'sloan', label: 'Shopee · SLoan', logo: 'shopee', categories: ['digital-online-loan'] },
] as const satisfies readonly { id: string; label: string; logo: string; categories: readonly LoanPreset[]; dealer?: boolean }[];
export type Lender = typeof lenders[number];
export type LenderId = Lender['id'] | 'other';
export function loanPreset(template: TemplateKey, preset?: string | null): LoanPreset | undefined {
  if (template !== 'other') return;
  const value = preset === 'car-payment' ? 'car-loan' : preset;
  return loanPresets.find(key => key === value);
}
export function availableLenders(template: TemplateKey, preset?: string | null): readonly Lender[] {
  const category = loanPreset(template, preset);
  if (!category) return [];
  return lenders.filter(lender => category === 'other-loan' || (lender.categories as readonly string[]).includes(category));
}
export function getLender(template: TemplateKey, preset?: string | null, id?: string | null): Lender | undefined {
  return availableLenders(template, preset).find(lender => lender.id === id);
}
export function isLender(id: string, preset?: string | null): id is LenderId {
  return Boolean(loanPreset('other', preset)) && (id === 'other' || Boolean(getLender('other', preset, id)));
}
export function lenderLabel(item: { template_key: TemplateKey; reminder_preset?: string | null; lender_id?: string | null; lender_name?: string | null }) {
  if (!loanPreset(item.template_key, item.reminder_preset)) return undefined;
  return item.lender_id === 'other' ? item.lender_name?.trim() || 'Other lender' : getLender(item.template_key, item.reminder_preset, item.lender_id)?.label;
}
