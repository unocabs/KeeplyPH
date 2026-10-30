// Local production checks with isolated Auth and save responses. No hosted writes.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer, request } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const { chromium, webkit } = process.env.PLAYWRIGHT_MODULE ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href) : createRequire(import.meta.url)('playwright');
const output = 'artifacts/aircon-guide', appPort = 34721, tlsPort = 34722, apiPort = 34723, base = `https://localhost:${tlsPort}`;
const temporary = await mkdtemp(join(tmpdir(), 'keeply-aircon-'));
const reports = [], errors = [], saves = [], drafts = [], oauth = [], seo = [], diagnostics = [];
let activePage;
let app, proxy, api, browser, failSave = false, oauthMode = 'success';
const owner = '11111111-1111-4111-8111-111111111111';
const user = { id: owner, aud: 'authenticated', role: 'authenticated', email: 'aircon@example.test', user_metadata: { full_name: 'Aircon fixture' }, app_metadata: { provider: 'google' } };
function session() {
  const now = Math.floor(Date.now() / 1000);
  const access_token = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: owner, aud: 'authenticated', role: 'authenticated', iat: now, exp: now + 3600 })).toString('base64url'), 'Zml4dHVyZQ'].join('.');
  return { access_token, refresh_token: 'fixture', expires_in: 3600, expires_at: now + 3600, token_type: 'bearer', user };
}
try {
  await mkdir(output, { recursive: true });
  api = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${apiPort}`);
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/auth/v1/authorize') {
      const target = new URL(url.searchParams.get('redirect_to'));
      oauth.push({ next: target.searchParams.get('next'), mode: oauthMode });
      if (oauthMode === 'cancel') target.searchParams.set('error', 'access_denied'); else target.searchParams.set('code', 'local-fixture-code');
      res.writeHead(302, { Location: target.href }); res.end(); return;
    }
    if (url.pathname === '/auth/v1/token') {
      if (oauthMode === 'token-error') { res.writeHead(400); res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Local exchange error' })); }
      else res.end(JSON.stringify(session()));
      return;
    }
    if (url.pathname === '/auth/v1/user') { res.end(JSON.stringify(user)); return; }
    if (url.pathname === '/rest/v1/profiles') { res.end(JSON.stringify({ id: owner, display_name: 'Aircon fixture', timezone: 'Asia/Manila', analytics_enabled: false, email_reminders_enabled: false, deletion_requested_at: null })); return; }
    if (url.pathname === '/rest/v1/items') { res.setHeader('Content-Range', '0-0/0'); res.end(req.method === 'HEAD' ? '' : JSON.stringify(url.searchParams.get('select') === 'state' ? { state: 'draft' } : [])); return; }
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const data = raw ? JSON.parse(raw) : {}, name = url.pathname.split('/').at(-1);
      if (name === 'create_item_draft') drafts.push(data);
      if (name.startsWith('save_')) {
        if (failSave) { failSave = false; res.writeHead(503); res.end(JSON.stringify({ message: 'Local save interrupted' })); return; }
        saves.push({ name, ...data });
      }
      res.end(JSON.stringify(name === 'item_detail' ? null : name === 'list_items' ? [] : name === 'account_usage' ? {} : { coverage: 'covered' })); return;
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
  app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', String(appPort)], { env: { ...process.env, GOOGLE_ANALYTICS_ENABLED: 'false', NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${apiPort}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-key', APP_URL: base, ANALYTICS_ENABLED: 'false', PUBLIC_REACTIONS_ENABLED: 'false', PAYMENTS_ENABLED: 'false', EMAIL_DELIVERY_ENABLED: 'false', WEB_PUSH_DELIVERY_ENABLED: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [app.stdout, app.stderr]) stream.on('data', chunk => { log = (log + chunk).slice(-5000); });
  for (let attempt = 0; ; attempt++) {
    try { if ((await fetch(`http://localhost:${appPort}/aircon-cleaning-schedule`)).ok) break; } catch {}
    assert(attempt < 80 && app.exitCode === null, 'Local startup failed: ' + log);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  for (const [engine, width] of [[chromium, 1280], [chromium, 768], [chromium, 390], [chromium, 320], [webkit, 390], [webkit, 320]]) {
    if (process.env.AIRCON_TEST_CASES && !process.env.AIRCON_TEST_CASES.split(',').includes(engine.name() + '-' + width)) continue;
    console.log(`Checking ${engine.name()} ${width}px`);
    const draftsAtStart = drafts.length;
    browser = await engine.launch(engine === chromium ? { channel: 'chrome' } : {});
    const context = await browser.newContext({ viewport: { width, height: 900 }, ignoreHTTPSErrors: true, reducedMotion: 'reduce' });
    const page = await context.newPage(); activePage = page;
    page.on('dialog', async dialog => { console.log('Dialog: ' + dialog.type()); await dialog.accept(); });
    page.on('pageerror', error => {
      const entry = { engine: engine.name(), width, message: error.message, stack: error.stack, url: page.url() };
      if (engine === webkit && /Fetch API cannot load https:\/\/localhost:34722\/.*\?_rsc=\S+ due to access control checks/.test(error.message)) diagnostics.push(entry); else errors.push(entry);
    });
    const visit = async path => { await page.waitForLoadState('networkidle'); await page.goto(base + path); await page.waitForLoadState('networkidle'); };
    const fits = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Page overflow: ${page.url()}`);
    await visit('/aircon-cleaning-schedule');
    await fits();
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('#keep-a-record .reminder-icon').count(), 1);
    assert.equal(await page.locator('img').filter({ hasNot: page.locator('svg') }).count() > 0, true);
    assert(await page.locator('img[alt^="A white wall"]').evaluate(img => img.complete && img.naturalWidth > 0));
    const meta = await page.evaluate(() => ({ title: document.title, description: document.querySelector('meta[name="description"]')?.content, canonical: document.querySelector('link[rel="canonical"]')?.href, lang: document.documentElement.lang, locale: document.querySelector('meta[property="og:locale"]')?.content, robots: document.querySelector('meta[name="robots"]')?.content, structured: [...document.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent)) }));
    assert.equal(meta.canonical, 'https://www.keeplyph.com/aircon-cleaning-schedule'); assert.equal(meta.lang, 'en-PH'); assert.equal(meta.locale, 'en_PH'); assert(!meta.robots?.includes('noindex'));
    const graph = meta.structured[0]['@graph'];
    assert.equal(graph[0]['@type'], 'Article'); assert.equal(graph[0].datePublished, '2026-10-04'); assert.equal(graph[0].dateModified, '2026-10-29'); assert.equal(graph[1]['@type'], 'BreadcrumbList'); assert.equal(graph[1].itemListElement[1].item, meta.canonical);
    seo.push({ engine: engine.name(), width, ...meta });
    if (width <= 760) {
      const planner = await page.locator('#cleaning-planner').boundingBox(), photo = await page.locator('figure').boundingBox();
      assert(planner.y < photo.y, 'Mobile planner precedes photo');
      assert.equal(await page.locator('#cost tbody tr').count(), 2);
    }
    await page.screenshot({ path: `${output}/${engine.name()}-${width}-hero.png` });
    await page.screenshot({ path: `${output}/${engine.name()}-${width}-page.png`, fullPage: true });
    const calculate = page.getByRole('button', { name: 'Calculate my next clean', exact: true });
    const save = page.getByRole('link', { name: 'Save this plan in Keeply', exact: true });
    assert.equal(await save.count(), 0);
    await calculate.click(); await page.locator('#last-error').waitFor(); assert.equal(await page.locator('#last-cleaned').getAttribute('aria-invalid'), 'true');
    await page.locator('#last-cleaned').fill('2026-10-29'); await calculate.click(); await page.locator('#interval-error').waitFor();
    await page.locator('#cleaning-interval').selectOption('4'); await page.locator('#cleaning-interval').press('Enter');
    // Native select Enter behaviour differs by browser. Submit the form explicitly.
    if (!await save.count()) await calculate.click();
    await page.getByText('February 28, 2027', { exact: true }).waitFor();
    const intent = '/add/aircon?serviceDate=2027-02-28&serviceInterval=4';
    assert.equal(await save.getAttribute('href'), intent);
    await page.locator('#cleaning-planner').screenshot({ path: `${output}/${engine.name()}-${width}-planner.png` });
    await page.locator('#cleaning-interval').selectOption('6'); assert.equal(await save.count(), 0, 'Editing clears stale result');
    await page.locator('#cleaning-interval').selectOption('custom'); await page.locator('#custom-interval').fill('3.5'); await calculate.click(); await page.locator('#interval-error').waitFor();
    await page.locator('#custom-interval').fill('120'); await page.locator('#last-cleaned').fill('2027-01-01'); await calculate.click(); await page.locator('#last-error').waitFor();
    await page.locator('#last-cleaned').fill('2023-10-31'); await page.locator('#custom-interval').fill('4'); await calculate.click();
    await page.getByText('February 29, 2024', { exact: true }).waitFor(); await page.getByText('This planned date has passed.', { exact: false }).waitFor();
    await page.getByLabel('I don’t know the last cleaning date').check(); await page.getByRole('heading', { name: 'Start with the service history.', exact: true }).waitFor(); assert.equal(await save.count(), 0);
    await page.getByLabel('I don’t know the last cleaning date').uncheck();
    await page.locator('#last-cleaned').fill('2026-10-29'); await page.locator('#cleaning-interval').selectOption('4'); await calculate.click();
    await save.click(); await page.waitForURL(url => url.pathname === '/add/aircon');
    const link = page.getByRole('link', { name: 'Continue with Google', exact: false });
    const login = await link.getAttribute('href'); assert.equal(new URL(login, base).searchParams.get('next'), intent);
    await link.click(); await page.waitForURL(url => url.pathname === '/login');
    assert.equal(await page.locator('input[name="next"]').inputValue(), intent);
    assert.equal(drafts.length, draftsAtStart, 'No draft before submitting item');
    if (width === 390) {
      // Local OAuth cancellation, token error and success exercise real callback/cookie logic.
      for (const mode of ['cancel', 'token-error', 'success']) {
        oauthMode = mode;
        await page.waitForLoadState('networkidle');
        console.log('OAuth mode ' + mode + ' at ' + page.url());
        await page.screenshot({ path: `${output}/${engine.name()}-${width}-auth-${mode}.png` });
        const landed = page.waitForResponse(response => { const url = new URL(response.url()); return response.request().isNavigationRequest() && url.pathname === (mode === 'success' ? '/add/aircon' : '/login') && (mode === 'success' || url.searchParams.get('error') === 'callback'); });
        await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
        await landed; await page.waitForLoadState('networkidle');
        if (mode === 'success') await page.waitForURL(url => url.pathname === '/add/aircon');
        else {
          await page.waitForURL(url => url.pathname === '/login' && url.searchParams.get('error') === 'callback');
          assert.equal(await page.locator('input[name="next"]').inputValue(), intent);
        }
      }
      await page.getByLabel('A helpful name').fill('Fixture bedroom aircon');
      assert.equal(await page.getByLabel('Next service date', { exact: true }).inputValue(), '2027-02-28');
      await page.getByText('Calculate from the last service', { exact: true }).click();
      assert.equal(await page.getByLabel('Service interval (months)', { exact: true }).inputValue(), '4');
      assert.equal(await page.getByLabel('Last completed', { exact: true }).inputValue(), '');
      assert.equal(await page.getByLabel('Recurring service', { exact: false }).inputValue(), '');
      assert.equal(await page.getByLabel('Send me alerts for this date', { exact: false }).isChecked(), false);
      // Cancel does not write anything. Retry using the same planned values afterwards.
      const writesBefore = drafts.length;
      await page.getByRole('link', { name: 'Cancel', exact: true }).click(); await page.waitForURL(url => url.pathname === '/items'); assert.equal(drafts.length, writesBefore);
      await visit(intent); await page.getByLabel('A helpful name').fill('Fixture bedroom aircon');
      failSave = true; const savedBefore = saves.length;
      await page.getByRole('button', { name: 'Save item', exact: true }).click(); await page.getByRole('alert').waitFor();
      assert.equal(saves.length, savedBefore); assert.equal(await page.getByLabel('Next service date', { exact: true }).inputValue(), '2027-02-28');
      await page.getByRole('button', { name: 'Save item', exact: true }).click(); await page.waitForURL(url => /^\/items\/[0-9a-f-]+$/.test(url.pathname));
      assert.equal(saves.length, savedBefore + 1);
      const saved = saves.at(-1); assert.equal(saved.p_date.due_on, '2027-02-28'); assert.equal(saved.p_date.interval_months, 4); assert.equal(saved.p_date.reminders_enabled, false); assert.equal(saved.p_date.recurrence_months, null); assert(!saved.p_date.last_completed_on);
      assert.equal(drafts.at(-1).p_id, drafts.at(-2).p_id, 'Save retry reuses item identity');
      await context.clearCookies();
    }
    await visit('/demo' + intent); await page.getByLabel('A helpful name').fill('Sample bedroom aircon');
    assert.equal(await page.getByLabel('Next service date', { exact: true }).inputValue(), '2027-02-28');
    await page.getByRole('button', { name: 'Review sample item', exact: true }).click(); await page.getByRole('status').filter({ hasText: 'Your sample is ready' }).waitFor();
    const sampleSignIn = await page.getByRole('link', { name: 'Sign in to keep your own', exact: false }).getAttribute('href'); assert.equal(new URL(sampleSignIn, base).searchParams.get('next'), intent);
    await visit('/aircon-cleaning-schedule');
    for (const summary of await page.locator('#questions summary').all()) { await summary.focus(); await page.keyboard.press('Enter'); assert(await summary.evaluate(node => node.parentElement.open)); await page.keyboard.press('Enter'); }
    for (const anchor of await page.locator('main a[href^="#"]').all()) { const hash = await anchor.getAttribute('href'); assert(await page.locator(hash).count(), 'Anchor target exists: ' + hash); }
    if (width === 320) { await page.addStyleTag({ content: 'html{font-size:200%} p,li,label,summary,a,button,input,select,dt,dd{font-size:1.25rem!important}' }); await fits(); await page.screenshot({ path: `${output}/${engine.name()}-${width}-large-text.png`, fullPage: true }); }
    reports.push({ engine: engine.name(), width, checks: 'layout, source links, identity, date errors, interval errors, month ends, past plan, unknown history, stale results, sign-in intent, sample review/cancel, keyboard FAQ, SEO', localOAuthAndSave: width === 390 });
    await context.close(); await browser.close(); browser = null;
    console.log(`Passed ${engine.name()} ${width}px`);
  }
  browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
  const page = await context.newPage(); await page.goto(base + '/aircon-cleaning-schedule'); assert(await page.locator('noscript p').innerText()); assert(await page.locator('#cost').isVisible()); assert.equal(await page.getByRole('button', { name: 'Calculate my next clean', exact: true }).isVisible(), false); await context.close();
  await browser.close(); browser = null;
  const sitemap = await (await fetch(`http://localhost:${appPort}/sitemap.xml`)).text(); assert(sitemap.includes('https://www.keeplyph.com/aircon-cleaning-schedule')); assert.equal((sitemap.match(/<loc>/g) || []).length, 11);
  await writeFile(output + '/validation.json', JSON.stringify({ reports, seo, oauth, saves, errors, diagnostics, limitations: ['Local production using isolated OAuth/Auth and save fixtures. Hosted Google/Supabase, physical devices and household usability studies were not exercised.'] }, null, 2));
  assert.equal(errors.length, 0, JSON.stringify(errors));
} catch (error) {
  if (activePage && !activePage.isClosed()) { await activePage.screenshot({ path: output + '/failure.png', fullPage: true }); console.error('At ' + activePage.url()); console.error('Overflow: ' + JSON.stringify(await activePage.evaluate(() => ({viewport:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,nodes:[...document.querySelectorAll('body *')].filter(node => { const r=node.getBoundingClientRect(); return r.right > innerWidth + 1 || node.scrollWidth > Math.max(node.clientWidth,innerWidth); }).slice(0,20).map(node => ({tag:node.tagName,class:node.className,text:node.textContent.slice(0,60),width:node.getBoundingClientRect().width,right:node.getBoundingClientRect().right,scroll:node.scrollWidth}))})))); }
  console.error(JSON.stringify({ oauth, errors, diagnostics, saves }, null, 2));
  throw error;
} finally {
  if (browser) await browser.close();
  if (app) { app.kill(); await new Promise(resolve => { if (app.exitCode !== null) resolve(); else app.once('exit', resolve); }); }
  if (proxy) await new Promise(resolve => proxy.close(resolve));
  if (api) await new Promise(resolve => api.close(resolve));
  await rm(temporary, { recursive: true, force: true });
}
