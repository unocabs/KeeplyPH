'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import { Car } from 'lucide-react';
import { getCarBrand } from '@/features/items/car-brands';

export function CarBrandLogo({ brand, fallback = <Car size={22} aria-hidden="true" /> }: { brand?: string | null; fallback?: ReactNode }) {
  const selected = getCarBrand(brand);
  const [failedSource, setFailedSource] = useState<string>();
  if (!selected || failedSource === selected.logo) return <>{fallback}</>;
  return <Image className="car-brand-logo" src={selected.logo} alt="" width={64} height={64} unoptimized onError={() => setFailedSource(selected.logo)} />;
}
