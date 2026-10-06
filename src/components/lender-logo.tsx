'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import type { Lender } from '@/features/items/lenders';

export function LenderLogo({ lender, fallback, badge }: { lender: Lender; fallback: ReactNode; badge?: ReactNode }) {
  const [failedSource, setFailedSource] = useState<string>();
  const source = '/lenders/' + lender.logo + '.webp';
  if (failedSource === source) return <>{fallback}</>;
  return <><Image className="lender-logo" src={source} alt="" width={128} height={128} unoptimized onError={() => setFailedSource(source)} />{badge}</>;
}
