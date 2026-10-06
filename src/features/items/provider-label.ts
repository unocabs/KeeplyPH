import type { Item } from './domain';
import { lenderLabel } from './lenders';
import { insurerLabel } from './insurers';
import { utilityLabel } from './utilities';
export function reminderProviderLabel(item: Item) {
  return lenderLabel(item) || insurerLabel(item) || utilityLabel(item);
}
