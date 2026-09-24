import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL('https://keeplyph.com'), title: { default: 'Keeply PH — Your important things, remembered', template: '%s · Keeply' },
  openGraph: { locale: 'en_PH', siteName: 'Keeply PH', type: 'website' },
  description: 'Keep receipts, vehicle renewals and document expiry dates together, with reminders you choose.',
};
export const dynamic = 'force-dynamic';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en-PH"><body><a className="skip-link" href="#main-content">Skip to content</a>{children}</body></html>;
}
