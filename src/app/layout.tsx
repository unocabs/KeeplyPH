import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL('https://www.keeplyph.com'), title: { default: 'Keeply: Household Bills, Maintenance & Warranties', template: '%s · Keeply' },
  applicationName: 'Keeply',
  appleWebApp: { capable: true, title: 'Keeply', statusBarStyle: 'default' },
  twitter: { card: 'summary_large_image' },
  openGraph: { locale: 'en_PH', siteName: 'Keeply', type: 'website' },
  description: 'Organise household bills, maintenance, warranties and renewals. Keep important dates and useful details together, with optional alerts.',
};
export const dynamic = 'force-dynamic';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en-PH"><body><a className="skip-link" href="#main-content">Skip to content</a>{children}</body></html>;
}
