export const premiumProducts={premium_30:{amount:5900,label:'30 days',period:'for 30 days'},premium_year:{amount:49900,label:'One year',period:'per year'}} as const;
export type PremiumProduct=keyof typeof premiumProducts;
export function isPremiumProduct(value:string):value is PremiumProduct{return Object.hasOwn(premiumProducts,value);}
