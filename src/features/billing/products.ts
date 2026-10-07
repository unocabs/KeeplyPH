export const MIN_SLOTS = 5;
export const MAX_SLOTS = 100;
export const SLOT_STEP = 5;
export const products = {
  slots_30: { amount: 2900, originalAmount: 4900, period: 'for 30 days' },
  slots_permanent: { amount: 24900, originalAmount: 49900, period: 'one-time' },
} as const;
export type Product = keyof typeof products;
export function isProduct(value: string): value is Product { return Object.hasOwn(products, value); }
export function isSlotCount(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_SLOTS && value <= MAX_SLOTS && value % SLOT_STEP === 0;
}
export function packPrice(product: Product, slots: number) {
  if (!isSlotCount(slots)) throw new Error('Choose 5–100 slots in increments of 5.');
  const pack = products[product];
  return { amount: pack.amount * slots / SLOT_STEP, originalAmount: pack.originalAmount * slots / SLOT_STEP };
}
export function packDescription(product: Product, slots: number) {
  return `${slots} extra alert slots${product === 'slots_30' ? ' for 30 days. Renew manually; no automatic charges.' : ', permanently. One-time payment.'}`;
}
