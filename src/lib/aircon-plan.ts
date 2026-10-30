import { addMonths } from './domain';

export interface AirconPlan { serviceDate: string; serviceInterval: number }

function calendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '2200-12-31') return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Carry only the next planned date and an explicitly chosen interval through sign-in. */
export function safeAirconPlan(serviceDate: unknown, serviceInterval: unknown): AirconPlan | undefined {
  if (!calendarDate(serviceDate) || !['string', 'number'].includes(typeof serviceInterval)) return undefined;
  if (!/^\d{1,3}$/.test(String(serviceInterval))) return undefined;
  const months = Number(serviceInterval);
  return Number.isInteger(months) && months >= 1 && months <= 120 ? { serviceDate, serviceInterval: months } : undefined;
}

export function planAirconCleaning(last: string, interval: string, today: string): { plan: AirconPlan; last: string } | { field: 'last' | 'interval'; error: string } {
  if (!calendarDate(last) || last > today) return { field: 'last', error: 'Enter the date of a completed professional clean, between 1900 and today.' };
  const checked = safeAirconPlan(last, interval);
  if (!checked) return { field: 'interval', error: 'Choose a whole number of months from 1 to 120, using the interval recommended for your unit.' };
  const plan = safeAirconPlan(addMonths(last, checked.serviceInterval), checked.serviceInterval);
  if (!plan) return { field: 'last', error: 'The planned date must be before the end of 2200. Check the date and interval.' };
  return { plan, last };
}
