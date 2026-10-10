import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap { return ['','/bill-tracker','/pricing','/loan-payment-reminder','/warranty-tracker','/vehicle-registration-reminder','/lto-registration-renewal','/aircon-cleaning-schedule','/document-expiry-tracker','/privacy','/terms'].map(path=>({url:'https://www.keeplyph.com'+path})); }
