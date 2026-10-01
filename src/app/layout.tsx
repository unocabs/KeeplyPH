import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL('https://www.keeplyph.com'), title: { default: 'Keeply PH — Loans, Bills, Warranties & ID Reminders', template: '%s · Keeply PH' },
  applicationName: 'Keeply PH',
  appleWebApp: { capable: true, title: 'Keeply PH', statusBarStyle: 'default' },
  twitter: { card: 'summary_large_image' },
  openGraph: { locale: 'en_PH', siteName: 'Keeply PH', type: 'website' },
  description: 'Your all-in-one place for recurring loan payments, warranties, IDs, passports, bills and other important dates, with email alerts you choose.',
};
export const dynamic = 'force-dynamic';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en-PH"><body><a className="skip-link" href="#main-content">Skip to content</a>{children}</body></html>;
}
