'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';

export function ProviderLogo({ source, fallback, badge }: { source: string; fallback: ReactNode; badge?: ReactNode }) {
  const [failedSource, setFailedSource] = useState<string>();
  if (failedSource === source) return <>{fallback}</>;
  return <><Image className="lender-logo" src={source} alt="" width={128} height={128} unoptimized onError={() => setFailedSource(source)} />{badge}</>;
}
