import type { Usage } from '@/lib/domain';
export type DiscoveryVariant='control'|'contextual';
export function premiumExpiry(usage:Usage):'trial'|'paid'|null {
 if(usage.household_premium)return null;
 if(usage.installation_premium_expired)return 'trial';
 return usage.household_premium_until&&Date.parse(usage.household_premium_until)<=Date.now()?'paid':null;
}
export function premiumExpiryHeading(usage:Usage) {
 return premiumExpiry(usage)==='trial'?'Your Premium trial has ended':'Your Premium has ended';
}
