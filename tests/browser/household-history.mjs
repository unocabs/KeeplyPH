// Real application/server actions and isolated PostgreSQL, with local Auth/REST stand-ins.
// This does not verify hosted Supabase, Google OAuth, Storage uploads or physical devices.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function testHouseholdBrowser({ admin, actor, user }) {
  const playwrightModule = process.env.PLAYWRIGHT_MODULE;
  const playwright = playwrightModule ? await import(pathToFileURL(playwrightModule).href) : createRequire(import.meta.url)('playwright');
  const output = 'artifacts/household-history'; await mkdir(output, { recursive: true });
  const apiPort = 34571, appPort = 34572, base = `http://localhost:${appPort}`;
  const owners = new Map(), errors = [], reports = [];
  const rpcNames = new Set(['account_usage','item_detail','date_history','reminder_preview','item_activity_history','complete_occurrence','save_item_activity','void_item_activity','skip_unconfirmed_occurrence','activity_corrections','dashboard_timeline_items','unconfirmed_occurrence_summary','list_items','item_coverage','create_item_draft','save_item_with_date','save_utility_item_with_date','save_motorcycle_item_with_date','save_subscription_item_with_date','save_loan_item_with_date','save_insurance_item_with_date','create_purchase_draft','save_purchase','save_important_date','household_insights','household_payment_plan','set_readiness_preference','set_occurrence_amount']);
  let failNextSave = false;
  const api = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${apiPort}`);
    res.setHeader('Content-Type', 'application/json');
    try {
      const bearer = req.headers.authorization?.split(' ')[1];
      const owner = bearer?.includes('.') ? JSON.parse(Buffer.from(bearer.split('.')[1], 'base64url').toString()).sub : null;
      if (!owner || !owners.has(owner)) { res.writeHead(401); res.end(JSON.stringify({ message: 'Local test session required' })); return; }
      if (url.pathname === '/auth/v1/user') { res.end(JSON.stringify(owners.get(owner))); return; }
      if (url.pathname.startsWith('/rest/v1/rpc/')) {
        const name = url.pathname.split('/').at(-1); if (!rpcNames.has(name)) throw new Error('Unsupported test RPC');
        let body = ''; for await (const chunk of req) body += chunk;
        const args = JSON.parse(body || '{}'), keys = Object.keys(args);
        if (!keys.every(key => /^p_[a-z_]+$/.test(key))) throw new Error('Invalid RPC arguments');
        if (failNextSave && ['save_item_activity','save_utility_item_with_date','set_readiness_preference','set_occurrence_amount'].includes(name)) { failNextSave = false; res.writeHead(503); res.end(JSON.stringify({ message: 'Test connection interruption' })); return; }
        const result = await actor(owner, `select public.${name}(${keys.map((key, i) => `${key}=>$${i+1}`).join(',')}) as value`, Object.values(args));
        res.end(JSON.stringify(result.rows[0].value)); return;
      }
      const table = url.pathname.split('/').at(-1);
      if (!['profiles','items','date_occurrences'].includes(table)) throw new Error('Unsupported test table');
      const entries = [...url.searchParams].filter(([key]) => ['id','user_id','state','archived_at','template_key'].includes(key));
      const values = [], clauses = entries.map(([key, value]) => {
        if (value === 'is.null') return `${key} is null`;
        if (!value.startsWith('eq.')) throw new Error('Unsupported test filter');
        values.push(value.slice(3)); return `${key}=$${values.length}`;
      });
      // Preserve PostgreSQL date JSON, rather than converting dates through the host timezone.
      const result = await actor(owner, `select to_jsonb(t) as payload from public.${table} t${clauses.length ? ' where ' + clauses.join(' and ') : ''}`, values);
      const rows=result.rows.map(row=>row.payload);
      res.setHeader('Content-Range', `0-${Math.max(0,result.rows.length-1)}/${result.rows.length}`);
      if(req.method === 'HEAD') { res.end(); return; }
      res.end(JSON.stringify(req.headers.accept?.includes('vnd.pgrst.object') ? rows[0] || null : rows));
    } catch (error) { res.writeHead(400); res.end(JSON.stringify({ message:error.message,code:error.code || 'P0001' })); }
  });
  await new Promise(resolve => api.listen(apiPort, 'localhost', resolve));
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--port',String(appPort)], {
    cwd:process.cwd(),env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:`http://localhost:${apiPort}`,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'local-test-key',SUPABASE_SECRET_KEY:'local-test-key',SUPABASE_SERVICE_ROLE_KEY:'local-test-key',APP_URL:base,PAYMENTS_ENABLED:'false',EMAIL_DELIVERY_ENABLED:'false',WEB_PUSH_DELIVERY_ENABLED:'false'},stdio:['ignore','pipe','pipe'],
  });
  let serverLog = ''; server.stdout.on('data', chunk => { serverLog += chunk; }); server.stderr.on('data', chunk => { serverLog += chunk; });
  let browser;
  try {
    for(let attempt=0;attempt<120;attempt++) {
      try { if((await fetch(base + '/demo')).ok) break; } catch {}
      if(server.exitCode !== null) throw new Error('Local app exited: ' + serverLog.slice(-1500));
      await new Promise(resolve => setTimeout(resolve, 250));
      if(attempt===119) throw new Error('Local app failed to start');
    }
    for(const [engine,width] of [[playwright.chromium,1280],[playwright.chromium,390],[playwright.webkit,390]]) {
      browser = await engine.launch(engine.name() === 'chromium' ? {channel:process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || 'chrome'} : {});
      const context = await browser.newContext({viewport:{width,height:900}});
      const owner=await user(), item=randomUUID(), now=Math.floor(Date.now()/1000);
      const testUser={id:owner,aud:'authenticated',role:'authenticated',email:'household-test@example.test',email_confirmed_at:new Date().toISOString(),user_metadata:{full_name:'Test household'},app_metadata:{provider:'google'}};
      owners.set(owner,testUser);
      await actor(owner,"select public.create_item_draft($1,'aircon')",[item]);
      const today=(await admin.query("select (now() at time zone 'Asia/Manila')::date::text as t")).rows[0].t;
      await actor(owner,'select public.save_item_with_date($1,1,$2,$3,$4)',[item,'Bedroom aircon','',{kind:'service',label:'Aircon cleaning',due_on:today,reminders_enabled:false,offsets:[],interval_months:3}]);
      const jwt=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:owner,aud:'authenticated',role:'authenticated',iat:now,exp:now+3600,iss:`http://localhost:${apiPort}/auth/v1`,session_id:randomUUID()})).toString('base64url'),'bG9jYWwtdGVzdA'].join('.');
      const session={access_token:jwt,refresh_token:'local-test',expires_in:3600,expires_at:now+3600,token_type:'bearer',user:testUser};
      await context.addCookies([{name:'sb-localhost-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),domain:'localhost',path:'/',httpOnly:false,sameSite:'Lax'}]);
      const page=await context.newPage(); page.setDefaultTimeout(10000); page.on('pageerror',error=>errors.push({message:error.message,stack:error.stack,url:page.url(),engine:engine.name(),width}));
      await page.goto(`${base}/items/${item}`); await page.getByRole('heading',{name:'Bedroom aircon',exact:true}).waitFor();
      const history=page.locator('section[aria-labelledby="activity-history-heading"]');
      await history.getByRole('button',{name:'Add activity',exact:true}).click();
      await history.getByLabel('What happened?').fill('Canceled entry');
      await history.getByRole('button',{name:'Cancel',exact:true}).click();
      assert.equal((await admin.query('select count(*)::int as n from public.item_activities where item_id=$1',[item])).rows[0].n,0);
      await page.getByRole('button',{name:'Mark service done',exact:true}).click();
      const completion=page.locator('form').filter({has:page.getByRole('heading',{name:'Record completion',exact:true})});
      await completion.getByLabel('Cost').fill('600');
      await completion.getByLabel('Notes').fill('Filter cleaning completed');
      await completion.getByLabel('Next date',{exact:true}).selectOption('from_completion');
      await completion.getByRole('button',{name:'Save activity',exact:true}).click();
      await history.getByText('Filter cleaning completed',{exact:true}).waitFor();
      const activity=(await admin.query('select * from public.item_activities where item_id=$1',[item])).rows[0]; assert.equal(Number(activity.amount_minor),60000);
      await history.getByRole('button',{name:'Correct',exact:true}).click();
      await history.getByLabel('Cost').fill('650'); await history.getByLabel('Reason for correction').fill('Correct receipt amount');
      await history.getByRole('button',{name:'Save correction',exact:true}).click();
      await history.getByText('Corrected entry. Previous versions are retained.').waitFor();
      await history.getByText('Correction history',{exact:true}).click(); await history.getByText('Correct receipt amount',{exact:true}).waitFor();
      await history.getByRole('button',{name:'Remove recorded activity',exact:true}).click();
      await history.getByLabel('Reason',{exact:true}).fill('Canceled removal'); await history.getByRole('button',{name:'Cancel',exact:true}).click();
      assert.equal((await admin.query('select voided_at from public.item_activities where id=$1',[activity.id])).rows[0].voided_at,null);
      await history.getByRole('button',{name:'Remove recorded activity',exact:true}).click();
      await history.getByLabel('Reason',{exact:true}).fill('Recorded against the wrong occurrence');
      await history.locator('form').getByRole('button',{name:'Remove recorded activity',exact:true}).click();
      await page.getByRole('heading',{name:'Past occurrences to review'}).waitFor();
      await page.getByRole('button',{name:'Mark as skipped',exact:true}).click();
      await page.getByLabel('Reason for skipping').fill('Service was canceled'); await page.getByRole('button',{name:'Confirm skipped',exact:true}).click();
      await page.getByRole('heading',{name:'Past occurrences to review'}).waitFor({state:'hidden'});
      await page.locator('details').filter({has:page.locator('summary').filter({hasText:/^History \(/})}).locator('summary').click();
      await page.getByRole('button',{name:'Reopen for review',exact:true}).click(); await page.getByLabel('Reason for reopening').fill('Service did happen');
      await page.getByRole('button',{name:'Confirm reopened',exact:true}).click(); await page.getByRole('heading',{name:'Past occurrences to review'}).waitFor();
      await page.getByRole('button',{name:'Record completion',exact:true}).click(); await page.locator('form').filter({has:page.getByRole('heading',{name:'Record completion'})}).getByRole('button',{name:'Save activity',exact:true}).click();
      await history.getByRole('button',{name:'Correct',exact:true}).waitFor();
      // Exercise a real failed server action followed by retry with preserved fields.
      await history.getByRole('button',{name:'Add activity',exact:true}).click(); await history.getByLabel('What happened?').fill('Independent repair');
      await history.getByLabel('Activity type').selectOption('repair');
      await history.getByLabel('Cost').fill('invalid'); await history.getByRole('button',{name:'Save activity',exact:true}).click();
      await history.getByRole('alert').waitFor(); await history.getByLabel('Cost').fill('0'); failNextSave=true;
      await history.getByRole('button',{name:'Save activity',exact:true}).click(); await history.getByRole('alert').waitFor();
      assert.equal(await history.getByLabel('What happened?').inputValue(),'Independent repair');
      await history.getByRole('button',{name:'Save activity',exact:true}).click(); await history.getByRole('heading',{name:'Independent repair',exact:true}).waitFor();
      await page.screenshot({path:`${output}/${engine.name()}-${width}.png`,fullPage:true});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      assert.equal((await admin.query('select count(*)::int as n from public.item_activities where item_id=$1',[item])).rows[0].n,2);
      // Review a cycle older than the initial 20-cycle detail window, then cancel.
      const bill=randomUUID();await actor(owner,"select public.create_item_draft($1,'other')",[bill]);
      await actor(owner,'select public.save_item_with_date($1,1,$2,$3,$4,$5)',[bill,'Older electricity bill','',{kind:'other',label:'Monthly payment',due_on:'2020-01-01',reminders_enabled:false,offsets:[],interval_months:null,recurrence_months:1,recurrence_ends_on:null},'electric-bill']);
      await actor(null,'select public.advance_recurring_dates()',[],'service_role');
      await page.goto(base+'/dashboard');await page.getByRole('heading',{name:'Occurrences to review',exact:true}).waitFor();
      await page.getByRole('link',{name:'Review all occurrences'}).click();await page.getByRole('heading',{name:'Occurrences to review',exact:true}).waitFor();
      await page.getByRole('link',{name:'Review',exact:true}).first().click();await page.getByRole('heading',{name:'Record completion',exact:true}).waitFor();
      await page.locator('form').filter({has:page.getByRole('heading',{name:'Record completion'})}).getByRole('button',{name:'Cancel',exact:true}).click();
      await page.getByText('Scheduled January 1, 2020',{exact:true}).waitFor();
      await page.locator('details').filter({has:page.locator('summary').filter({hasText:/^History \(/})}).locator('summary').click();
      await page.getByRole('button',{name:'Load older history',exact:true}).click();
      await page.getByText(/History \(40 cycles\)/).waitFor();
      await testCoreExperience({page,base,owner,actor,admin,today,engine,width,failSave:()=>{failNextSave=true;}});
      await testInsightsExperience({page,base,owner,actor,admin,today,engine,width,failSave:()=>{failNextSave=true;}});
      reports.push({engine:engine.name(),width,passed:['completion','actual cost','service next date','correction','audit history','cancel','void','skip','reopen','late completion','validation','server failure','retry','no overflow','account-wide review','historical deep link','cycle pagination','attention first','single planning view','demo review','demo history','demo creation','name-first save','add date later','provider persistence','form cancellation','creation failure retry','existing vehicle','purchase save','compact schedule and amount','collapsed validation reveal','readiness preferences','readiness cancellation and retry','occurrence amount confirmation','amount cancellation and retry','account-wide insights','expanded search','demo insights']});
      await context.close(); await browser.close(); browser=null;
    }
    assert.deepEqual(errors,[]);
    for(const path of ['/', '/demo', '/items']) {
      const response=await fetch(base+path,{redirect:'manual'}),html=await response.text();
      if(path==='/') { assert(html.includes('lang="en-PH"'));assert(html.includes('https://www.keeplyph.com'));assert(html.includes('application/ld+json')); }
      if(path==='/demo')assert(html.includes('noindex'));
      if(path==='/items')assert([303,307,308].includes(response.status));
    }
    const smoke=spawn(process.execPath,['scripts/smoke.mjs'],{cwd:process.cwd(),env:{...process.env,SMOKE_URL:base},stdio:['ignore','pipe','pipe']});
    let smokeLog='';smoke.stdout.on('data',chunk=>{smokeLog+=chunk;});smoke.stderr.on('data',chunk=>{smokeLog+=chunk;});
    const smokeCode=await new Promise(resolve=>smoke.once('exit',resolve));
    assert.equal(smokeCode,0,smokeLog);console.log('✓ Existing HTTP smoke checks and rendered public/private indexing checks passed');
    await writeFile(`${output}/browser-checks.json`,JSON.stringify({reports,errors,limitations:['Local Auth and REST stand-ins; real server actions and isolated PostgreSQL','No hosted provider or physical-device verification']},null,2));
    console.log('✓ Household history browser flows passed in Chromium desktop/mobile and WebKit mobile');
  } finally {
    if(browser)await browser.close();
    server.kill('SIGTERM'); await new Promise(resolve=>server.once('exit',resolve));
    await new Promise(resolve=>api.close(resolve));
  }
}

async function testCoreExperience({page,base,owner,actor,admin,today,engine,width,failSave}) {
  await mkdir('artifacts/household-core',{recursive:true});
  await page.goto(base+'/demo');
  const attention=page.locator('section[aria-labelledby="attention-heading"]'),planning=page.locator('section[aria-labelledby="planning-heading"]'),records=page.locator('section[aria-labelledby="all-reminders-heading"]');
  await planning.getByRole('heading',{name:'Your next 30 days'}).waitFor();
  assert((await attention.boundingBox()).y<(await planning.boundingBox()).y);
  assert((await planning.boundingBox()).y<(await records.boundingBox()).y);
  assert.equal(await page.getByRole('heading',{level:1}).count(),1);
  assert.equal(await planning.getByRole('button',{name:'Calendar',exact:true}).getAttribute('aria-pressed'),'true');
  assert.deepEqual(await planning.locator('[aria-label="Planning view"] button').allTextContents(),['Calendar','List']);
  await planning.getByRole('button',{name:'List',exact:true}).click();
  const listNames=await planning.locator('strong').allTextContents();
  await records.getByRole('button',{name:'Bills',exact:true}).click();
  assert.deepEqual(await planning.locator('strong').allTextContents(),listNames);
  await planning.getByRole('button',{name:'Show more dates',exact:true}).click();
  const expandedNames=await planning.locator('strong').allTextContents();
  await planning.getByRole('button',{name:'Calendar',exact:true}).click();
  await planning.getByRole('button',{name:/Show more ·/}).click();
  assert.deepEqual(await planning.locator('strong').allTextContents(),expandedNames);
  await planning.getByRole('button',{name:/View reminder details/}).first().click();
  await page.getByRole('dialog').filter({has:page.getByRole('button',{name:'Close reminder details'})}).getByRole('button',{name:'Close reminder details'}).click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await planning.getByRole('button',{name:'Calendar',exact:true}).click();
  await records.getByRole('button',{name:/^All/}).click();
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:`artifacts/household-core/${engine.name()}-${width}-dashboard.png`,fullPage:true});
  await attention.getByRole('link',{name:'Review all occurrences'}).click();
  await page.getByRole('heading',{name:'Occurrences to review',exact:true}).waitFor();
  await page.getByRole('link',{name:'Review',exact:true}).first().click();
  const completion=page.locator('form').filter({has:page.getByRole('heading',{name:'Record completion'})});
  await completion.getByRole('button',{name:'Review sample activity'}).waitFor();
  await completion.getByRole('button',{name:'Review sample activity'}).click();
  await completion.getByRole('status').waitFor();
  await completion.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.goto(base+'/demo/items/cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  const history=page.locator('section[aria-labelledby="activity-history-heading"]');
  await history.getByRole('heading',{name:'Activity history',exact:true}).waitFor();
  assert.equal(await history.getByRole('button',{name:'Correct',exact:true}).count(),2);
  await page.goto(base+'/demo/add/other?preset=electric-bill');
  await page.getByLabel('A helpful name').fill('Sample electric bill');
  const options=page.locator('details').filter({has:page.locator('summary').getByText('Provider, brand and notes (optional)',{exact:true})});
  assert.equal(await options.getAttribute('open'),null);
  await page.getByLabel('Add an important date').uncheck();
  await page.getByRole('button',{name:'Review sample item',exact:true}).click();
  await page.getByRole('status').waitFor();
  // Real name-first save, including a failed transaction and retry with fields retained.
  await page.goto(base+'/add/other?preset=electric-bill');
  await page.getByLabel('A helpful name').fill('Electric bill kept for later');
  await page.getByText('Provider, brand and notes (optional)',{exact:true}).click();
  await page.getByRole('combobox',{name:/Biller \/ provider/}).click();
  await page.getByRole('option',{name:'Meralco',exact:true}).click();
  await page.getByLabel('Notes (optional)').fill('Details entered before the date is known');
  await page.getByText('Provider, brand and notes (optional)',{exact:true}).click();
  await page.getByLabel('Add an important date').uncheck();
  failSave();await page.getByRole('button',{name:'Save item',exact:true}).click();
  await page.getByRole('alert').waitFor();assert.equal(await page.getByLabel('A helpful name').inputValue(),'Electric bill kept for later');
  await page.getByRole('button',{name:'Save item',exact:true}).click();
  await page.getByRole('heading',{name:'Electric bill kept for later',exact:true}).waitFor();
  const bill=(await admin.query("select * from public.items where user_id=$1 and product_name='Electric bill kept for later'",[owner])).rows;assert.equal(bill.length,1);assert.equal(bill[0].utility_id,'meralco');assert.equal(bill[0].notes,'Details entered before the date is known');
  assert.equal((await admin.query('select count(*)::int as n from public.important_dates where item_id=$1',[bill[0].id])).rows[0].n,0);
  await page.getByRole('button',{name:'Add date',exact:true}).click();
  await page.getByLabel('Next payment',{exact:true}).fill(today);await page.getByLabel('Send me alerts for this date').uncheck();
  await page.getByRole('button',{name:'Save date',exact:true}).click();
  await page.getByRole('button',{name:'Mark paid',exact:true}).waitFor();
  assert.equal((await admin.query('select count(*)::int as n from public.important_dates where item_id=$1',[bill[0].id])).rows[0].n,1);
  await page.getByRole('link',{name:'Edit details',exact:true}).click();
  assert.equal(await page.getByLabel('Notes (optional)').inputValue(),'Details entered before the date is known');
  await page.getByRole('link',{name:'Cancel',exact:true}).click();
  await page.getByRole('heading',{name:'Household items',exact:true}).waitFor();
  assert.equal((await admin.query('select count(*)::int as n from public.items where user_id=$1',[owner])).rows[0].n,3);
  // Add service to an existing saved vehicle instead of creating a duplicate.
  const car=randomUUID();await actor(owner,"select public.create_item_draft($1,'car')",[car]);await actor(owner,'select public.save_item_with_date($1,1,$2,$3,null,null,$4)',[car,'Existing family car','','toyota']);
  await page.goto(base+'/add/car?focus=service');
  await page.getByLabel('Which car is this for?').selectOption(car);
  await page.getByLabel('Next service date').fill(today);await page.getByLabel('Send me alerts for this date').uncheck();
  await page.getByRole('button',{name:'Save date to vehicle',exact:true}).click();
  await page.getByRole('heading',{name:'Existing family car',exact:true}).waitFor();
  assert.equal((await admin.query("select count(*)::int as n from public.items where user_id=$1 and template_key='car'",[owner])).rows[0].n,1);
  assert.equal((await admin.query('select count(*)::int as n from public.important_dates where item_id=$1',[car])).rows[0].n,1);
  await page.goto(base+'/add/other?preset=internet-bill');
  await page.getByLabel('A helpful name').fill('Internet payment schedule');
  await page.getByLabel('Next payment',{exact:true}).fill(today);
  await page.getByText('Schedule details',{exact:true}).click();
  await page.getByLabel('Schedule ends').selectOption('date');
  await page.getByText('Schedule details',{exact:true}).click();
  await page.getByRole('button',{name:'Save item',exact:true}).click();
  await page.getByLabel('End date',{exact:true}).waitFor({state:'visible'});
  await page.getByLabel('End date',{exact:true}).fill('2032-12-31');
  await page.getByText('Payment amount (optional)',{exact:true}).click();
  await page.getByLabel('Amount per payment').fill('1200');
  await page.getByText('Payment amount (optional)',{exact:true}).click();
  await page.getByLabel('Send me alerts for this date').uncheck();
  await page.getByRole('button',{name:'Save item',exact:true}).click();
  await page.getByRole('heading',{name:'Internet payment schedule',exact:true}).waitFor();
  const savedSchedule=(await admin.query("select d.recurrence_months,d.recurrence_ends_on::text,d.payment_amount_minor,d.reminders_enabled from public.important_dates d join public.items i on i.id=d.item_id where i.user_id=$1 and i.product_name='Internet payment schedule'",[owner])).rows[0];
  assert.equal(savedSchedule.recurrence_months,1);assert.equal(savedSchedule.recurrence_ends_on,'2032-12-31');assert.equal(Number(savedSchedule.payment_amount_minor),120000);assert.equal(savedSchedule.reminders_enabled,false);
  // Purchase details survive collapsing. A minimal purchase works with no files or warranty.
  await page.goto(base+'/add/receipt?category=appliances');
  await page.getByLabel('Product name',{exact:true}).fill('New washing machine');
  await page.getByText('Purchase details (optional)',{exact:true}).click();await page.getByLabel('Store or merchant').fill('Appliance store');
  await page.getByText('Purchase details (optional)',{exact:true}).click();
  await page.getByRole('button',{name:'Save purchase',exact:true}).click();await page.getByRole('heading',{name:'New washing machine',exact:true}).waitFor();
  assert.equal((await admin.query("select merchant from public.items where user_id=$1 and product_name='New washing machine'",[owner])).rows[0].merchant,'Appliance store');
  await page.goto(base+'/demo/add/receipt?category=appliances');await page.getByLabel('Product name',{exact:true}).fill('Demo appliance');
  await page.getByRole('button',{name:'Review sample purchase',exact:true}).click();await page.getByRole('status').waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`artifacts/household-core/${engine.name()}-${width}-purchase.png`,fullPage:true});
}

