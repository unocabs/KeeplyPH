'use client';
import { availableUtilities, getUtility, utilityServiceLabel, type UtilityPreset } from '@/features/items/utilities';
import { ProviderLogo } from './provider-logo';
import { ProviderPicker } from './provider-picker';
import { TemplateIcon } from './reminder-icon';
export function UtilityPicker({ value, onChange, preset }: { value: string; preset: UtilityPreset; onChange: (provider: string) => void }) {
  const custom = preset === 'rent' ? 'Landlord / property manager' : preset === 'association-dues' ? 'Association / condominium corporation' : 'Other biller';
  const choices = [{ id: '', label: 'No biller selected' }, ...availableUtilities('other', preset).map(provider => ({ id: provider.id, label: utilityServiceLabel(provider, preset) })), { id: 'other', label: custom }];
  return <ProviderPicker value={value} onChange={onChange} title="Biller / provider" fieldName="utility_id" choices={choices} logo={id => {
    const provider = getUtility('other', preset, id);
    const fallback = <TemplateIcon template="other" preset={preset} size={20} />;
    return provider ? <ProviderLogo source={'/utilities/' + provider.logo + '.webp'} fallback={fallback} /> : fallback;
  }} />;
}
