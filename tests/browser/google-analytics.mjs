// Local production browser checks. Google is replaced by a command-queue stand-in.
// Auth and save responses use a local fixture API, never the hosted database.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer, request } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, webkit } from 'playwright';

const output = process.env.GOOGLE_ANALYTICS_TEST_OUTPUT || 'artifacts/google-analytics';
const appPort = 34621, tlsPort = 34622, apiPort = 34623, base = `https://localhost:${tlsPort}`;
const temporary = await mkdtemp(join(tmpdir(), 'keeply-analytics-'));
const reports = [], errors = [], seo = [];
let app, proxy, api, browser, accountAllowed = false, failSave = false;
const owner = '11111111-1111-4111-8111-111111111111';
const user = { id: owner, aud: 'authenticated', role: 'authenticated', email: 'analytics@example.test', user_metadata: { full_name: 'Analytics fixture' }, app_metadata: { provider: 'google' } };
function cancelledLocalPrefetch(error) {
  if (error.engine !== 'webkit') return false;
  const match = error.stack?.match(/Fetch API cannot load (https:\/\/\S+) due to access control checks\./);
  if (!match) return false;
  const url = new URL(match[1]), token = url.searchParams.get('_rsc');
  return url.origin === base && Boolean(token)
    && error.recentNavigations.some(entry => Math.abs(entry.at - error.at) <= 200)
    && error.recentFailed.some(entry => entry.error === 'cancelled' && Math.abs(entry.at - error.at) <= 100 && new URL(entry.url).origin === base && new URL(entry.url).searchParams.get('_rsc') === token);
}
try {
  await mkdir(output, { recursive: true });
  api = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${apiPort}`);
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/auth/v1/user') { res.end(JSON.stringify(user)); return; }
    if (url.pathname === '/rest/v1/profiles') { res.end(JSON.stringify({ id: owner, display_name: 'Analytics fixture', timezone: 'Asia/Manila', analytics_enabled: accountAllowed, email_reminders_enabled: false })); return; }
    if (url.pathname === '/rest/v1/items') { res.setHeader('Content-Range', '0-0/0'); res.end(req.method === 'HEAD' ? '' : JSON.stringify(url.searchParams.get('select') === 'state' ? { state: 'draft' } : [])); return; }
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const name = url.pathname.split('/').at(-1);
      if (name.startsWith('save_') && failSave) { failSave = false; res.writeHead(503); res.end(JSON.stringify({ message: 'Fixture save interrupted' })); return; }
      res.end(JSON.stringify(name === 'item_detail' ? null : name === 'account_usage' ? {} : { coverage: 'covered' })); return;
    }
    res.writeHead(404); res.end('{}');
  });
  await new Promise(resolve => api.listen(apiPort, 'localhost', resolve));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(temporary, 'key.pem'), '-out', join(temporary, 'cert.pem'), '-days', '1', '-subj', '/CN=localhost'], { stdio: 'ignore' });
  proxy = createHttpsServer({ key: await readFile(join(temporary, 'key.pem')), cert: await readFile(join(temporary, 'cert.pem')) }, (req, res) => {
    const upstream = request({ hostname: 'localhost', port: appPort, path: req.url, method: req.method, headers: { ...req.headers, 'x-forwarded-proto': 'https', 'x-forwarded-host': `localhost:${tlsPort}` } }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res); });
    upstream.on('error', () => { res.writeHead(502); res.end(); }); req.pipe(upstream);
  });
  await new Promise(resolve => proxy.listen(tlsPort, 'localhost', resolve));
  let log = '';
  app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', String(appPort)], { env: { ...process.env, GOOGLE_ANALYTICS_ENABLED: 'true', GOOGLE_ANALYTICS_MEASUREMENT_ID: 'G-TESTKEEPly123'.toUpperCase(), NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${apiPort}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-key', APP_URL: base, ANALYTICS_ENABLED: 'false', PUBLIC_REACTIONS_ENABLED: 'false', PAYMENTS_ENABLED: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [app.stdout, app.stderr]) stream.on('data', chunk => { log = (log + chunk).slice(-5000); });
  for (let attempt = 0; ; attempt++) {
    try { if ((await fetch(`http://localhost:${appPort}/`)).ok) break; } catch {}
    assert(attempt < 80 && app.exitCode === null, 'Local production startup failed: ' + log);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  for (const [engine, width] of [[chromium, 1280], [chromium, 390], [chromium, 320], [webkit, 390]]) {
    console.log(`Checking ${engine.name()} ${width}px`);
    browser = await engine.launch(engine === chromium ? { channel: 'chrome' } : {});
    const context = await browser.newContext({ viewport: { width, height: 900 }, ignoreHTTPSErrors: true, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const failed = [], navigations = [];
    page.on('request', req => { if (req.isNavigationRequest()) navigations.push({ at: Date.now(), url: req.url() }); });
    page.on('requestfailed', req => failed.push({ at: Date.now(), url: req.url(), error: req.failure()?.errorText }));
    page.on('pageerror', error => errors.push({ engine: engine.name(), width, message: error.message, stack: error.stack, url: page.url(), at: Date.now(), recentFailed: failed.slice(-8), recentNavigations: navigations.slice(-3) }));
    let scriptRequests = 0;
    await context.route('https://www.googletagmanager.com/gtag/js?*', async route => { scriptRequests++; await route.fulfill({ contentType: 'application/javascript', body: 'window.__gaFixtureLoaded=true;' }); });
    await context.route('https://*.google-analytics.com/**', route => route.abort());
    const visit = async path => { await page.waitForLoadState('networkidle'); await page.goto(base + path); await page.waitForLoadState('networkidle'); };
    const events = () => page.evaluate(() => (window.dataLayer || []).map(entry => Array.from(entry)).filter(entry => entry[0] === 'event'));
    const count = async name => (await events()).filter(event => event[1] === name).length;
    await visit('/lto-registration-renewal?private=do-not-collect&utm_source=facebook&utm_medium=social#renewal-calculator');
    await page.getByRole('button', { name: 'Allow analytics', exact: true }).waitFor();
    assert.equal(scriptRequests, 0, 'No Google request before consent');
    assert.equal(await count('page_view'), 0);
    await page.getByRole('button', { name: 'Decline analytics', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Analytics choices', exact: true }).count(), 0, 'No floating control after answering');
    await page.reload(); await page.waitForLoadState('networkidle');
    assert.equal(scriptRequests, 0, 'Decline persists over reload');
    assert.equal(await page.locator('#analytics-choices').count(), 0, 'Saved answer keeps the prompt closed');
    assert.equal(await page.getByRole('button', { name: 'Analytics choices', exact: true }).count(), 0, 'Reload does not restore the floating control');
    await visit('/privacy#google-analytics');
    await page.getByRole('status').filter({ hasText: 'Analytics declined in this browser.' }).waitFor();
    await page.getByRole('button', { name: 'Analytics choices', exact: true }).click();
    assert.equal(await page.locator('#analytics-heading').evaluate(node => node === document.activeElement), true, 'Reopened choices receive keyboard focus');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Analytics choices', exact: true }).evaluate(node => node === document.activeElement), true, 'Closing restores focus');
    assert.equal(scriptRequests, 0, 'Closing does not grant consent');
    await page.getByRole('button', { name: 'Analytics choices', exact: true }).click();
    await page.screenshot({ path: `${output}/${engine.name()}-${width}-consent.png` });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Consent layout fits');
    await page.getByRole('button', { name: 'Allow analytics', exact: true }).click();
    await page.waitForFunction(() => window.__gaFixtureLoaded);
    assert.equal(scriptRequests, 1);
    assert.equal(await count('page_view'), 1);
    await page.getByRole('status').filter({ hasText: 'Analytics allowed in this browser.' }).waitFor();
    assert.equal(await page.locator('#analytics-choices').count(), 0, 'Allow closes the prompt');
    assert.notEqual(await page.getByRole('button', { name: 'Analytics choices', exact: true }).evaluate(node => getComputedStyle(node).position), 'fixed', 'Privacy control stays inline');
    await visit('/lto-registration-renewal?private=do-not-collect&utm_source=facebook&utm_medium=social#renewal-calculator');
    await page.waitForFunction(() => window.__gaFixtureLoaded);
    assert.equal(await count('page_view'), 1);
    assert.equal(await page.getByRole('button', { name: 'Analytics choices', exact: true }).count(), 0, 'No floating control after Allow and navigation');
    const view = (await events()).find(event => event[1] === 'page_view')[2];
    assert.equal(view.page_location, base + '/lto-registration-renewal');
    assert.equal(view.campaign_source, 'facebook');
    assert(!JSON.stringify(await events()).includes('do-not-collect'));
    await page.locator('[data-analytics-surface="guide_hero"] a[href="#renewal-calculator"]').click();
    assert.equal(await count('calculator_anchor_click'), 1);
    assert.equal(await count('page_view'), 1, 'Hash changes do not add page views');
    const check = page.getByRole('button', { name: 'Check my renewal schedule', exact: true });
    await check.click();
    assert.equal(await count('check_schedule'), 1);
    assert.equal(await count('calculator_error'), 1);
    assert.equal(await count('calculator_result'), 0);
    await page.locator('#renewal-plate').fill('CCC 2398');
    await page.locator('#renewal-plate').press('Enter');
    assert.equal(await count('check_schedule'), 2, 'Enter submits exactly once');
    assert.equal(await count('calculator_result'), 1);
    assert(!JSON.stringify(await events()).includes('2398'), 'Plate never enters analytics');
    await page.locator('#renewal-calculator a[data-analytics-event="set_reminder_click"]').click();
    await page.waitForURL(url => url.pathname === '/add/car');
    assert.equal(await count('set_reminder_click'), 1, 'Next Link tracked before navigation');
    assert.equal(await count('reminder_saved'), 0, 'Click does not claim a save');
    assert.equal(await page.evaluate(() => window['ga-disable-G-TESTKEEPLY123']), true, 'Private route is off without account preference');
    await visit('/');
    await page.getByRole('link', { name: 'Check my renewal schedule', exact: false }).first().click();
    await page.waitForURL(url => url.pathname === '/lto-registration-renewal');
    assert.equal(await count('calculator_anchor_click'), 1, 'Homepage calculator link tracked');
    await visit('/');
    await page.locator('.hero-actions').getByRole('link', { name: 'Explore a sample account', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/demo');
    assert.equal(await count('sample_account_open'), 1);
    await visit('/demo/add/car?focus=registration&renewalDate=2030-08-22');
    await page.getByLabel('A helpful name').fill('Fictional car');
    await page.getByRole('button', { name: 'Review sample item', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Your sample is ready' }).waitFor();
    assert.equal(await count('reminder_saved'), 0, 'Sample preview never counts as a real save');
    await page.getByRole('link', { name: 'Cancel', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/demo/items');
    await page.waitForLoadState('networkidle');
    assert.equal(await count('reminder_saved'), 0, 'Cancellation never counts as a real save');
    await visit('/demo/settings');
    await page.getByRole('heading', { name: 'Analytics in this browser', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Analytics choices', exact: true }).click();
    await page.evaluate(() => { document.cookie = '_ga=fixture; Path=/'; });
    await page.getByRole('button', { name: 'Decline analytics', exact: true }).click();
    assert.equal(await page.evaluate(() => document.cookie.includes('_ga=')), false, 'Withdrawal clears analytics cookies');
    const before = await events();
    await page.locator('.brand:visible').first().click(); await page.waitForLoadState('networkidle');
    assert.equal((await events()).length, before.length, 'Withdrawal stops events');
    await page.evaluate(() => { localStorage.setItem('keeply.google-analytics-consent.v1', JSON.stringify({ choice: 'granted', at: Date.now() })); dispatchEvent(new StorageEvent('storage', { key: 'keeply.google-analytics-consent.v1', newValue: localStorage.getItem('keeply.google-analytics-consent.v1') })); });
    await page.waitForFunction(() => window['ga-disable-G-TESTKEEPLY123'] === false);
    await page.evaluate(() => { localStorage.setItem('keeply.google-analytics-consent.v1', JSON.stringify({ choice: 'denied', at: Date.now() })); dispatchEvent(new StorageEvent('storage', { key: 'keeply.google-analytics-consent.v1', newValue: localStorage.getItem('keeply.google-analytics-consent.v1') })); });
    await page.waitForFunction(() => window['ga-disable-G-TESTKEEPLY123'] === true);

    if (width === 390) {
      // Real server action flow against an isolated API stand-in, including failure and retry.
      accountAllowed = true;
      const now = Math.floor(Date.now() / 1000);
      const jwt = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: owner, aud: 'authenticated', role: 'authenticated', iat: now, exp: now + 3600 })).toString('base64url'), 'Zml4dHVyZQ'].join('.');
      const session = { access_token: jwt, refresh_token: 'fixture', expires_in: 3600, expires_at: now + 3600, token_type: 'bearer', user };
      await context.addCookies([{ name: 'sb-localhost-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), url: base }]);
      await page.evaluate(() => localStorage.setItem('keeply.google-analytics-consent.v1', JSON.stringify({ choice: 'granted', at: Date.now() })));
      await visit('/settings');
      await page.getByRole('heading', { name: 'Analytics in this browser', exact: true }).waitFor();
      await page.locator('#browser-analytics').screenshot({ path: `${output}/${engine.name()}-${width}-settings.png` });
      await page.getByRole('button', { name: 'Analytics choices', exact: true }).click();
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      assert.equal(await page.locator('#analytics-choices').count(), 0, 'Signed-in Settings can reopen and close without changing consent');
      await visit('/add/car?focus=registration&renewalDate=2030-08-22');
      await page.getByLabel('A helpful name').fill('Private fixture car');
      failSave = true;
      await page.getByRole('button', { name: 'Save item', exact: true }).click();
      await page.getByRole('alert').waitFor();
      assert.equal(await count('reminder_saved'), 0, 'Failed save does not count');
      await page.getByRole('button', { name: 'Save item', exact: true }).click();
      await page.waitForFunction(() => (window.dataLayer || []).some(entry => entry[0] === 'event' && entry[1] === 'reminder_saved'));
      assert.equal(await count('reminder_saved'), 1, 'Successful retry counts once');
      assert(!JSON.stringify(await events()).includes('Private fixture car'));
      await page.waitForURL(url => /^\/items\/[0-9a-f-]+$/.test(url.pathname));
      await page.waitForLoadState('networkidle');
      accountAllowed = false;
    }
    reports.push({ engine: engine.name(), width, checks: 'consent, no floating control after either answer, inline Privacy access, Settings access, close preserves choice and keyboard focus, withdrawal, cross-tab consent, page views, anchor, keyboard submit, validation, result, reminder CTA, sample CTA, private preference gate', successfulSaveFixture: width === 390 });
    for (const path of ['/', '/lto-registration-renewal', '/privacy']) {
      await visit(path);
      const rendered = await page.evaluate(() => ({ title: document.title, canonical: document.querySelector('link[rel="canonical"]')?.href, lang: document.documentElement.lang, locale: document.querySelector('meta[property="og:locale"]')?.content, structured: [...document.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent)) }));
      assert.equal(rendered.lang, 'en-PH'); assert.equal(rendered.locale, 'en_PH'); assert.equal(rendered.canonical, 'https://www.keeplyph.com' + (path === '/' ? '/' : path));
      seo.push({ engine: engine.name(), path, ...rendered });
    }
    if (width === 390) {
      const blocked = await browser.newContext({ viewport: { width, height: 900 }, ignoreHTTPSErrors: true });
      await blocked.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Fixture storage blocked'); } }); });
      await blocked.route('https://www.googletagmanager.com/**', route => route.abort());
      const blockedPage = await blocked.newPage();
      await blockedPage.goto(base + '/lto-registration-renewal');
      await blockedPage.getByRole('button', { name: 'Allow analytics', exact: true }).click();
      await blockedPage.locator('#renewal-plate').fill('98');
      await blockedPage.getByRole('button', { name: 'Check my renewal schedule', exact: true }).click();
      await blockedPage.locator('[aria-live="polite"]').filter({ hasText: 'Standard renewal window' }).waitFor();
      assert.equal(await blockedPage.getByRole('button', { name: 'Analytics choices', exact: true }).count(), 0);
      await blockedPage.getByRole('link', { name: 'Keeply home', exact: true }).click();
      await blockedPage.waitForURL(url => url.pathname === '/');
      await blockedPage.getByRole('link', { name: 'Privacy', exact: true }).click();
      await blockedPage.waitForURL(url => url.pathname === '/privacy');
      await blockedPage.getByRole('button', { name: 'Analytics choices', exact: true }).click();
      await blockedPage.getByRole('button', { name: 'Decline analytics', exact: true }).click();
      await blocked.close();
    }
    await context.close(); await browser.close(); browser = null;
    console.log(`Passed ${engine.name()} ${width}px`);
  }
  const navigationDiagnostics = errors.filter(cancelledLocalPrefetch), unexpectedErrors = errors.filter(error => !cancelledLocalPrefetch(error));
  await writeFile(output + '/validation.json', JSON.stringify({ reports, seo, unexpectedErrors, navigationDiagnostics, limitations: ['Local production with Google command queue and Auth/save stand-ins. No hosted OAuth, database saves, physical-device or Google report receipt verification.', 'WebKit may report cancellation of local self-signed HTTPS RSC prefetches during document replacement. Those narrowly matched diagnostics are preserved separately; this does not establish clean physical Safari behavior.'] }, null, 2));
  assert.equal(unexpectedErrors.length, 0, JSON.stringify(unexpectedErrors));
} finally {
  if (browser) await browser.close();
  if (app) { app.kill(); await new Promise(resolve => { if (app.exitCode !== null) resolve(); else app.once('exit', resolve); }); }
  if (proxy) await new Promise(resolve => proxy.close(resolve));
  if (api) await new Promise(resolve => api.close(resolve));
  await rm(temporary, { recursive: true, force: true });
}