async function testInsightsExperience({page,base,owner,actor,admin,today,engine,width,failSave}) {
  await mkdir('artifacts/household-insights',{recursive:true});
  await page.goto(base+'/demo');
  await page.getByRole('heading',{name:'Your household brief',exact:true}).waitFor();
  const summary=page.locator('section[aria-labelledby="payment-summary-heading"]');
  assert((await summary.textContent()).includes('Unverified'));
  assert((await summary.textContent()).includes('₱8,399'));
  await summary.getByRole('link',{name:'Review payment amounts'}).click();
  await page.getByRole('heading',{name:'Payments to plan for',exact:true}).waitFor();
  await page.getByRole('link',{name:'Review amount',exact:true}).first().click();
  let form=page.locator('form').filter({has:page.getByRole('heading',{name:'Expected amount for this date',exact:true})});
  await form.getByLabel('Amount status').selectOption('estimated');
  await form.getByLabel('Expected amount (PHP)').fill('2000');
  await form.getByRole('button',{name:'Review sample amount',exact:true}).click();
  await page.getByRole('status').getByText('Sample amount shown here. No changes are saved.').waitFor();
  await page.waitForURL(url=>!url.searchParams.has('action'));
  await page.waitForLoadState('networkidle');
  await page.goto(base+'/demo/items/99999999-9999-4999-8999-999999999999');
  const ready=page.locator('section[aria-labelledby="readiness-heading"]');
  const service=ready.locator('li').filter({has:page.getByText('Service history',{exact:true})});
  await service.getByRole('button',{name:'Manage suggestion'}).click();
  await service.getByLabel('Detail status').selectOption('not_applicable');
  await service.getByRole('button',{name:'Review sample preference'}).click();
  await service.getByText('Not applicable',{exact:true}).waitFor();
  await page.goto(base+'/demo/items?q=Sample%20washing%20machine%20receipt.svg');
  await page.getByRole('heading',{name:'Washing machine: receipt & warranty',exact:true}).waitFor();
  assert.equal(await page.locator('.purchase-grid h3').count(),1);
  await page.goto(base+'/demo');await page.getByRole('heading',{name:'Your household brief',exact:true}).waitFor();
  await page.screenshot({path:`artifacts/household-insights/${engine.name()}-${width}-demo.png`,fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  // A name-only bill proves preference success, cancellation, retry and later data completion.
  await admin.query('delete from private.rate_limit_buckets where user_id=$1',[owner]);
  const item=randomUUID();await actor(owner,"select public.create_item_draft($1,'other')",[item]);
  await actor(owner,'select public.save_item_with_date($1,1,$2,$3,null,$4)',[item,'Readiness bill','Household search needle','electric-bill']);
  await page.goto(base+'/items/'+item);await page.getByRole('heading',{name:'Readiness bill',exact:true}).waitFor();
  const key=page.locator('section[aria-labelledby="readiness-heading"] li').filter({has:page.getByText('Important date',{exact:true})});
  await key.getByRole('button',{name:'Manage suggestion'}).click();await key.getByLabel('Detail status').selectOption('not_applicable');await key.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal((await admin.query('select count(*)::int n from public.item_readiness_preferences where item_id=$1',[item])).rows[0].n,0);
  await key.getByRole('button',{name:'Manage suggestion'}).click();await key.getByLabel('Detail status').selectOption('unknown');
  failSave();await key.getByRole('button',{name:'Save preference',exact:true}).click();await key.getByRole('alert').waitFor();assert.equal(await key.getByLabel('Detail status').inputValue(),'unknown');
  await key.getByRole('button',{name:'Save preference',exact:true}).click();await key.getByText('Not known yet',{exact:true}).waitFor();
  assert.equal((await admin.query('select state from public.item_readiness_preferences where item_id=$1',[item])).rows[0].state,'unknown');
  await page.reload();await key.getByText('Not known yet',{exact:true}).waitFor();
  await key.getByRole('button',{name:'Review dates',exact:true}).click();
  form=page.locator('form').filter({has:page.getByRole('heading',{name:'Add an important date',exact:true})});
  await form.getByLabel('Next payment',{exact:true}).fill(today);
  await form.getByLabel('Amount per payment').fill('1500');
  assert.equal(await form.getByLabel('Schedule amount status').inputValue(),'estimated');
  await form.getByLabel('Send me alerts for this date').uncheck();
  await form.getByRole('button',{name:'Save date',exact:true}).click();await key.getByText('Saved',{exact:true}).waitFor();
  await page.waitForLoadState('networkidle');
  const date=(await actor(owner,'select public.item_detail($1) data',[item])).rows[0].data.dates[0],occurrence=date.occurrences.find(o=>o.status==='open');
  await page.goto(base+'/items/payments');await page.getByRole('heading',{name:'Payments to plan for',exact:true}).waitFor();
  const payment=page.locator('li').filter({has:page.getByRole('link',{name:'Readiness bill',exact:true})});
  await payment.getByRole('link',{name:'Review amount',exact:true}).click();
  form=page.locator('form').filter({has:page.getByRole('heading',{name:'Expected amount for this date',exact:true})});
  await form.getByLabel('Expected amount (PHP)').fill('1300');await form.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.waitForURL(url=>!url.searchParams.has('action'));
  await page.waitForLoadState('networkidle');
  assert.equal((await admin.query('select amount_certainty from public.date_occurrences where id=$1',[occurrence.id])).rows[0].amount_certainty,null);
  await page.getByRole('button',{name:'Edit expected amount',exact:true}).click();await form.getByLabel('Amount status').selectOption('confirmed');await form.getByLabel('Expected amount (PHP)').fill('bad');
  await form.getByRole('button',{name:'Save expected amount',exact:true}).click();await form.getByRole('alert').waitFor();
  await form.getByLabel('Expected amount (PHP)').fill('1200.50');failSave();await form.getByRole('button',{name:'Save expected amount',exact:true}).click();await form.getByRole('alert').waitFor();
  assert.equal(await form.getByLabel('Expected amount (PHP)').inputValue(),'1200.50');
  await form.getByRole('button',{name:'Save expected amount',exact:true}).click();await form.waitFor({state:'hidden'});
  const stored=(await admin.query('select expected_amount_minor,amount_certainty,status from public.date_occurrences where id=$1',[occurrence.id])).rows[0];
  assert.equal(Number(stored.expected_amount_minor),120050);assert.equal(stored.amount_certainty,'confirmed');assert.equal(stored.status,'open');
  await page.waitForLoadState('networkidle');
  await page.goto(base+'/dashboard');await page.getByRole('heading',{name:'Your household brief',exact:true}).waitFor();
  assert((await page.locator('section[aria-labelledby="payment-summary-heading"]').textContent()).includes('₱1,200.50'));
  await page.screenshot({path:`artifacts/household-insights/${engine.name()}-${width}-private.png`,fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto(base+'/items/'+item+'?date='+date.id+'&action=amount');
  await form.getByLabel('Amount status').selectOption('inherit');
  await form.getByRole('button',{name:'Save expected amount',exact:true}).click();
  await page.waitForURL(url=>!url.searchParams.has('action'));await page.waitForLoadState('networkidle');
  const reset=(await admin.query('select amount_certainty,expected_amount_minor from public.date_occurrences where id=$1',[occurrence.id])).rows[0];assert.equal(reset.amount_certainty,null);assert.equal(reset.expected_amount_minor,null);
  await page.goto(base+'/items?q=Household%20search%20needle');await page.getByRole('heading',{name:'Readiness bill',exact:true}).waitFor();assert.equal(await page.locator('.purchase-grid h3').count(),1);
}
