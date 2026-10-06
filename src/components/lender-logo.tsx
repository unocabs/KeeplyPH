'use client';
import type { ReactNode } from 'react';
import type { Lender } from '@/features/items/lenders';
import { ProviderLogo } from './provider-logo';
export function LenderLogo({ lender, fallback, badge }: { lender: Lender; fallback: ReactNode; badge?: ReactNode }) {
  return <ProviderLogo source={'/lenders/' + lender.logo + '.webp'} fallback={fallback} badge={badge} />;
}
