'use client';
import { ShieldCheck } from 'lucide-react';
import { availableInsurers, getInsurer, type InsurancePreset } from '@/features/items/insurers';
import { ProviderLogo } from './provider-logo';
import { ProviderPicker } from './provider-picker';
export function InsurerPicker({ value, onChange, preset }: { value: string; preset: InsurancePreset; onChange: (provider: string) => void }) {
  const choices = [{ id: '', label: 'No insurer selected' }, ...availableInsurers('other', preset).map(provider => ({ id: provider.id, label: provider.label + ('hmo' in provider ? ' · HMO' : '') })), { id: 'other', label: 'Other insurer / provider' }];
  const provider = getInsurer('other', preset, value);
  return <ProviderPicker value={value} onChange={onChange} title="Insurer / provider" fieldName="insurer_id" choices={choices} logo={id => {
    const insurer = getInsurer('other', preset, id);
    return insurer ? <ProviderLogo source={'/insurers/' + insurer.logo + '.webp'} fallback={<ShieldCheck size={20} />} /> : <ShieldCheck size={20} />;
  }} note={provider && 'hmo' in provider ? 'HMO provider · for your healthcare plan payment or renewal.' : undefined} />;
}
