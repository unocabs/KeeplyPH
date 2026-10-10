// Production-only local checks. Requires a completed build, Chrome, WebKit and OpenSSL.
// The temporary HTTPS proxy preserves the production CSP, including in WebKit.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:https';
import { request } from 'node:http';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';

const playwright = process.env.PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
  : createRequire(import.meta.url)('playwright');
const output = 'artifacts/household-public';
const appPort = 34575, tlsPort = 34576, base = `https://localhost:${tlsPort}`;
const temporary = await mkdtemp(join(tmpdir(), 'keeply-public-'));
const reports = [], seo = [], errors = [], failedRequests = [];
let app, proxy, browser;
await mkdir(output, {recursive:true});
try {
  execFileSync('openssl', ['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(temporary,'key.pem'),'-out',join(temporary,'cert.pem'),'-days','1','-subj','/CN=localhost'], {stdio:'ignore'});
  proxy = createServer({key:await readFile(join(temporary,'key.pem')),cert:await readFile(join(temporary,'cert.pem'))}, (req,res) => {
    const upstream = request({hostname:'localhost',port:appPort,path:req.url,method:req.method,headers:{...req.headers,'x-forwarded-proto':'https','x-forwarded-host':`localhost:${tlsPort}`,'x-forwarded-port':String(tlsPort)}}, response => {res.writeHead(response.statusCode,response.headers);response.pipe(res);});
    upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
  });
  await new Promise((resolve,reject)=>{proxy.once('error',reject);proxy.listen(tlsPort,'localhost',resolve);});
  let serverLog = '';
  app = spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port',String(appPort)], {
    env:{...process.env,APP_URL:base,ANALYTICS_ENABLED:'false',PAYMENTS_ENABLED:'false',EMAIL_DELIVERY_ENABLED:'false',WEB_PUSH_DELIVERY_ENABLED:'false'},stdio:['ignore','pipe','pipe'],
  });
  for (const stream of [app.stdout,app.stderr]) stream.on('data',chunk=>{serverLog=(serverLog+chunk).slice(-4000);});
  let ready = false;
  for(let attempt=0;attempt<60;attempt++) { if(app.exitCode!==null)throw new Error(serverLog);try{ready=(await fetch(`http://localhost:${appPort}/`)).ok;}catch{}if(ready)break;await delay(500); }
  assert(ready,'Production server did not start');

  for (const [engine,width] of [[playwright.chromium,1280],[playwright.chromium,390],[playwright.webkit,390],[playwright.chromium,320]]) {
    browser = await engine.launch(engine.name()==='chromium'?{channel:process.env.PLAYWRIGHT_CHROMIUM_CHANNEL||'chrome'}:{});
    const context=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true,reducedMotion:'reduce'});
    const page=await context.newPage();page.on('pageerror',error=>errors.push({engine:engine.name(),width,url:page.url(),message:error.message,stack:error.stack}));
    page.on('requestfailed',request=>failedRequests.push({engine:engine.name(),width,url:request.url(),error:request.failure()?.errorText}));
    const navigate=async path=>{await page.waitForLoadState('networkidle');const response=await page.goto(base+path);assert.equal(response.status(),200,path);await page.waitForLoadState('networkidle');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path+' overflow');};
    await navigate('/');
    assert.match(await page.locator('h1').innerText(),/Your household,\s*a little more organised\./);
    assert.equal(await page.locator('.hero-actions').getByRole('link',{name:'Start organizing for free',exact:true}).getAttribute('href'),'/add');
    assert.equal(await page.locator('.hero-actions').getByRole('link',{name:'Explore a sample account',exact:true}).getAttribute('href'),'/demo');
    const showcase=page.locator('section').filter({has:page.locator('#example-title')});
    assert.equal(await showcase.locator('article').count(),4);
    const total=await showcase.locator('article').filter({has:page.getByRole('heading',{name:'Plan for payments.'})}).locator('strong').filter({hasText:/^₱/}).innerText();
    const historyCard=showcase.locator('article').filter({has:page.getByRole('heading',{name:'Remember the last service.'})});
    assert.equal(await historyCard.locator('ol li').count(),2);
    const readiness=await showcase.locator('progress').getAttribute('value');
    await page.screenshot({path:`${output}/${engine.name()}-${width}-home.png`,fullPage:true});
    if(width===390)await showcase.screenshot({path:`${output}/${engine.name()}-${width}-showcase.png`});
    // Keyboard navigation opens the real default calendar, rather than a decorative mockup.
    const calendarLink=page.getByRole('link',{name:'Explore the calendar',exact:true});await calendarLink.focus();await page.keyboard.press('Enter');
    await page.locator('#planning-heading').waitFor();await page.waitForLoadState('networkidle');
    assert.equal(await page.getByRole('button',{name:'Calendar',exact:true}).getAttribute('aria-pressed'),'true');
    await page.getByRole('button',{name:'List',exact:true}).click();assert.equal(await page.getByRole('button',{name:'List',exact:true}).getAttribute('aria-pressed'),'true');
    await page.getByRole('button',{name:'Calendar',exact:true}).click();
    assert.equal(await page.locator('progress').getAttribute('value'),readiness);
    const guide=page.locator('section').filter({has:page.locator('#sample-capabilities')});await guide.scrollIntoViewIfNeeded();assert.equal(await guide.locator('div a').count(),6);
    await page.screenshot({path:`${output}/${engine.name()}-${width}-demo.png`,fullPage:true});
    await page.getByRole('link',{name:'Explore Premium',exact:true}).click();await page.getByRole('heading',{name:'Your 30-Day Spending Checkup',exact:true}).waitFor();await page.waitForLoadState('networkidle');
    const checkupTotal=page.locator('section[aria-labelledby="checkup-total-heading"]');assert((await checkupTotal.textContent()).includes(total));assert((await checkupTotal.textContent()).includes('₱4,700 of this total is estimated.'));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`${output}/${engine.name()}-${width}-checkup.png`,fullPage:true});
    await page.getByRole('link',{name:'View contributing expenses',exact:true}).click();await page.waitForURL(url=>url.searchParams.has('week'));
    const checkupExpenses=page.locator('section[aria-labelledby="checkup-expenses"]');assert(await checkupExpenses.locator('ol>li').count()>0);
    await checkupExpenses.getByRole('link',{name:'Show all expenses',exact:true}).click();
    await page.getByRole('link',{name:'Review Vehicles expenses',exact:true}).click();await page.waitForURL(url=>url.searchParams.get('category')==='vehicles');
    assert.equal(await checkupExpenses.locator('ol>li').count(),1);assert((await checkupTotal.textContent()).includes(total));
    await navigate('/demo');
    await guide.getByRole('link',{name:/Payment planning/}).click();await page.waitForURL('**/demo/items/payments');await page.waitForLoadState('networkidle');await page.getByRole('heading',{name:'Payments to plan for',exact:true}).waitFor();
    assert.equal((await page.getByRole('region',{name:'Your Total Household Spending',exact:true}).locator('p').filter({hasText:/^₱.*Known upcoming costs/}).innerText()).split('\n')[0],total);
    // A deep-linked editor can be cancelled without changing the sample amount.
    await page.getByRole('button',{name:'Edit amount',exact:true}).first().click();
    const amount=page.locator('form').filter({has:page.getByLabel('Expected amount (PHP)')});await amount.waitFor();
    await amount.getByRole('button',{name:'Cancel',exact:true}).click();await amount.waitFor({state:'hidden'});
    await navigate('/');await page.getByRole('link',{name:'Open service history',exact:true}).click();await page.locator('#activity-history-heading').waitFor();
    const history=page.locator('section').filter({has:page.locator('#activity-history-heading')});assert.equal(await history.locator('ol>li').count(),2);
    await history.getByRole('button',{name:'Add activity',exact:true}).click();await history.getByRole('button',{name:'Cancel',exact:true}).click();
    await navigate('/demo');await page.getByRole('link',{name:/Search your records/}).click();
    await page.waitForURL('**/demo/items?q=cleaning');await page.waitForLoadState('networkidle');
    await page.getByRole('heading',{name:'Bedroom aircon: next cleaning',exact:true}).waitFor();
    await navigate('/');await page.getByRole('link',{name:'Explore readiness',exact:true}).click();await page.locator('#readiness-summary-heading').waitFor();await page.waitForLoadState('networkidle');
    await page.getByRole('link',{name:'Add useful details',exact:true}).click();await page.waitForURL('**/demo/items?filter=incomplete');await page.waitForLoadState('networkidle');await page.getByRole('heading',{name:'Family car: Toyota Vios',exact:true}).waitFor();
    await navigate('/');await page.getByRole('link',{name:'Open a sample receipt and warranty',exact:true}).click();
    const receipt=page.getByRole('link',{name:'View sample receipt',exact:true});await receipt.waitFor();
    const popupPromise=page.waitForEvent('popup');await receipt.click();const popup=await popupPromise;await popup.waitForLoadState();assert(popup.url().endsWith('/demo/washing-machine-receipt.svg'));await popup.close();
    await navigate('/');const faq=page.locator('details').filter({has:page.getByText('How do I plan for upcoming payments?',{exact:true})});await faq.locator('summary').click();assert(await faq.evaluate(element=>element.open));await faq.locator('summary').click();assert.equal(await faq.evaluate(element=>element.open),false);
    reports.push({engine:engine.name(),width,passed:['no overflow','shared sample figures','calendar default','list toggle','keyboard demo navigation','six capability links','payment cancellation','history cancellation','search','readiness filter','sample receipt opens','FAQ open and close']});
    console.log(`Passed public flows: ${engine.name()} ${width}`);

    if(width===1280) {
      const paths=['/','/pricing','/loan-payment-reminder','/warranty-tracker','/vehicle-registration-reminder','/lto-registration-renewal','/aircon-cleaning-schedule','/document-expiry-tracker','/privacy','/terms','/demo','/demo/items/payments','/demo/planner?days=365','/demo/checkup','/items/payments','/planner','/checkup'];
      for(const path of paths) {
        await navigate(path);
        const result=await page.evaluate(()=>({path:location.pathname,lang:document.documentElement.lang,title:document.title,description:document.querySelector('meta[name="description"]')?.content,canonical:document.querySelector('link[rel="canonical"]')?.href,robots:document.querySelector('meta[name="robots"]')?.content,locale:document.querySelector('meta[property="og:locale"]')?.content,schemas:[...document.querySelectorAll('script[type="application/ld+json"]')].map(script=>JSON.parse(script.textContent))}));
        assert.equal(result.lang,'en-PH');assert.equal(result.locale,'en_PH');assert(result.title&&result.description);
        if(path.startsWith('/demo')||['/items/payments','/planner','/checkup'].includes(path))assert.match(result.robots,/noindex.*nofollow/);
        else {assert.equal(result.canonical.replace(/\/$/,''),'https://www.keeplyph.com'+(path==='/'?'':path));assert(!result.robots?.includes('noindex'));}
        if(['/items/payments','/planner','/checkup'].includes(path))assert.equal(result.path,'/login');
        if(path==='/') {const graph=result.schemas[0]['@graph'];assert.equal(graph[0]['@type'],'WebSite');const application=graph.find(node=>node['@type']==='WebApplication');assert.equal(application.name,'Keeply');assert.equal(application.inLanguage,'en-PH');assert(application.featureList.some(feature=>feature.includes('Premium')));}
        seo.push({requested:path,...result});
      }
      const sitemap=await (await context.request.get(base+'/sitemap.xml')).text();
      const locations=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>match[1]);assert.equal(locations.length,10);assert(locations.every(url=>!url.includes('/demo')&&!url.includes('/items')&&!url.includes('/dashboard')));
      const robots=await(await context.request.get(base+'/robots.txt')).text();assert(robots.includes('Sitemap: https://www.keeplyph.com/sitemap.xml'));
      await writeFile(output+'/seo-checks.json',JSON.stringify({environment:'Local production over HTTPS',pages:seo,sitemap:locations,robots,structuredDataValidation:'JSON parsed; required WebSite and WebApplication fields checked locally. No external rich-result certification.'},null,2));
    }
    await context.close();await browser.close();browser=null;
  }
  await writeFile(output+'/browser-checks.json',JSON.stringify({environment:'Local production over HTTPS with test-only certificate trust',reports,errors,failedRequests,limitations:['Simulated browser sizes, not physical devices','No hosted OAuth, Storage, payment or alert delivery verification']},null,2));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:reports.map(report=>`${report.engine} ${report.width}`),seoPages:seo.length,output},null,2));
  if(process.env.PUBLIC_TEST_HOLD==='true') {console.log('HTTPS server ready for Lighthouse on '+base);await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});}
} finally {
  if(browser)await browser.close();
  if(proxy)await new Promise(resolve=>{proxy.close(resolve);proxy.closeAllConnections();});
  if(app) {app.kill('SIGTERM');await new Promise(resolve=>{if(app.exitCode!==null)resolve();else app.once('exit',resolve);});}
  await rm(temporary,{recursive:true,force:true});
}
