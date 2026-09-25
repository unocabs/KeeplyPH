import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap { return ['','/pricing','/warranty-tracker','/vehicle-registration-reminder','/document-expiry-tracker','/privacy','/terms'].map(path=>({url:'https://www.keeplyph.com'+path})); }
