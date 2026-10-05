'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import type { SubscriptionBrand } from '@/features/items/subscription-brands';

export function SubscriptionBrandLogo({ brand, fallback }: { brand: SubscriptionBrand; fallback: ReactNode }) {
  const [failedSource, setFailedSource] = useState<string>();
  const source = '/subscription-brands/' + brand.id + '.webp';
  if (failedSource === source) return <>{fallback}</>;
  return <Image className={"subscription-brand-logo" + (["surge", "slimmers-world"].includes(brand.id) ? " subscription-brand-monochrome" : "")} src={source} alt="" width={128} height={128} unoptimized onError={() => setFailedSource(source)} />;
}
