/** iCalendar TEXT escaping and folding count UTF-8 octets, including continuation spaces. */
export function calendarText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
}
export function foldCalendarLine(line: string) {
  const lines: string[] = []; let part = '', bytes = 0;
  for (const character of line) {
    const size = new TextEncoder().encode(character).length;
    if (bytes + size > 75) { lines.push(part); part = ' '; bytes = 1; }
    part += character; bytes += size;
  }
  lines.push(part); return lines.join('\r\n');
}
export function calendarEvent(input: { occurrenceId: string; dueOn: string; product: string; label: string; url: string }, now = new Date()) {
  const next = new Date(input.dueOn + 'T00:00:00Z'); next.setUTCDate(next.getUTCDate() + 1);
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [ 'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Keeply//Date export//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${input.occurrenceId}@keeplyph.com`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${input.dueOn.replace(/-/g, '')}`,
    `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, '')}`,
    `SUMMARY:${calendarText(input.product + ' · ' + input.label)}`,
    `DESCRIPTION:${calendarText('Keeply reminder: ' + input.label + '. One-time export; later Keeply changes do not update this event.\n' + input.url)}`,
    `URL:${input.url}`, 'END:VEVENT', 'END:VCALENDAR', '' ].map(foldCalendarLine).join('\r\n');
}
export function calendarFilename(product: string) {
  const name = product.normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
  return (name || 'keeply-reminder') + '.ics';
}
