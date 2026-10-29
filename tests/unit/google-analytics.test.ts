import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyticsPage, analyticsReferrer, readAnalyticsChoice, setAnalyticsActive, trackAnalytics, type AnalyticsEvent, type AnalyticsSurface } from '@/lib/google-analytics';

afterEach(() => { setAnalyticsActive(false); vi.unstubAllGlobals(); });
describe('Google Analytics privacy boundaries', () => {
  it('accepts only valid unexpired explicit choices', () => {
    const now = 10_000_000_000;
    expect(readAnalyticsChoice(JSON.stringify({ choice: 'granted', at: now }), now)).toBe('granted');
    expect(readAnalyticsChoice(JSON.stringify({ choice: 'denied', at: now }), now)).toBe('denied');
    for (const raw of [null, '{', '{}', 'true', JSON.stringify({ choice: 'granted', at: now + 1 }), JSON.stringify({ choice: 'granted', at: now - 180 * 86400000 }), JSON.stringify({ choice: true, at: now })]) expect(readAnalyticsChoice(raw, now)).toBeNull();
  });
  it('normalizes record identifiers and marks account routes private', () => {
    expect(analyticsPage('/items/11111111-1111-4111-8111-111111111111')).toEqual({ path: '/items/record', private: true });
    expect(analyticsPage('/purchases/11111111-1111-4111-8111-111111111111/edit')).toEqual({ path: '/purchases/record/edit', private: true });
    for (const path of ['/settings/billing', '/add/car', '/checkup', '/items/payments']) expect(analyticsPage(path)?.private).toBe(true);
    expect(analyticsPage('/lto-registration-renewal')).toEqual({ path: '/lto-registration-renewal', private: false });
  });
  it('excludes unknown routes and collapses fictional sample paths', () => {
    expect(analyticsPage('/auth/callback')).toBeNull();
    expect(analyticsPage('/api/documents/private/download')).toBeNull();
    expect(analyticsPage('/unexpected-private-title')).toBeNull();
    expect(analyticsPage('/demo/items/sample-id')).toEqual({ path: '/demo', private: false });
  });
  it('removes referrer queries, hashes, credentials and private identifiers', () => {
    const origin = 'https://www.keeplyph.com';
    expect(analyticsReferrer('https://google.com/search?q=private#private', origin)).toBe('https://google.com/');
    expect(analyticsReferrer(origin + '/items/11111111-1111-4111-8111-111111111111?due=2030-01-01', origin)).toBe(origin + '/items/record');
    expect(analyticsReferrer('https://name:secret@example.com/private', origin)).toBe('https://example.com/');
    expect(analyticsReferrer('javascript:private', origin)).toBe('');
  });
  it('does not send before consent, after withdrawal, or with an unknown event or surface', () => {
    const gtag = vi.fn(); vi.stubGlobal('window', { gtag });
    trackAnalytics('check_schedule', 'calculator');
    expect(gtag).not.toHaveBeenCalled();
    setAnalyticsActive(true, '/lto-registration-renewal');
    trackAnalytics('private name' as AnalyticsEvent, 'calculator');
    trackAnalytics('check_schedule', 'plate=CCC2398' as AnalyticsSurface);
    expect(gtag).not.toHaveBeenCalled();
    trackAnalytics('check_schedule', 'calculator');
    expect(gtag).toHaveBeenCalledExactlyOnceWith('event', 'check_schedule', { surface: 'calculator', page_path: '/lto-registration-renewal' });
    setAnalyticsActive(false); trackAnalytics('check_schedule', 'calculator');
    expect(gtag).toHaveBeenCalledTimes(1);
  });
  it('requires a permitted private route for successful save events and tolerates a blocked tag', () => {
    const gtag = vi.fn(); vi.stubGlobal('window', { gtag });
    setAnalyticsActive(true, '/'); trackAnalytics('reminder_saved', 'app');
    expect(gtag).not.toHaveBeenCalled();
    setAnalyticsActive(true, '/add/car', true); trackAnalytics('reminder_saved', 'app');
    expect(gtag).toHaveBeenCalledTimes(1);
    gtag.mockImplementation(() => { throw new Error('blocked'); });
    expect(() => trackAnalytics('reminder_saved', 'app')).not.toThrow();
  });
});
