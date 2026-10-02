import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Keeply PH', short_name: 'Keeply PH',
    description: 'Your reminders for receipts, renewals and important dates, with optional alerts.',
    id: '/', scope: '/', start_url: '/dashboard', display: 'standalone', background_color: '#faf9ff', theme_color: '#6746cb',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
