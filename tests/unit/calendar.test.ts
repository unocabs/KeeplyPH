import { describe, expect, it } from 'vitest';
import { calendarEvent, calendarText, calendarFilename, foldCalendarLine } from '@/features/items/calendar';
const input = { occurrenceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', dueOn: '2032-02-29', product: 'Car, renewal; reminder\\ test\r\nBEGIN:VEVENT', label: '支払い😀'.repeat(25), url: 'https://keeplyph.com/items/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb?date=cccccccc-cccc-4ccc-8ccc-cccccccccccc' };
describe('one-time calendar exports', () => {
  it('exports the actual due date as one all-day event with exclusive next day and stable UID', () => {
    const event = calendarEvent(input, new Date('2026-10-02T01:02:03Z'));
    const unfolded = event.replace(/\r\n /g, '');
    expect(event).toContain('DTSTART;VALUE=DATE:20320229\r\n');
    expect(event).toContain('DTEND;VALUE=DATE:20320301\r\n');
    expect(event).toContain('DTSTAMP:20261002T010203Z');
    expect(event).toContain('UID:' + input.occurrenceId + '@keeplyph.com');
    expect(unfolded).toContain('URL:' + input.url);
    expect(unfolded).toContain('One-time export');
    expect(event).not.toContain('RRULE');
    expect(event.match(/^BEGIN:VEVENT$/gm)).toHaveLength(1);
    expect(event.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(event.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });
  it('escapes text injection and folds at 75 UTF-8 bytes without splitting characters', () => {
    expect(calendarText('a\\b;c,d\r\ne')).toBe('a\\\\b\\;c\\,d\\ne');
    const event = calendarEvent(input);
    for (const line of event.split('\r\n')) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    expect(event).not.toContain('\ufffd');
    const long = 'SUMMARY:' + '😀é界'.repeat(100);
    expect(foldCalendarLine(long).replace(/\r\n /g, '')).toBe(long);
    expect(event.replace(/\r\n /g, '')).toContain('SUMMARY:Car\\, renewal\\; reminder\\\\ test\\nBEGIN:VEVENT');
  });
  it('uses safe bounded filenames and handles year boundaries', () => {
    expect(calendarFilename('../../private\r\nHeader: bad')).toBe('private-Header-bad.ics');
    expect(calendarFilename('支払い')).toBe('keeply-reminder.ics');
    expect(calendarFilename('x'.repeat(100)).length).toBe(68);
    expect(calendarEvent({ ...input, dueOn: '2031-12-31' })).toContain('DTEND;VALUE=DATE:20320101');
  });
});
