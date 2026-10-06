'use client';
import { HandCoins } from 'lucide-react';
import { availableLenders, getLender, type LoanPreset } from '@/features/items/lenders';
import { LenderLogo } from './lender-logo';
import { ProviderPicker } from './provider-picker';
export function LenderPicker({ value, onChange, preset }: { value: string; preset: LoanPreset; onChange: (brand: string) => void }) {
  const choices = [{ id: '', label: 'No lender selected' }, ...availableLenders('other', preset), { id: 'other', label: 'Other lender' }];
  return <ProviderPicker value={value} onChange={onChange} title="Lender / provider" fieldName="lender_id" choices={choices} logo={id => {
    const lender = getLender('other', preset, id);
    return lender ? <LenderLogo lender={lender} fallback={<HandCoins size={20} />} /> : <HandCoins size={20} />;
  }} note={value === 'motortrade' ? 'Motortrade is a dealer. You can select the financing company on your agreement instead.' : undefined} />;
}
