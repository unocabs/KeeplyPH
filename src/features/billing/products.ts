export const products = {
  slots_30: { name: '5 alert slots — 30 days', amount: 2900, description: 'Five extra alert slots for 30 days. Renew manually; no automatic charges.' },
  slots_permanent: { name: '5 permanent alert slots', amount: 24900, description: 'Five extra alert slots, permanently. One payment.' },
} as const;
export type Product = keyof typeof products;
export function isProduct(value: string): value is Product { return Object.hasOwn(products, value); }
