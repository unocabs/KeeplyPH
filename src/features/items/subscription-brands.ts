import type { TemplateKey } from '@/features/templates';

export const subscriptionBrands = [
  { id: 'netflix', label: 'Netflix', preset: 'streaming' },
  { id: 'disney-plus', label: 'Disney+', preset: 'streaming' },
  { id: 'hbo-max', label: 'HBO Max', preset: 'streaming' },
  { id: 'prime-video', label: 'Prime Video', preset: 'streaming' },
  { id: 'apple-tv', label: 'Apple TV', preset: 'streaming' },
  { id: 'viu', label: 'Viu', preset: 'streaming' },
  { id: 'iqiyi', label: 'iQIYI', preset: 'streaming' },
  { id: 'wetv', label: 'WeTV', preset: 'streaming' },
  { id: 'crunchyroll', label: 'Crunchyroll', preset: 'streaming' },
  { id: 'iwant', label: 'iWant', preset: 'streaming' },
  { id: 'viva-one', label: 'Viva One', preset: 'streaming' },
  { id: 'vmx', label: 'VMX', preset: 'streaming' },
  { id: 'spotify', label: 'Spotify', preset: 'streaming' },
  { id: 'apple-music', label: 'Apple Music', preset: 'streaming' },
  { id: 'youtube-music', label: 'YouTube Music', preset: 'streaming' },
  { id: 'youtube-premium', label: 'YouTube Premium', preset: 'streaming' },
  { id: 'cignal-play', label: 'Cignal Play', preset: 'streaming' },
  { id: 'bein-sports', label: 'beIN SPORTS CONNECT', preset: 'streaming' },
  { id: 'anytime-fitness', label: 'Anytime Fitness', preset: 'gym' },
  { id: 'fitness-first', label: 'Fitness First', preset: 'gym' },
  { id: 'golds-gym', label: "Gold’s Gym", preset: 'gym' },
  { id: 'surge', label: 'Surge Fitness + Lifestyle', preset: 'gym' },
  { id: 'snap-fitness', label: 'Snap Fitness', preset: 'gym' },
  { id: 'slimmers-world', label: 'Slimmers World', preset: 'gym' },
  { id: 'ufc-gym', label: 'UFC Gym', preset: 'gym' },
  { id: 'kinetix-lab', label: 'Kinetix Lab', preset: 'gym' },
] as const;

export type SubscriptionBrand = typeof subscriptionBrands[number];
export function supportsSubscriptionBrand(template: TemplateKey, preset?: string | null) {
  return template === 'other' && (preset === 'streaming' || preset === 'gym');
}
export type SubscriptionBrandId = SubscriptionBrand['id'] | 'other';
export function getSubscriptionBrand(template: TemplateKey, preset?: string | null, value?: string | null): SubscriptionBrand | undefined {
  if (!supportsSubscriptionBrand(template, preset)) return;
  return subscriptionBrands.find(brand => brand.id === value && brand.preset === preset);
}
export function isSubscriptionBrand(value: string, preset?: string | null): value is SubscriptionBrandId {
  return value === 'other' || subscriptionBrands.some(brand => brand.id === value && (!preset || brand.preset === preset));
}
