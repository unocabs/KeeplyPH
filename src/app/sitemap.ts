import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap { return ['','/pricing','/loan-payment-reminder','/warranty-tracker','/vehicle-registration-reminder','/lto-registration-renewal','/document-expiry-tracker','/privacy','/terms'].map(path=>({url:'https://www.keeplyph.com'+path})); }
