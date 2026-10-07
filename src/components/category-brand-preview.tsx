'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './category-brand-preview.module.css';

// These previews reuse the same artwork as the individual brand/provider pickers.
const previews: Record<string, readonly { name: string; source: string }[]> = {
  vehicles: [
    { name: 'Toyota', source: '/car-brands/toyota.webp' },
    { name: 'Honda', source: '/car-brands/honda.webp' },
    { name: 'Kia', source: '/car-brands/kia.webp' },
  ],
  insurance: [
    { name: 'Sun Life', source: '/insurers/sun-life.webp' },
    { name: 'AIA', source: '/insurers/aia.webp' },
    { name: 'Pru Life UK', source: '/insurers/pru-life-uk.webp' },
  ],
  bills: [
    { name: 'Meralco', source: '/utilities/meralco.webp' },
    { name: 'Maynilad', source: '/utilities/maynilad.webp' },
    { name: 'PLDT', source: '/utilities/pldt.webp' },
  ],
  loans: [
    { name: 'BPI', source: '/lenders/bpi.webp' },
    { name: 'BDO', source: '/lenders/bdo.webp' },
    { name: 'Metrobank', source: '/lenders/metrobank.webp' },
  ],
  subscriptions: [
    { name: 'Netflix', source: '/subscription-brands/netflix.webp' },
    { name: 'Spotify', source: '/subscription-brands/spotify.webp' },
    { name: 'ChatGPT', source: '/subscription-brands/chatgpt.webp' },
  ],
};

export function CategoryBrandPreview({ group }: { group: string }) {
  const [failed, setFailed] = useState<string[]>([]);
  const brands = previews[group]?.filter(brand => !failed.includes(brand.source));
  if (!brands?.length) return null;
  return <span className={styles.row} aria-hidden="true">
    {brands.map(brand => <span key={brand.source} className={styles.logo} title={brand.name}>
      <Image src={brand.source} alt="" width={128} height={128} draggable={false} unoptimized onError={() => setFailed(current => current.includes(brand.source) ? current : [...current, brand.source])} />
    </span>)}
    <span className={styles.more}>+ more</span>
  </span>;
}
