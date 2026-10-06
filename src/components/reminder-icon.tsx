import { CategoryGlyph } from './icons/category-glyph';
import { categoryIcons, templateIcons, purchaseIcons, presetIcons, dateIcons } from './icons/icon-specs';
import { isReminderPreset, type TemplateKey, type ReminderPreset, type DateKind } from '@/features/templates';
import { itemCategory, paymentPreset } from '@/features/templates/categories';
import type { Category } from '@/lib/domain';
import { supportsMotorcycleBrand } from '@/features/items/motorcycle-brands';
import { supportsCarBrand } from '@/features/items/car-brands';
import { CarBrandLogo } from './car-brand-logo';
import { getSubscriptionBrand } from '@/features/items/subscription-brands';
import { SubscriptionBrandLogo } from './subscription-brand-logo';
import { getLender, loanPreset } from '@/features/items/lenders';
import { LenderLogo } from './lender-logo';
import { getUtility } from '@/features/items/utilities';
import { getInsurer } from '@/features/items/insurers';
import { ProviderLogo } from './provider-logo';

interface IconProps {
  template: TemplateKey;
  category?: Category | null;
  preset?: string | null;
  group?: string;
  focus?: string;
  brand?: string | null;
  motorcycleBrand?: string | null;
  subscriptionBrand?: string | null;
  utilityId?: string | null;
  insurerId?: string | null;
  lenderId?: string | null;
  size?: number;
}
/** Shared identity across category choices, saved reminders and date lists. */
export function TemplateIcon({ template, category, preset, group, focus, size = 22 }: IconProps) {
  const spec = group ? categoryIcons[group] || templateIcons.other
    : isReminderPreset(preset || undefined) ? presetIcons[preset as ReminderPreset]
    : template === 'receipt' && category ? purchaseIcons[category]
    : templateIcons[template] || templateIcons.other;
  const modifier = !group && (template === 'car' || template === 'motorcycle')
    ? focus === 'service' ? 'maintenance' : focus === 'insurance' ? 'insurance' : focus === 'registration' ? 'registration' : undefined
    : spec.modifier;
  return <CategoryGlyph {...spec} modifier={modifier} size={size} />;
}
export function ReminderIcon(props: IconProps) {
  const group = props.group || itemCategory({ template_key: props.template, reminder_preset: props.preset });
  const utility = getUtility(props.template, props.preset, props.utilityId);
  if (utility) return <span className="reminder-icon group-bills lender-icon" aria-hidden="true"><ProviderLogo source={'/utilities/' + utility.logo + '.webp'} fallback={<TemplateIcon {...props} />} badge={<span className="loan-badge utility-badge"><TemplateIcon template={props.template} preset={props.preset} /></span>} /></span>;
  const insurer = getInsurer(props.template, props.preset, props.insurerId);
  if (insurer) return <span className="reminder-icon group-insurance lender-icon" aria-hidden="true"><ProviderLogo source={'/insurers/' + insurer.logo + '.webp'} fallback={<TemplateIcon {...props} />} badge={<span className="loan-badge insurance-badge"><CategoryGlyph icon="shield-check" /></span>} /></span>;
  const lender = getLender(props.template, props.preset, props.lenderId);
  if (lender) return <span className="reminder-icon group-loans lender-icon" aria-hidden="true"><LenderLogo lender={lender} fallback={<CategoryGlyph icon="hand-coins" size={props.size || 22} />} badge={<span className="loan-badge"><CategoryGlyph icon="hand-coins" /></span>} /></span>;
  // Saved loan reminders use loan identity; manufacturer artwork stays on vehicle reminders.
  // Category choices omit lenderId so their distinct loan-type glyphs remain intact.
  if (loanPreset(props.template, props.preset) && 'lenderId' in props) return <span className="reminder-icon group-loans" aria-hidden="true"><CategoryGlyph icon="hand-coins" size={props.size || 22} /></span>;
  const subscription = getSubscriptionBrand(props.template, props.preset, props.subscriptionBrand);
  if (subscription) return <span className={'reminder-icon group-' + group} aria-hidden="true"><SubscriptionBrandLogo brand={subscription} fallback={<TemplateIcon {...props} />} /></span>;
  return <span className={'reminder-icon group-' + group} aria-hidden="true">{supportsMotorcycleBrand(props.template, props.preset) && props.motorcycleBrand ? <CarBrandLogo kind="motorcycle" brand={props.motorcycleBrand} fallback={<TemplateIcon {...props} />} /> : supportsCarBrand(props.template, props.preset) && props.brand ? <CarBrandLogo brand={props.brand} fallback={<TemplateIcon {...props} />} /> : <TemplateIcon {...props} />}</span>;
}
/** A date's purpose is separate from the item it belongs to. */
export function DateIcon({ kind, label, preset, size = 16 }: { kind: DateKind; label?: string; preset?: string | null; size?: number }) {
  const spec = kind === 'other' && label === 'Policy renewal / review' ? dateIcons.insurance
    : kind === 'other' && paymentPreset(preset) ? { icon: 'wallet' as const } : dateIcons[kind];
  return <CategoryGlyph {...spec} size={size} />;
}
