const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October'];

/** Standard private-car plate schedule only; no inference of validity or extensions. */
export function ltoSchedule(input: string, year: number) {
  const plate = input.trim().toUpperCase().replace(/[ -]/g, '');
  if (!/^(?:\d{2}|[A-Z]{3}\d{3,4})$/.test(plate) || !Number.isInteger(year) || year < 2000 || year > 2100) return null;
  const last = Number(plate.at(-1));
  const preceding = Number(plate.at(-2));
  const month = last === 0 ? 10 : last;
  const start = preceding >= 1 && preceding <= 3 ? 1 : preceding >= 4 && preceding <= 6 ? 8 : preceding >= 7 && preceding <= 8 ? 15 : 22;
  const end = start === 22 ? new Date(Date.UTC(year, month, 0)).getUTCDate() : start + 6;
  return { month: months[month - 1], start, end, year, last, preceding };
}

/** Only a standard window's suggested start date may be carried through sign-in. */
export function safeRenewalDate(value?: string | null): string | undefined {
  return typeof value === 'string' && /^(20\d{2}|2100)-(0[1-9]|10)-(01|08|15|22)$/.test(value) ? value : undefined;
}

export function suggestedRenewalDate(input: string, year: number): string | undefined {
  const result = ltoSchedule(input, year);
  if (!result) return undefined;
  const month = result.last === 0 ? 10 : result.last;
  return `${year}-${String(month).padStart(2, '0')}-${String(result.start).padStart(2, '0')}`;
}
