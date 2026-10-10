import type {Usage} from '@/lib/domain';
import {premiumExpiry,premiumExpiryHeading} from '@/features/premium/discovery';
export function PremiumAccessMessage({usage}:{usage:Usage}) {
 return <><h2>{premiumExpiry(usage)?premiumExpiryHeading(usage):usage.household_premium?'Your Premium is active':'Organise for free. Prepare with Premium.'}</h2>
 <p className="section-description">{premiumExpiry(usage)?'Everything you’ve saved is still here. Your records, history, alerts, amount editing and next 30 days remain available with Free. Unlock Premium again whenever it helps.':'Keep records, dates, alerts and payment history with Free. Premium adds your 30-Day Spending Checkup, monthly comparisons and planning up to a year ahead.'}</p></>;
}
