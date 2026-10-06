import type { Item } from './domain';
import { lenderLabel } from './lenders';
import { insurerLabel } from './insurers';
export function reminderProviderLabel(item: Item) {
  return lenderLabel(item) || insurerLabel(item);
}
