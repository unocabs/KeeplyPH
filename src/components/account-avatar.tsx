'use client';

import Image from 'next/image';
import { useState } from 'react';

export function AccountAvatar({ name, src }: { name: string; src?: string | null }) {
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  return <span className="avatar" aria-hidden="true">
    {(name.trim() || 'K').slice(0, 1).toUpperCase()}
    {src && failed !== src && <Image key={src} src={src} alt="" width={35} height={35} unoptimized referrerPolicy="no-referrer"
      className={'avatar-photo' + (loaded === src ? ' is-loaded' : '')}
      onLoad={() => setLoaded(src)} onError={() => setFailed(src)} />}
  </span>;
}
