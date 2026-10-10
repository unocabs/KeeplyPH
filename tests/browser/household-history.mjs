// Real application/server actions and isolated PostgreSQL, with local Auth/REST stand-ins.
// This does not verify hosted Supabase, Google OAuth, Storage uploads or physical devices.
import assert from 'node:assert/strict';
import { createServer, request as forwardRequest } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, writeFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// A visible success message can precede the end of a streamed action response.
const pendingActions=new WeakMap();
async function settleActions(page) {
  const pending=pendingActions.get(page),deadline=Date.now()+10000;
  while(pending?.size){if(Date.now()>deadline)throw new Error('Server action response did not finish before navigation: '+JSON.stringify([...pending].map(request=>({url:request.url(),action:Boolean(request.headers()['next-action'])}))));await new Promise(resolve=>setTimeout(resolve,25));}
}

// Wait for pending server actions and hydration before interacting with a new page.
async function visit(page,url) {
  await settleActions(page);
  await page.waitForLoadState('networkidle');
  try { await page.goto(url); }
  catch(error) {
    // WebKit can cancel a test navigation when a preceding action finishes its refresh.
    if(!/cancelled; maybe frame was detached|ERR_ABORTED/.test(error.message))throw error;
    await page.waitForLoadState('networkidle');
    await page.goto(url);
  }
  await page.waitForLoadState('networkidle');
}

export async function testHouseholdBrowser({ admin, actor, user }) {
  const playwrightModule = process.env.PLAYWRIGHT_MODULE;
  const manual = process.env.PG_TEST_CUA === '1';
  const playwright = manual ? null : playwrightModule ? await import(pathToFileURL(playwrightModule).href) : createRequire(import.meta.url)('playwright');
  const output = 'artifacts/household-history'; await mkdir(output, { recursive: true });
  const production=process.env.PG_TEST_PRODUCTION==='1';
  const apiPort = 34571, appPort = 34572, tlsPort=34574, httpBase=`http://localhost:${appPort}`, base=production?`https://localhost:${tlsPort}`:httpBase;
  let tlsProxy,certificateFolder;
  const owners = new Map(), errors = [], reports = [], sessions = new Map();
  let manualOwner;
  const rpcNames = new Set(['household_outlook','household_spending_checkup','household_planner','activate_installation_premium','acknowledge_installation_premium','get_billing_orders','account_usage','item_detail','date_history','reminder_preview','item_activity_history','complete_occurrence','save_item_activity','void_item_activity','skip_unconfirmed_occurrence','activity_corrections','dashboard_timeline_items','unconfirmed_occurrence_summary','list_items','item_coverage','create_item_draft','save_item_with_date','save_utility_item_with_date','save_motorcycle_item_with_date','save_subscription_item_with_date','save_loan_item_with_date','save_insurance_item_with_date','create_purchase_draft','save_purchase','save_important_date','household_insights','household_payment_plan','set_readiness_preference','set_occurrence_amount']);
  let failNextSave = false;
  let failNextCheckup = false;
  let failNextOutlook = false;
  const api = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${apiPort}`);
    res.setHeader('Content-Type', 'application/json');
    try {
      if(manual && url.pathname === '/__test/login') {
        const session=sessions.get(url.searchParams.get('owner'));if(!session)throw new Error('Unknown isolated test session');
        res.setHeader('Set-Cookie','sb-localhost-auth-token=base64-'+Buffer.from(JSON.stringify(session)).toString('base64url')+'; Path=/; SameSite=Lax');
        res.writeHead(303,{Location:base+'/items/payments'});res.end();return;
      }
      if(manual && url.pathname === '/__test/fail-next' && req.method==='POST') {failNextSave=true;res.end('{}');return;}
      if(manual && url.pathname === '/__test/conflict' && req.method==='POST') {
        await admin.query("update public.important_dates set revision=revision+1 where user_id=$1 and item_id=(select id from public.items where user_id=$1 and product_name='Quick internet bill')",[manualOwner]);res.end('{}');return;
      }
      if(manual && url.pathname === '/__test/state') {
        const dates=(await admin.query('select i.product_name,d.id,d.revision,o.id occurrence_id,o.status,o.due_on::text,o.expected_amount_minor,o.amount_certainty from public.items i join public.important_dates d on d.item_id=i.id join public.date_occurrences o on o.date_id=d.id where i.user_id=$1 order by i.product_name,o.due_on',[manualOwner])).rows;
        const activities=(await admin.query('select activity_type,title,amount_minor,completed_on::text,notes from public.item_activities where user_id=$1',[manualOwner])).rows;
        res.end(JSON.stringify({dates,activities}));return;
      }
      const bearer = req.headers.authorization?.split(' ')[1];
      const owner = bearer?.includes('.') ? JSON.parse(Buffer.from(bearer.split('.')[1], 'base64url').toString()).sub : null;
      if (!owner || !owners.has(owner)) { res.writeHead(401); res.end(JSON.stringify({ message: 'Local test session required' })); return; }
      if (url.pathname === '/auth/v1/user') { res.end(JSON.stringify(owners.get(owner))); return; }
      if (url.pathname.startsWith('/rest/v1/rpc/')) {
        const name = url.pathname.split('/').at(-1); if (!rpcNames.has(name)) throw new Error('Unsupported test RPC');
        let body = ''; for await (const chunk of req) body += chunk;
        const args = JSON.parse(body || '{}'), keys = Object.keys(args);
        if (!keys.every(key => /^p_[a-z_]+$/.test(key))) throw new Error('Invalid RPC arguments');
        if(failNextOutlook&&name==='household_outlook'){failNextOutlook=false;res.writeHead(503);res.end(JSON.stringify({message:'Test outlook interruption'}));return;}
        if(failNextCheckup&&name==='household_spending_checkup'){failNextCheckup=false;res.writeHead(503);res.end(JSON.stringify({message:'Test checkup interruption'}));return;}
        if (failNextSave && ['complete_occurrence','save_item_activity','save_utility_item_with_date','set_readiness_preference','set_occurrence_amount','save_important_date','activate_installation_premium'].includes(name)) { failNextSave = false; res.writeHead(503); res.end(JSON.stringify({ message: 'Test connection interruption' })); return; }
        const result = await actor(owner, `select public.${name}(${keys.map((key, i) => `${key}=>$${i+1}`).join(',')}) as value`, Object.values(args));
        res.end(JSON.stringify(result.rows[0].value)); return;
      }
      const table = url.pathname.split('/').at(-1);
      if (!['profiles','items','date_occurrences','important_dates'].includes(table)) throw new Error('Unsupported test table');
      const entries = [...url.searchParams].filter(([key]) => ['id','user_id','state','archived_at','template_key'].includes(key));
      const values = [], clauses = entries.map(([key, value]) => {
        if (value === 'is.null') return `${key} is null`;
        if(value.startsWith('in.(')&&value.endsWith(')')) {const ids=value.slice(4,-1).split(',');if(!ids.every(id=>/^[0-9a-f-]{36}$/i.test(id)))throw new Error('Invalid test IDs');values.push(ids);return `${key}=any($${values.length}::uuid[])`;}
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
  if(production) {
    certificateFolder=await mkdtemp(join(tmpdir(),'keeply-browser-tls-'));
    execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(certificateFolder,'key.pem'),'-out',join(certificateFolder,'cert.pem'),'-days','1','-subj','/CN=localhost'],{stdio:'ignore'});
    tlsProxy=createHttpsServer({key:await readFile(join(certificateFolder,'key.pem')),cert:await readFile(join(certificateFolder,'cert.pem'))},(req,res)=>{
      const upstream=forwardRequest({hostname:'localhost',port:appPort,path:req.url,method:req.method,headers:{...req.headers,'x-forwarded-proto':'https','x-forwarded-host':`localhost:${tlsPort}`,'x-forwarded-port':String(tlsPort)}},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});
      upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
    });
    await new Promise((resolve,reject)=>{tlsProxy.once('error',reject);tlsProxy.listen(tlsPort,'localhost',resolve);});
  }
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next',production?'start':'dev','--port',String(appPort)], {
    cwd:process.cwd(),env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:`http://localhost:${apiPort}`,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'local-test-key',SUPABASE_SECRET_KEY:'local-test-key',SUPABASE_SERVICE_ROLE_KEY:'local-test-key',APP_URL:base,PAYMENTS_ENABLED:'false',EMAIL_DELIVERY_ENABLED:'false',WEB_PUSH_DELIVERY_ENABLED:'false'},stdio:['ignore','pipe','pipe'],
  });
  let serverLog = ''; server.stdout.on('data', chunk => { serverLog += chunk; }); server.stderr.on('data', chunk => { serverLog += chunk; });
  let browser,lastPage;
  try {
    for(let attempt=0;attempt<120;attempt++) {
      try { if((await fetch(httpBase + '/demo')).ok) break; } catch {}
      if(server.exitCode !== null) throw new Error('Local app exited: ' + serverLog.slice(-1500));
      await new Promise(resolve => setTimeout(resolve, 250));
      if(attempt===119) throw new Error('Local app failed to start');
    }
    if(manual) {
      const owner=await user(),now=Math.floor(Date.now()/1000);manualOwner=owner;
      const testUser={id:owner,aud:'authenticated',role:'authenticated',email:'quick-payment@example.test',email_confirmed_at:new Date().toISOString(),user_metadata:{full_name:'Payment test household'},app_metadata:{provider:'google'}};
      owners.set(owner,testUser);
      const jwt=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:owner,aud:'authenticated',role:'authenticated',iat:now,exp:now+3600,iss:`http://localhost:${apiPort}/auth/v1`,session_id:randomUUID()})).toString('base64url'),'bG9jYWwtdGVzdA'].join('.');
      sessions.set(owner,{access_token:jwt,refresh_token:'local-test',expires_in:3600,expires_at:now+3600,token_type:'bearer',user:testUser});
      const today=(await admin.query("select (now() at time zone 'Asia/Manila')::date::text as t")).rows[0].t;
      for(const [name,amount,certainty,offset,recurrence] of [['Quick electricity bill',150000,'unverified',0,1],['Quick internet bill',200000,'estimated',2,null],['Amount to add',null,'estimated',3,null],['Projected school fee',100000,'estimated',-1,1]]) {
        const id=randomUUID();await actor(owner,"select public.create_item_draft($1,'other')",[id]);
        const due=new Date(Date.parse(today+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10);
        await actor(owner,'select public.save_item_with_date($1,1,$2,$3,$4,$5)',[id,name,'',{kind:'other',label:'Monthly payment',due_on:due,reminders_enabled:false,offsets:[],interval_months:null,recurrence_months:recurrence,recurrence_ends_on:null,payment_amount_minor:amount,payment_amount_certainty:certainty},'electric-bill']);
      }
      console.log('CUA payment fixture ready: '+`http://localhost:${apiPort}/__test/login?owner=${owner}`);
      console.log('Isolated database only. Send a newline on stdin after browser checks to clean up.');
      process.stdin.resume();await new Promise(resolve=>process.stdin.once('data',resolve));process.stdin.pause();return;
    }
    for(const [engine,width] of [[playwright.chromium,1280],[playwright.chromium,390],[playwright.webkit,390]].filter(([engine])=>!process.env.PG_TEST_BROWSER_ENGINE||engine.name()===process.env.PG_TEST_BROWSER_ENGINE)) {
      browser = await engine.launch(engine.name() === 'chromium' ? {channel:process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || 'chrome'} : {});
      const context = await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:production});
      const owner=await user(), item=randomUUID(), now=Math.floor(Date.now()/1000);
      const testUser={id:owner,aud:'authenticated',role:'authenticated',email:'household-test@example.test',email_confirmed_at:new Date().toISOString(),user_metadata:{full_name:'Test household'},app_metadata:{provider:'google'}};
      owners.set(owner,testUser);
      await actor(owner,"select public.create_item_draft($1,'aircon')",[item]);
      const today=(await admin.query("select (now() at time zone 'Asia/Manila')::date::text as t")).rows[0].t;
      await actor(owner,'select public.save_item_with_date($1,1,$2,$3,$4)',[item,'Bedroom aircon','',{kind:'service',label:'Aircon cleaning',due_on:today,reminders_enabled:false,offsets:[],interval_months:3}]);
      const jwt=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:owner,aud:'authenticated',role:'authenticated',iat:now,exp:now+3600,iss:`http://localhost:${apiPort}/auth/v1`,session_id:randomUUID()})).toString('base64url'),'bG9jYWwtdGVzdA'].join('.');
      const session={access_token:jwt,refresh_token:'local-test',expires_in:3600,expires_at:now+3600,token_type:'bearer',user:testUser};
      await context.addCookies([{name:'sb-localhost-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),domain:'localhost',path:'/',httpOnly:false,sameSite:'Lax'}]);
      const page=await context.newPage(); lastPage=page; page.setDefaultTimeout(10000); const recentNetwork=[];page.on('requestfailed',request=>{recentNetwork.push({url:request.url(),method:request.method(),error:request.failure()?.errorText,at:Date.now()});if(recentNetwork.length>12)recentNetwork.shift();});page.on('pageerror',error=>errors.push({message:error.message,stack:error.stack,url:page.url(),engine:engine.name(),width,recentNetwork:[...recentNetwork],at:Date.now()}));
      const pending=new Set();pendingActions.set(page,pending);
      page.on('request',request=>{if(request.method()==='POST')pending.add(request);});
      page.on('requestfinished',request=>pending.delete(request));page.on('requestfailed',request=>pending.delete(request));
      const actionEditingOnly=process.env.PG_TEST_ACTION_EDITING_ONLY==='1',paymentOnly=process.env.PG_TEST_PAYMENT_ACTIONS_ONLY==='1';
      if(!actionEditingOnly&&!paymentOnly) {
      await testFreeSpendingClarity({page,base,owner,actor,admin,today,engine,width});
      await testSpendingCheckupExperience({page,base,owner,actor,admin,today,engine,width,failRead:()=>{failNextCheckup=true;}});
      await testHouseholdOutlookExperience({page,base,owner,actor,admin,today,engine,width,failRead:()=>{failNextOutlook=true;}});
      await visit(page,`${base}/items/${item}`); await page.getByRole('heading',{name:'Bedroom aircon',exact:true}).waitFor();
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
      await history.getByRole('button',{name:'Edit Details',exact:true}).click();
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
      await page.getByRole('heading',{name:'Past reminders to check'}).waitFor();
      await page.getByRole('button',{name:'Mark as skipped',exact:true}).click();
      await page.getByLabel('Reason for skipping').fill('Service was canceled'); await page.getByRole('button',{name:'Confirm skipped',exact:true}).click();
      await page.getByRole('heading',{name:'Past reminders to check'}).waitFor({state:'hidden'});
      await page.locator('details').filter({has:page.locator('summary').filter({hasText:/^History \(/})}).locator('summary').click();
      await page.getByRole('button',{name:'Reopen for review',exact:true}).click(); await page.getByLabel('Reason for reopening').fill('Service did happen');
      await page.getByRole('button',{name:'Confirm reopened',exact:true}).click(); await page.getByRole('heading',{name:'Past reminders to check'}).waitFor();
      await page.getByRole('button',{name:'Record completion',exact:true}).click(); await page.locator('form').filter({has:page.getByRole('heading',{name:'Record completion'})}).getByRole('button',{name:'Save activity',exact:true}).click();
      await history.getByRole('button',{name:'Edit Details',exact:true}).waitFor();
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
      await visit(page,base+'/dashboard');await page.getByRole('heading',{name:'Overdue or expired',exact:true}).waitFor();
      await page.getByRole('link',{name:'Review all'}).click();await page.waitForURL(url=>url.pathname==='/items'&&url.searchParams.get('filter')==='overdue');await page.getByRole('heading',{name:'Overdue or expired',exact:true}).waitFor();
      await page.getByRole('link',{name:/Review/}).filter({has:page.getByText('Older electricity bill',{exact:true})}).first().click();await page.getByRole('heading',{name:'Record completion',exact:true}).waitFor();
      await page.locator('form').filter({has:page.getByRole('heading',{name:'Record completion'})}).getByRole('button',{name:'Cancel',exact:true}).click();
      await page.getByText('Scheduled January 1, 2020',{exact:true}).waitFor();
      await page.locator('details').filter({has:page.locator('summary').filter({hasText:/^History \(/})}).locator('summary').click();
      await page.getByRole('button',{name:'Load older history',exact:true}).click();
      await page.getByText(/History \(40 cycles\)/).waitFor();
      await testCoreExperience({page,base,owner,actor,admin,today,engine,width,failSave:()=>{failNextSave=true;}});
      await testInsightsExperience({page,base,owner,actor,admin,today,engine,width,failSave:()=>{failNextSave=true;}});
      }
      if(!paymentOnly)await testActionEditing({page,base,owner,actor,admin,today,engine,width,failSave:()=>{failNextSave=true;}});
      await testServicePayments({page,base,owner,actor,admin,today,engine,width,failSave:()=>{failNextSave=true;}});
      if(!paymentOnly)await testPremiumExperience({page,context,base,owner,actor,admin,today,engine,width,failSave:()=>{failNextSave=true;}});
      reports.push({engine:engine.name(),width,outlook:paymentOnly||actionEditingOnly?[]:['Free gate','low data','full totals and contributors','month comparison','partial-month coverage','record navigation','cursor pagination','amount refresh','failed-read retry','stale month','expiry preserves Free access'],checkup:paymentOnly||actionEditingOnly?[]:['Free gate','isolated sample','low data','full-account totals','period and category navigation','source record links','pagination','stale bookmark','failed-read retry','amount and payment refresh','expiry preserves Free access'],premium:paymentOnly?[]:['automatic signed-in standalone gift','activation error retry','no notification requirement','modal and Escape dismissal','server acknowledgement','duplicate prevention','private year access','expiry returns to 30 days','sample amount validation and cancellation','monthly totals respond','sample edits survive month navigation','checkout hidden before verification','no overflow'],passed:paymentOnly?['maintenance Mark paid for estimates and exact amounts','confirm actual cost','cancel leaves history unchanged','invalid amount','failed save retains fields','retry records once','service history and next date','interval recurrence','fixed recurrence','completion-based recurrence','zero amount']:actionEditingOnly?['saved checklist date and cost','smooth guided record navigation','reduced-motion navigation','separate due-date checkbox','due-date-only schedule','stable zero timing','leading zero replacement','service expected cost','service cost payment count','action hierarchy','direct checklist service entry','cost cancellation','cost validation','server failure and retry']:['completion','actual cost','service next date','correction','audit history','cancel','void','skip','reopen','late completion','validation','server failure','retry','no overflow','account-wide review','historical deep link','cycle pagination','Premium preview before calendar','single planning view','demo review','demo history','demo creation','name-first save','add date later','provider persistence','form cancellation','creation failure retry','existing vehicle','purchase save','compact schedule and amount','collapsed validation reveal','readiness preferences','readiness cancellation and retry','occurrence amount confirmation','amount cancellation and retry','account-wide insights','expanded search','demo insights','stable zero timing','leading zero replacement','service expected cost','service cost payment count','action hierarchy','direct checklist service entry']});
      await settleActions(page);
      await context.close(); await browser.close(); browser=null;
    }
    await writeFile('artifacts/household-premium/private-browser-checks.json',JSON.stringify({reports,errors,limitations:['Local Auth and REST stand-ins; real server actions and isolated PostgreSQL','Standalone detection is simulated; no physical installation or hosted provider verification']},null,2));
    assert.deepEqual(errors,[]);
    for(const path of ['/', '/demo', '/items']) {
      const response=await fetch(httpBase+path,{redirect:'manual'}),html=await response.text();
      if(path==='/') { assert(html.includes('lang="en-PH"'));assert(html.includes('https://www.keeplyph.com'));assert(html.includes('application/ld+json')); }
      if(path==='/demo')assert(html.includes('noindex'));
      if(path==='/items')assert([303,307,308].includes(response.status));
    }
    const smoke=spawn(process.execPath,['scripts/smoke.mjs'],{cwd:process.cwd(),env:{...process.env,SMOKE_URL:httpBase},stdio:['ignore','pipe','pipe']});
    let smokeLog='';smoke.stdout.on('data',chunk=>{smokeLog+=chunk;});smoke.stderr.on('data',chunk=>{smokeLog+=chunk;});
    const smokeCode=await new Promise(resolve=>smoke.once('exit',resolve));
    assert.equal(smokeCode,0,smokeLog);console.log('✓ Existing HTTP smoke checks and rendered public/private indexing checks passed');
    await writeFile(`${output}/browser-checks.json`,JSON.stringify({reports,errors,limitations:['Local Auth and REST stand-ins; real server actions and isolated PostgreSQL','No hosted provider or physical-device verification']},null,2));
    console.log('✓ Household browser flows passed: '+reports.map(report=>report.engine+' '+report.width).join(', '));
  } catch(error) {
    if(lastPage&&!lastPage.isClosed()) {
      await lastPage.screenshot({path:'/tmp/keeply-browser-failure.png',fullPage:true}).catch(()=>{});
      await writeFile('/tmp/keeply-browser-failure.json',JSON.stringify({url:lastPage.url(),errors,html:await lastPage.content()},null,2));
    }
    throw error;
  } finally {
    if(browser)await browser.close();
    if(server.exitCode===null&&server.signalCode===null) {server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));}
    if(tlsProxy)await new Promise(resolve=>tlsProxy.close(resolve));
    if(certificateFolder)await rm(certificateFolder,{recursive:true,force:true});
    await new Promise(resolve=>api.close(resolve));
  }
}

async function testCoreExperience({page,base,owner,actor,admin,today,engine,width,failSave}) {
  await mkdir('artifacts/household-core',{recursive:true});
  await visit(page,base+'/demo');
  const attention=page.locator('section[aria-labelledby="attention-heading"]'),planning=page.locator('section[aria-labelledby="planning-heading"]'),records=page.locator('section[aria-labelledby="all-reminders-heading"]');
  await planning.getByRole('heading',{name:'Your next 30 days'}).waitFor();
  assert((await planning.boundingBox()).y<(await attention.boundingBox()).y);
  assert((await planning.boundingBox()).y<(await records.boundingBox()).y);
  assert.equal(await page.getByRole('heading',{level:1}).count(),1);
  assert.equal(await planning.getByRole('button',{name:'Calendar',exact:true}).getAttribute('aria-pressed'),'true');
  const premiumPreview=page.locator('section[aria-label="Household Premium planning"]');
  assert((await premiumPreview.boundingBox()).y<300);
  assert((await premiumPreview.boundingBox()).y<(await planning.boundingBox()).y);
  const grid=planning.locator('[class*="grid"]');
  const todayLine=grid.locator('span').first();
  assert.equal(await todayLine.evaluate(el=>getComputedStyle(el).borderLeftStyle),'solid');
  assert(Math.abs((await todayLine.boundingBox()).x-(await grid.boundingBox()).x)<2);

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
  await attention.getByRole('link',{name:'Review all'}).click();
  await page.waitForURL(url=>url.pathname==='/demo/items'&&url.searchParams.get('filter')==='overdue');
  await page.getByRole('heading',{name:'Overdue or expired',exact:true}).waitFor();
  assert.equal(await page.locator('section.panel').getByRole('link').count(),3);
  await page.locator('section.panel').getByRole('link').filter({hasText:'Review'}).first().click();
  const completion=page.locator('form').filter({has:page.getByRole('heading',{name:'Record completion'})});
  await completion.getByRole('button',{name:'Review sample activity'}).waitFor();
  await completion.getByRole('button',{name:'Review sample activity'}).click();
  await completion.getByRole('status').waitFor();
  await completion.getByRole('button',{name:'Cancel',exact:true}).click();
  await visit(page,base+'/demo/items/cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  const history=page.locator('section[aria-labelledby="activity-history-heading"]');
  await history.getByRole('heading',{name:'Activity history',exact:true}).waitFor();
  assert.equal(await history.getByRole('button',{name:'Edit Details',exact:true}).count(),2);
  await visit(page,base+'/demo/add/other?preset=electric-bill');
  await page.getByLabel('A helpful name').fill('Sample electric bill');
  const options=page.locator('details').filter({has:page.locator('summary').getByText('Provider, brand and notes (optional)',{exact:true})});
  assert.equal(await options.getAttribute('open'),null);
  await page.getByLabel('Add an important date').uncheck();
  await page.getByRole('button',{name:'Review sample item',exact:true}).click();
  await page.getByRole('status').waitFor();
  // Real name-first save, including a failed transaction and retry with fields retained.
  await visit(page,base+'/add/other?preset=electric-bill');
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
  await visit(page,base+'/add/car?focus=service');
  await page.getByLabel('Which car is this for?').selectOption(car);
  await page.getByLabel('Next service date').fill(today);await page.getByLabel('Send me alerts for this date').uncheck();
  await page.getByRole('button',{name:'Save date to vehicle',exact:true}).click();
  await page.getByRole('heading',{name:'Existing family car',exact:true}).waitFor();
  assert.equal((await admin.query("select count(*)::int as n from public.items where user_id=$1 and template_key='car'",[owner])).rows[0].n,1);
  assert.equal((await admin.query('select count(*)::int as n from public.important_dates where item_id=$1',[car])).rows[0].n,1);
  await visit(page,base+'/add/other?preset=internet-bill');
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
  await visit(page,base+'/add/receipt?category=appliances');
  await page.getByLabel('Product name',{exact:true}).fill('New washing machine');
  await page.getByText('Purchase details (optional)',{exact:true}).click();await page.getByLabel('Store or merchant').fill('Appliance store');
  await page.getByText('Purchase details (optional)',{exact:true}).click();
  await page.getByRole('button',{name:'Save purchase',exact:true}).click();await page.getByRole('heading',{name:'New washing machine',exact:true}).waitFor();
  assert.equal((await admin.query("select merchant from public.items where user_id=$1 and product_name='New washing machine'",[owner])).rows[0].merchant,'Appliance store');
  await visit(page,base+'/demo/add/receipt?category=appliances');await page.getByLabel('Product name',{exact:true}).fill('Demo appliance');
  await page.getByRole('button',{name:'Review sample purchase',exact:true}).click();await page.getByRole('status').waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`artifacts/household-core/${engine.name()}-${width}-purchase.png`,fullPage:true});
}

async function testFreeSpendingClarity({page,base,owner,actor,admin,today,engine,width}) {
  await mkdir('artifacts/household-spending',{recursive:true});
  const summary=page.locator('section[aria-labelledby="payment-summary-heading"]');
  await visit(page,base+'/dashboard');
  await summary.getByText('No upcoming expenses',{exact:true}).waitFor();
  assert(!(await summary.textContent()).includes('₱0'));
  await summary.getByRole('link',{name:'Add a household expense',exact:true}).click();
  await page.waitForURL(url=>url.pathname==='/add'&&url.searchParams.get('category')==='bills');
  await page.locator('a[href="/add/other?preset=electric-bill"]').waitFor();
  const id=randomUUID();
  await actor(owner,"select public.create_item_draft($1,'other')",[id]);
  await actor(owner,'select public.save_item_with_date($1,1,$2,$3,$4,$5)',[id,'Spending clarity bill','',{kind:'other',label:'Bill payment',due_on:today,reminders_enabled:false,offsets:[],interval_months:null,payment_amount_minor:null},'electric-bill']);
  await visit(page,base+'/dashboard');
  await summary.getByText('Amounts not added yet',{exact:true}).waitFor();
  assert(!(await summary.textContent()).includes('₱0'));
  assert((await summary.textContent()).includes('1 upcoming expense needs an amount'));
  await summary.getByRole('link',{name:'Add missing amounts',exact:true}).click();
  const payment=page.locator('li').filter({has:page.getByRole('link',{name:'Spending clarity bill',exact:true})});
  const totals=page.getByRole('region',{name:'Your Total Household Spending',exact:true});
  await payment.getByText('Amount not yet known',{exact:true}).waitFor();
  // An explicit zero, an estimate, a confirmation, and unknown all remain unpaid.
  for(const [value,estimated,label] of [['0',false,'Confirmed amount'],['1234.56',true,'Estimated amount'],['1200.50',false,'Confirmed amount'],['',false,'Amount not yet known']]) {
    await payment.getByRole('button',{name:value==='0'?'Add amount':'Edit amount',exact:true}).click();
    const form=payment.locator('form');
    await form.getByLabel('Expected amount (PHP)').fill(value);
    await form.getByLabel('This is an estimate').setChecked(estimated);
    await form.getByRole('button',{name:'Save expected amount',exact:true}).click();
    await form.waitFor({state:'hidden'});
    await payment.getByText(label,{exact:true}).waitFor();
    if(value==='0')await totals.getByText('Saved amounts total zero',{exact:true}).waitFor();
    if(estimated)await totals.getByText('₱1,234.56 of this total is estimated.',{exact:true}).waitFor();
    if(value==='1200.50')assert(!(await totals.textContent()).includes('is estimated'));
    if(value==='')await totals.getByText('Amounts not added yet',{exact:true}).waitFor();
    await page.waitForLoadState('networkidle');
    const detail=(await actor(owner,'select public.item_detail($1) data',[id])).rows[0].data;
    const current=detail.dates[0].occurrences.find(row=>row.status==='open');
    assert.equal(current.amount_certainty,value===''?'unset':estimated?'estimated':'confirmed');
    assert.equal(current.expected_amount_minor,value===''?null:Math.round(Number(value)*100));
    assert.equal(detail.dates[0].payment_amount_minor,null);
    assert.equal((await admin.query('select count(*)::int n from public.item_activities where item_id=$1',[id])).rows[0].n,0);
  }
  await visit(page,base+'/dashboard');
  await summary.getByText('Amounts not added yet',{exact:true}).waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await summary.screenshot({path:`artifacts/household-spending/${engine.name()}-${width}-unknown.png`});
  await admin.query('delete from public.items where id=$1',[id]);
  await admin.query('delete from private.rate_limit_buckets where user_id=$1',[owner]);
}

async function testSpendingCheckupExperience({page,base,owner,actor,admin,today,engine,width,failRead}) {
  await mkdir('artifacts/household-checkup',{recursive:true});
  const totalCard=page.locator('section[aria-labelledby="checkup-total-heading"]'),expenses=page.locator('section[aria-labelledby="checkup-expenses"]');
  await visit(page,base+'/checkup?premium=true&category=vehicles');
  await page.getByRole('heading',{name:'Turn your saved expenses into a clearer plan',exact:true}).waitFor();
  assert.equal(await page.locator('#checkup-total-heading').count(),0);
  await page.getByRole('link',{name:'View my Free payment plan',exact:true}).click();await page.getByRole('heading',{name:'Payments to plan for',exact:true}).waitFor();
  await visit(page,base+'/demo');await page.getByRole('link',{name:'Explore Premium',exact:true}).click();
  await page.getByRole('heading',{name:'Your 30-Day Spending Checkup',exact:true}).waitFor();
  assert((await totalCard.textContent()).includes('₱13,648'));assert((await totalCard.textContent()).includes('₱4,700 of this total is estimated.'));
  await page.getByRole('link',{name:/^Vehicles/}).click();await page.waitForURL(url=>url.searchParams.get('category')==='vehicles');
  assert.equal(await expenses.locator('ol>li').count(),1);assert((await expenses.textContent()).includes('Family car: Toyota Vios'));
  await expenses.getByRole('link',{name:'Family car: Toyota Vios',exact:true}).click();await page.getByRole('heading',{name:'Family car: Toyota Vios',exact:true}).waitFor();
  await actor(owner,'select public.activate_installation_premium(true)');
  await visit(page,base+'/checkup');await page.getByRole('heading',{name:'Build a useful checkup',exact:true}).waitFor();
  assert.equal(await page.locator('#checkup-period-heading').count(),0);assert(!(await totalCard.textContent()).includes('₱0'));
  const saved=[],datePrefix=randomUUID().slice(0,24);
  const day=offset=>new Date(Date.parse(today+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10);
  for(let index=0;index<29;index++) {
    const item=randomUUID(),date=datePrefix+String(index).padStart(12,'0'),occurrence=randomUUID(),vehicle=index===28,amount=index===0?null:index===1?0:vehicle?900000:10000;
    await admin.query("insert into public.items(id,user_id,state,product_name,template_key,reminder_preset) values($1,$2,'saved',$3,$4,$5)",[item,owner,vehicle?'Checkup family car':'Checkup bill '+index,vehicle?'car':'other',vehicle?null:'electric-bill']);
    await admin.query("insert into public.important_dates(id,item_id,user_id,kind,label,payment_amount_minor,payment_amount_certainty) values($1,$2,$3,$4,'Expected cost',$5,'estimated')",[date,item,owner,vehicle?'service':'other',amount]);
    await admin.query('insert into public.date_occurrences(id,date_id,user_id,cycle,due_on) values($1,$2,$3,1,$4)',[occurrence,date,owner,vehicle?day(14):today]);
    saved.push(item);
  }
  await visit(page,base+'/dashboard');await page.getByRole('link',{name:'Open my checkup',exact:true}).click();
  await page.getByRole('heading',{name:'Highest-cost upcoming period',exact:true}).waitFor();
  assert((await totalCard.textContent()).includes('₱11,600'));assert((await totalCard.textContent()).includes('1 upcoming expense needs an amount'));
  assert.equal(await expenses.locator('ol>li').count(),25);
  await page.getByRole('link',{name:'View contributing expenses',exact:true}).click();await page.waitForURL(url=>url.searchParams.get('week')===day(14));
  assert.equal(await expenses.locator('ol>li').count(),1);assert((await expenses.textContent()).includes('Checkup family car'));assert((await totalCard.textContent()).includes('₱11,600'));
  await expenses.getByRole('link',{name:'Show all expenses',exact:true}).click();await page.getByRole('link',{name:/^Bills & utilities/}).click();
  await page.waitForURL(url=>url.searchParams.get('category')==='bills');assert.equal(await expenses.locator('ol>li').count(),25);
  const firstNames=await expenses.locator('ol strong').allTextContents();
  await expenses.getByRole('link',{name:'More expenses',exact:true}).click();await page.waitForURL(url=>url.searchParams.has('before')&&url.searchParams.get('category')==='bills');
  assert.equal(await expenses.locator('ol>li').count(),3);assert((await totalCard.textContent()).includes('₱11,600'));
  assert.equal(new Set([...firstNames,...await expenses.locator('ol strong').allTextContents()].filter(value=>value.startsWith('Checkup bill'))).size,28);
  await expenses.getByRole('link',{name:'First page',exact:true}).click();await page.waitForURL(url=>!url.searchParams.has('before')&&url.searchParams.get('category')==='bills');await expenses.locator('ol>li').nth(24).waitFor();assert.equal(await expenses.locator('ol>li').count(),25);
  await visit(page,base+'/checkup?week=2000-01-01&category=vehicles');
  await page.getByRole('heading',{name:'Highest-cost upcoming period',exact:true}).waitFor();assert.equal(await expenses.locator('ol>li').count(),1);
  await visit(page,base+'/checkup');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`artifacts/household-checkup/${engine.name()}-${width}-private.png`,fullPage:true});
  const before=(await admin.query('select to_jsonb(o) data from public.date_occurrences o where user_id=$1 order by id',[owner])).rows;
  failRead();await visit(page,base+'/checkup?category=vehicles');
  await page.getByRole('heading',{name:'We couldn’t load that right now.',exact:true}).waitFor();
  await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByRole('heading',{name:'Your 30-Day Spending Checkup',exact:true}).waitFor();
  assert.deepEqual((await admin.query('select to_jsonb(o) data from public.date_occurrences o where user_id=$1 order by id',[owner])).rows,before);
  // Normal client navigation after real edits must show a fresh Checkup.
  for(const [value,expected] of [['1000','₱12,600'],['','₱11,600']]) {
    await page.getByRole('link',{name:'Review amounts and payments',exact:true}).click();await page.getByRole('heading',{name:'Payments to plan for',exact:true}).waitFor();
    const bill=page.locator('li').filter({has:page.getByRole('link',{name:'Checkup bill 0',exact:true})});
    await bill.getByRole('button',{name:value?'Add amount':'Edit amount',exact:true}).click();
    await bill.getByLabel('Expected amount (PHP)').fill(value);await bill.getByLabel('This is an estimate').check();
    await bill.getByRole('button',{name:'Save expected amount',exact:true}).click();await bill.locator('form').waitFor({state:'hidden'});
    await settleActions(page);await page.getByRole('link',{name:'← Household overview',exact:true}).click();await page.getByRole('link',{name:'Open my checkup',exact:true}).click();
    await totalCard.locator('p').filter({hasText:expected}).first().waitFor();
  }
  await page.getByRole('link',{name:'Review amounts and payments',exact:true}).click();await page.getByRole('heading',{name:'Payments to plan for',exact:true}).waitFor();
  const paid=page.locator('li').filter({has:page.getByRole('link',{name:'Checkup bill 2',exact:true})});
  await paid.getByRole('button',{name:'Mark paid',exact:true}).click();await paid.getByRole('button',{name:'Confirm payment recorded',exact:true}).click();await paid.waitFor({state:'hidden'});
  await settleActions(page);await page.getByRole('link',{name:'← Household overview',exact:true}).click();await page.getByRole('link',{name:'Open my checkup',exact:true}).click();await totalCard.locator('p').filter({hasText:'₱11,500'}).first().waitFor();
  const activity=(await admin.query('select activity_type,amount_minor from public.item_activities where item_id=$1',[saved[2]])).rows;assert.equal(activity.length,1);assert.equal(activity[0].activity_type,'payment');assert.equal(Number(activity[0].amount_minor),10000);
  await admin.query("update private.household_premium_periods set starts_at=now()-interval '31 days',ends_at=now()-interval '1 day' where user_id=$1",[owner]);
  await visit(page,base+'/checkup');await page.getByRole('heading',{name:'Turn your saved expenses into a clearer plan',exact:true}).waitFor();
  await page.getByRole('link',{name:'View my Free payment plan',exact:true}).click();await page.getByRole('heading',{name:'Payments to plan for',exact:true}).waitFor();assert((await page.getByRole('region',{name:'Your Total Household Spending',exact:true}).textContent()).includes('₱11,500'));
  await admin.query('delete from public.items where id=any($1::uuid[])',[saved]);await admin.query('delete from private.household_premium_periods where user_id=$1',[owner]);
  console.log(`✓ Spending Checkup: Free gate, sample, low data, full-account totals, period/category navigation, record links, pagination, stale period, read retry, amount/payment refresh and expiry: ${engine.name()} ${width}`);
}

async function testHouseholdOutlookExperience({page,base,owner,actor,admin,today,engine,width,failRead}) {
  const output='artifacts/household-outlook';await mkdir(output,{recursive:true});
  const total=page.locator('section[aria-labelledby="outlook-total-heading"]'),comparison=page.locator('section[aria-labelledby="outlook-comparison-heading"]'),list=()=>page.locator('ol').last();
  await visit(page,base+'/planner?days=365&premium=true');await page.getByRole('heading',{name:'Your Household Outlook',exact:true}).waitFor();
  assert.equal(await total.count(),0);assert.equal(await comparison.count(),0);assert.equal(await page.getByRole('link',{name:'Next 30 days',exact:true}).getAttribute('aria-current'),'page');
  await actor(owner,'select public.activate_installation_premium(true)');await visit(page,base+'/planner?days=90');
  await page.getByRole('heading',{name:'Build your household outlook',exact:true}).waitFor();assert.equal(await comparison.count(),0);
  const saved=[],prefix=randomUUID().slice(0,24),day=n=>new Date(Date.parse(today+'T00:00:00Z')+n*86400000).toISOString().slice(0,10),carDay=day(60),carMonth=carDay.slice(0,7)+'-01',firstMonth=today.slice(0,7)+'-01';
  for(let i=0;i<29;i++) {
    const item=randomUUID(),date=prefix+String(i).padStart(12,'0'),occurrence=randomUUID(),car=i===28;
    await admin.query("insert into public.items(id,user_id,state,product_name,template_key,reminder_preset) values($1,$2,'saved',$3,$4,$5)",[item,owner,car?'Outlook family car':'Outlook bill '+i,car?'car':'other',car?null:'electric-bill']);
    await admin.query("insert into public.important_dates(id,item_id,user_id,kind,label,payment_amount_minor,payment_amount_certainty) values($1,$2,$3,$4,'Expected cost',$5,'estimated')",[date,item,owner,car?'service':'other',i===0?null:i===1?0:car?900000:10000]);
    await admin.query('insert into public.date_occurrences(id,date_id,user_id,cycle,due_on) values($1,$2,$3,1,$4)',[occurrence,date,owner,car?carDay:today]);saved.push(item);
  }
  await visit(page,base+'/planner?days=365');await total.getByText('₱11,600',{exact:true}).waitFor();assert.equal(await list().locator(':scope>li').count(),25);
  const highest=page.locator('section[aria-labelledby="outlook-highest-heading"]');assert((await highest.textContent()).includes('Outlook family car'));assert((await highest.textContent()).includes('₱9,000'));
  await comparison.getByLabel('First month',{exact:true}).selectOption(firstMonth);await comparison.getByLabel('Second month',{exact:true}).selectOption(carMonth);
  await comparison.getByRole('status').filter({hasText:'₱6,400 more'}).waitFor();
  if(today.slice(-2)!=='01')assert((await comparison.textContent()).includes('Partial month'));
  await comparison.getByLabel('Second month',{exact:true}).selectOption(firstMonth);await comparison.getByRole('status').filter({hasText:'Choose two different months.'}).waitFor();
  await comparison.getByLabel('Second month',{exact:true}).selectOption(carMonth);
  await highest.getByRole('link',{name:'Inspect this month',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForURL(url=>url.searchParams.get('month')===carMonth);
  const selected=page.locator('section[aria-labelledby="outlook-selected-heading"]');await selected.getByRole('heading',{name:'Largest recorded costs',exact:true}).waitFor();assert.equal(await list().locator(':scope>li').count(),1);assert((await total.textContent()).includes('₱11,600'));
  await selected.getByRole('link',{name:'Outlook family car',exact:true}).click();await page.getByRole('heading',{name:'Outlook family car',exact:true}).waitFor();
  await page.getByRole('button',{name:'Edit expected amount',exact:true}).click();await page.getByLabel('Expected amount (PHP)',{exact:true}).fill('8500');await page.getByLabel('This is an estimate',{exact:true}).check();await page.getByRole('button',{name:'Save expected amount',exact:true}).click();await page.getByRole('button',{name:'Edit expected amount',exact:true}).waitFor();await page.locator('p').filter({hasText:/^Expected amount: ₱8,500/}).waitFor();await settleActions(page);
  const plannerLink=page.getByRole('link',{name:'Household planner',exact:true});
  if(width<700){await page.getByRole('button',{name:'Open navigation',exact:true}).click();}
  await plannerLink.click();await page.getByRole('link',{name:/^Year ahead/}).click();await total.getByText('₱11,100',{exact:true}).waitFor();
  await page.getByRole('link',{name:'More dates',exact:true}).click();await page.waitForURL(url=>url.searchParams.has('before'));assert((await total.textContent()).includes('₱11,100'));assert(await list().getByRole('link',{name:'Outlook family car',exact:true}).count()>0);
  await page.getByRole('link',{name:'First page',exact:true}).click();await page.waitForURL(url=>!url.searchParams.has('before'));await list().locator(':scope>li').nth(24).waitFor();
  await page.getByRole('link',{name:/^Next 3 months/}).click();await page.waitForURL(url=>url.searchParams.get('days')==='90');await total.getByText('₱11,100',{exact:true}).waitFor();
  await visit(page,base+'/planner?days=90&month=2000-01-01');await total.getByText('₱11,100',{exact:true}).waitFor();assert.equal(await selected.count(),0);
  const before=(await admin.query('select to_jsonb(o) data from public.date_occurrences o where user_id=$1 order by id',[owner])).rows;
  failRead();await visit(page,base+'/planner?days=365');await page.getByRole('heading',{name:'We couldn’t load that right now.',exact:true}).waitFor();await page.getByRole('button',{name:'Try again',exact:true}).click();await total.getByText('₱11,100',{exact:true}).waitFor();
  assert.deepEqual((await admin.query('select to_jsonb(o) data from public.date_occurrences o where user_id=$1 order by id',[owner])).rows,before);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${output}/${engine.name()}-${width}-private.png`,fullPage:true});
  await admin.query("update private.household_premium_periods set starts_at=now()-interval '31 days',ends_at=now()-interval '1 day' where user_id=$1",[owner]);await visit(page,base+'/planner?days=365');assert.equal(await total.count(),0);assert.equal(await comparison.count(),0);assert.equal(await page.getByRole('link',{name:'Next 30 days',exact:true}).getAttribute('aria-current'),'page');
  const free=(await actor(owner,'select public.household_payment_plan() data')).rows[0].data;assert.equal(BigInt(free.confirmed_minor)+BigInt(free.estimated_minor)+BigInt(free.unverified_minor),260000n);
  await admin.query('delete from public.items where id=any($1::uuid[])',[saved]);await admin.query('delete from private.household_premium_periods where user_id=$1',[owner]);
  console.log(`✓ Household Outlook: Free gate, low data, full totals/contributors, comparison, coverage, record links, pagination, amount refresh, stale month, retry and expiry: ${engine.name()} ${width}`);
}

async function testInsightsExperience({page,base,owner,actor,admin,today,engine,width,failSave}) {
  await mkdir('artifacts/household-insights',{recursive:true});
  await visit(page,base+'/demo');
  await page.getByRole('heading',{name:'This week at home',exact:true}).waitFor();
  const summary=page.locator('section[aria-labelledby="payment-summary-heading"]');
  assert(!(await summary.textContent()).includes('Unverified'));
  assert((await summary.textContent()).includes('₱13,648'));
  await summary.getByRole('heading',{name:'Your Total Household Spending',exact:true}).waitFor();
  assert((await summary.textContent()).includes('₱4,700 of this total is estimated.'));
  await summary.getByRole('link',{name:'Add missing amounts'}).click();
  await page.getByRole('heading',{name:'Payments to plan for',exact:true}).waitFor();
  await page.getByRole('button',{name:'Edit amount',exact:true}).first().click();
  let form=page.locator('form').filter({has:page.getByRole('heading',{name:'Expected amount for this date',exact:true})});
  await form.getByLabel('This is an estimate').check();
  await form.getByLabel('Expected amount (PHP)').fill('2000');
  await form.getByRole('button',{name:'Review sample amount',exact:true}).click();
  await page.getByRole('status').getByText('Sample amount shown here. No changes are saved.').waitFor();
  await page.waitForURL(url=>!url.searchParams.has('action'));
  await page.waitForLoadState('networkidle');
  await visit(page,base+'/demo/items/99999999-9999-4999-8999-999999999999');
  const ready=page.locator('section[aria-labelledby="readiness-heading"]');
  const service=ready.locator('li').filter({has:page.getByText('Service history',{exact:true})});
  await service.getByRole('button',{name:'Checklist options'}).click();
  await service.getByLabel('How should Keeply treat this detail?').selectOption('not_applicable');
  await service.getByRole('button',{name:'Preview checklist change'}).click();
  await service.getByText('Not applicable',{exact:true}).waitFor();
  await visit(page,base+'/demo/items?q=Sample%20washing%20machine%20receipt.svg');
  await page.getByRole('heading',{name:'Washing machine: receipt & warranty',exact:true}).waitFor();
  assert.equal(await page.locator('.purchase-grid h3').count(),1);
  await visit(page,base+'/demo');await page.getByRole('heading',{name:'This week at home',exact:true}).waitFor();
  await page.screenshot({path:`artifacts/household-insights/${engine.name()}-${width}-demo.png`,fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  // A name-only bill proves preference success, cancellation, retry and later data completion.
  await admin.query('delete from private.rate_limit_buckets where user_id=$1',[owner]);
  const item=randomUUID();await actor(owner,"select public.create_item_draft($1,'other')",[item]);
  await actor(owner,'select public.save_item_with_date($1,1,$2,$3,null,$4)',[item,'Readiness bill','Household search needle','electric-bill']);
  await visit(page,base+'/items/'+item);await page.getByRole('heading',{name:'Readiness bill',exact:true}).waitFor();
  const key=page.locator('section[aria-labelledby="readiness-heading"] li').filter({has:page.getByText('Important date',{exact:true})});
  await key.getByRole('button',{name:'Checklist options'}).click();await key.getByLabel('How should Keeply treat this detail?').selectOption('not_applicable');await key.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal((await admin.query('select count(*)::int n from public.item_readiness_preferences where item_id=$1',[item])).rows[0].n,0);
  await key.getByRole('button',{name:'Checklist options'}).click();await key.getByLabel('How should Keeply treat this detail?').selectOption('unknown');
  failSave();await key.getByRole('button',{name:'Save checklist choice',exact:true}).click();await key.getByRole('alert').waitFor();assert.equal(await key.getByLabel('How should Keeply treat this detail?').inputValue(),'unknown');
  await key.getByRole('button',{name:'Save checklist choice',exact:true}).click();await key.getByText('Not known yet',{exact:true}).waitFor();
  assert.equal((await admin.query('select state from public.item_readiness_preferences where item_id=$1',[item])).rows[0].state,'unknown');
  await settleActions(page);await page.waitForLoadState('networkidle');
  await page.reload();await key.getByText('Not known yet',{exact:true}).waitFor();
  await key.getByRole('button',{name:'Add a date',exact:true}).click();
  form=page.locator('form').filter({has:page.getByRole('heading',{name:'Add an important date',exact:true})});
  await form.getByLabel('Next payment',{exact:true}).fill(today);await form.getByLabel('Next payment',{exact:true}).press('Tab');
  await form.getByLabel('Amount per payment').pressSequentially('1500',{delay:30});
  assert.equal(await form.getByLabel('This is an estimate').isChecked(),false);
  await form.getByLabel('Send me alerts for this date').uncheck();
  await form.getByRole('button',{name:'Save date',exact:true}).click();await key.getByText('Saved',{exact:true}).waitFor();
  await page.waitForLoadState('networkidle');
  const date=(await actor(owner,'select public.item_detail($1) data',[item])).rows[0].data.dates[0],occurrence=date.occurrences.find(o=>o.status==='open');
  await visit(page,base+'/items/payments');await page.getByRole('heading',{name:'Payments to plan for',exact:true}).waitFor();
  const payment=page.locator('li').filter({has:page.getByRole('link',{name:'Readiness bill',exact:true})});
  await payment.getByRole('button',{name:'Edit amount',exact:true}).click();
  form=page.locator('form').filter({has:page.getByRole('heading',{name:'Expected amount for this date',exact:true})});
  await form.getByLabel('Expected amount (PHP)').fill('1300');await form.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.waitForURL(url=>!url.searchParams.has('action'));
  await page.waitForLoadState('networkidle');
  assert.equal((await admin.query('select amount_certainty from public.date_occurrences where id=$1',[occurrence.id])).rows[0].amount_certainty,null);
  await payment.getByRole('button',{name:'Edit amount',exact:true}).click();await form.getByLabel('This is an estimate').uncheck();await form.getByLabel('Expected amount (PHP)').fill('bad');
  await form.getByRole('button',{name:'Save expected amount',exact:true}).click();await form.getByRole('alert').waitFor();
  await form.getByLabel('Expected amount (PHP)').fill('1200.50');failSave();await form.getByRole('button',{name:'Save expected amount',exact:true}).click();await form.getByRole('alert').waitFor();
  assert.equal(await form.getByLabel('Expected amount (PHP)').inputValue(),'1200.50');
  await form.getByRole('button',{name:'Save expected amount',exact:true}).click();await form.waitFor({state:'hidden'});
  const stored=(await admin.query('select expected_amount_minor,amount_certainty,status from public.date_occurrences where id=$1',[occurrence.id])).rows[0];
  assert.equal(Number(stored.expected_amount_minor),120050);assert.equal(stored.amount_certainty,'confirmed');assert.equal(stored.status,'open');
  await page.waitForLoadState('networkidle');
  await visit(page,base+'/dashboard');await page.getByRole('heading',{name:'This week at home',exact:true}).waitFor();
  assert((await page.locator('section[aria-labelledby="payment-summary-heading"]').textContent()).includes('₱2,400.50'));
  await page.screenshot({path:`artifacts/household-insights/${engine.name()}-${width}-private.png`,fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await visit(page,base+'/items/'+item+'?date='+date.id+'&action=amount');
  await form.getByRole('button',{name:'Reset to schedule amount',exact:true}).click();
  await form.waitFor({state:'hidden'});
  await page.waitForURL(url=>!url.searchParams.has('action'));await page.waitForLoadState('networkidle');
  const reset=(await admin.query('select amount_certainty,expected_amount_minor from public.date_occurrences where id=$1',[occurrence.id])).rows[0];assert.equal(reset.amount_certainty,null);assert.equal(reset.expected_amount_minor,null);
  await visit(page,base+'/items?q=Household%20search%20needle');await page.getByRole('heading',{name:'Readiness bill',exact:true}).waitFor();assert.equal(await page.locator('.purchase-grid h3').count(),1);
}


async function testActionEditing({page,base,owner,actor,admin,today,engine,width,failSave}) {
  const item=randomUUID(), due=new Date(Date.parse(today+'T00:00:00Z')+2*86400000).toISOString().slice(0,10);
  await admin.query('delete from private.rate_limit_buckets where user_id=$1',[owner]);
  await actor(owner,"select public.create_item_draft($1,'car')",[item]);
  await actor(owner,'select public.save_item_with_date($1,1,$2,$3,$4)',[item,'Kia Stonic','',{kind:'service',label:'Maintenance',due_on:due,reminders_enabled:false,offsets:[{unit:'days',value:2},{unit:'days',value:0}],interval_months:null}]);
  const registrationId=randomUUID(),registrationDue=new Date(Date.parse(today+'T00:00:00Z')+365*86400000).toISOString().slice(0,10);
  await actor(owner,'select public.save_important_date($1,$2,0,$3)',[registrationId,item,{kind:'registration',label:'Registration',due_on:registrationDue,reminders_enabled:false,offsets:[],interval_months:null,payment_amount_minor:250000,payment_amount_certainty:'estimated'}]);
  let data=(await actor(owner,'select public.item_detail($1) data',[item])).rows[0].data;
  const date=data.dates.find(date=>date.kind==='service');
  const before=(await actor(owner,'select public.household_insights() data')).rows[0].data.week.payment_count;
  await visit(page,base+'/items/'+item);
  const readiness=page.locator('section[aria-labelledby="readiness-heading"]');
  const registration=readiness.locator('li').filter({has:page.getByText('Registration date',{exact:true})});
  const savedDate=new Intl.DateTimeFormat('en-PH',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(registrationDue+'T00:00:00Z'));
  await registration.getByText(savedDate,{exact:true}).waitFor();
  await registration.getByText('Estimated cost: ₱2,500',{exact:true}).waitFor();
  await readiness.screenshot({path:`artifacts/household-insights/${engine.name()}-${width}-saved-details.png`});
  await page.evaluate(()=>{
    window.guidedScrolls=[];
    const original=Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView=function(options){window.guidedScrolls.push({id:this.id,options});return original.call(this,options);};
  });
  const registrationCard=page.locator('#date-'+registrationId);
  await registration.getByRole('link',{name:'Review or update date',exact:true}).click();
  await page.waitForFunction(id=>document.activeElement?.id==='date-'+id&&document.activeElement.getAnimations().some(animation=>animation.id==='record-guidance'),registrationId);
  assert.equal(await page.evaluate(()=>window.guidedScrolls.at(-1).options.behavior),'smooth');
  await page.waitForFunction(id=>{const top=document.getElementById('date-'+id).getBoundingClientRect().top;return top>=20&&top<100;},registrationId);
  await registrationCard.screenshot({path:`artifacts/household-insights/${engine.name()}-${width}-guided-record.png`});
  await page.emulateMedia({reducedMotion:'reduce'});
  await registration.getByRole('link',{name:'Review or update date',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.guidedScrolls.at(-1).options.behavior),'instant');
  assert.equal(await registrationCard.evaluate(element=>document.activeElement===element),true);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await readiness.getByRole('button',{name:'Record a completed service',exact:true}).click();
  const history=page.locator('section[aria-labelledby="activity-history-heading"]');
  await history.getByLabel('What happened?').fill('Previous maintenance');
  await history.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal((await admin.query('select count(*)::int n from public.item_activities where item_id=$1',[item])).rows[0].n,0);
  const checklist=readiness.locator('li').filter({has:page.getByText('Service history',{exact:true})});
  await checklist.getByRole('button',{name:'Checklist options',exact:true}).click();
  await checklist.getByLabel('How should Keeply treat this detail?').selectOption('not_applicable');
  await readiness.screenshot({path:`artifacts/household-insights/${engine.name()}-${width}-checklist.png`});
  await checklist.getByRole('button',{name:'Cancel',exact:true}).click();
  const card=page.locator('#date-'+date.id);
  await card.getByRole('button',{name:'Edit date & schedule',exact:true}).click();
  const form=card.locator('form').filter({has:page.getByRole('heading',{name:'Edit date & schedule',exact:true})});
  await form.getByLabel('Expected cost (₱, optional)').fill('2500');
  await form.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal((await admin.query('select payment_amount_minor from public.important_dates where id=$1',[date.id])).rows[0].payment_amount_minor,null);
  await card.getByRole('button',{name:'Edit date & schedule',exact:true}).click();
  const timing=form.getByLabel('Early alert 1',{exact:true});
  assert.equal(await timing.inputValue(),'2');
  await timing.fill('');
  assert.equal(await timing.inputValue(),'0');
  assert.equal(await form.locator('.offset-row').count(),1);
  await timing.press('End');await timing.press('2');
  assert.equal(await timing.inputValue(),'2');
  await timing.fill('02');assert.equal(await timing.inputValue(),'2');
  const dueDateCheckbox=form.getByLabel('Alert me on the due date');
  assert.equal(await dueDateCheckbox.isChecked(),true);
  await dueDateCheckbox.uncheck();
  await timing.fill('');
  assert.equal(await timing.inputValue(),'0');
  assert.equal(await dueDateCheckbox.isChecked(),false);
  assert.equal(await form.locator('.offset-row').count(),1);
  await timing.press('End');await timing.press('2');
  assert.equal(await form.locator('.offset-row').count(),1);
  assert.equal(await timing.inputValue(),'2');
  assert.equal(await form.locator('.alert-timings').textContent(),'2 days before');
  await dueDateCheckbox.check();
  assert.equal(await form.locator('.offset-row').count(),1);
  await form.getByRole('button',{name:'Remove',exact:true}).click();
  assert.equal(await form.locator('.offset-row').count(),0);
  assert.equal(await form.locator('.alert-timings').textContent(),'On the due date');
  await form.getByRole('button',{name:'Add an advance reminder',exact:true}).click();
  await timing.fill('2');
  await form.locator('details').filter({has:page.locator('summary').getByText('Alert timings',{exact:true})}).screenshot({path:`artifacts/household-insights/${engine.name()}-${width}-timings.png`});

  await form.getByLabel('Expected cost (₱, optional)').fill('-1');
  assert.equal(await form.getByLabel('Expected cost (₱, optional)').evaluate(input=>input.checkValidity()),false);
  await form.getByLabel('Expected cost (₱, optional)').fill('2500');
  await form.getByLabel('This is an estimate').check();
  failSave();await form.getByRole('button',{name:'Save date',exact:true}).click();await form.getByRole('alert').waitFor();
  assert.equal(await timing.inputValue(),'2');
  assert.equal(await form.getByLabel('Expected cost (₱, optional)').inputValue(),'2500');
  await form.getByRole('button',{name:'Save date',exact:true}).click();await form.waitFor({state:'hidden'});await page.waitForLoadState('networkidle');
  await page.reload();await card.getByText('Schedule amount:',{exact:false}).waitFor();assert((await card.textContent()).includes('₱2,500'));
  data=(await actor(owner,'select public.item_detail($1) data',[item])).rows[0].data;
  assert.equal(data.dates.find(row=>row.id===date.id).payment_amount_minor,250000);
  assert.deepEqual(data.dates.find(row=>row.id===date.id).offsets.map(o=>o.value).sort((a,b)=>a-b),[0,2]);
  await card.getByRole('button',{name:'Edit date & schedule',exact:true}).click();
  await dueDateCheckbox.uncheck();
  await form.getByRole('button',{name:'Save date',exact:true}).click();await form.waitFor({state:'hidden'});await page.waitForLoadState('networkidle');
  data=(await actor(owner,'select public.item_detail($1) data',[item])).rows[0].data;
  assert.deepEqual(data.dates.find(row=>row.id===date.id).offsets.map(o=>o.value),[2]);
  await card.getByRole('button',{name:'Edit date & schedule',exact:true}).click();
  await dueDateCheckbox.check();
  assert.equal(await form.locator('.offset-row').count(),1);
  await form.getByRole('button',{name:'Save date',exact:true}).click();await form.waitFor({state:'hidden'});await page.waitForLoadState('networkidle');

  const insights=(await actor(owner,'select public.household_insights() data')).rows[0].data;
  assert.equal(insights.week.payment_count,before+1);
  assert(insights.payments.rows.some(row=>row.item_id===item&&row.amount_minor===250000));
  await visit(page,base+'/dashboard');
  await page.getByRole('button',{name:/Kia Stonic.*View reminder details/}).click();
  const dialog=page.getByRole('dialog').filter({has:page.getByRole('button',{name:'Close reminder details'})});
  await dialog.getByRole('heading',{name:'Maintenance',exact:true}).waitFor();
  assert.equal(await dialog.locator('h2 svg').count(),1);
  await page.screenshot({path:`artifacts/household-insights/${engine.name()}-${width}-action.png`});
  await dialog.getByRole('button',{name:'Close reminder details'}).click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
}

async function testServicePayments({page,base,owner,actor,admin,today,engine,width,failSave}) {
  await mkdir('artifacts/household-insights',{recursive:true});
  const item=randomUUID(),due=new Date(Date.parse(today+'T00:00:00Z')+2*86400000).toISOString().slice(0,10);
  await actor(owner,"select public.create_item_draft($1,'car')",[item]);
  await actor(owner,'select public.save_item_with_date($1,1,$2,$3,$4)',[item,'Kia Stonic maintenance payment','',{kind:'service',label:'Maintenance',due_on:due,reminders_enabled:false,offsets:[],interval_months:null,payment_amount_minor:250000,payment_amount_certainty:'estimated'}]);
  const date=(await actor(owner,'select public.item_detail($1) data',[item])).rows[0].data.dates[0];
  // Maintenance costs can be paid whether estimated or exact, with actual service history.
  await admin.query('delete from private.rate_limit_buckets where user_id=$1',[owner]);
  await visit(page,base+'/items/payments');
  const payment=page.getByRole('listitem').filter({has:page.getByRole('link',{name:'Kia Stonic maintenance payment',exact:true})});
  await payment.getByRole('button',{name:'Mark paid',exact:true}).click();
  const paidForm=payment.locator('form');
  await paidForm.getByText(/Your saved cost of ₱2,500 was an estimate/).waitFor();
  assert.equal(await paidForm.getByLabel('Amount paid (optional, PHP)').inputValue(),'2500');
  await payment.screenshot({path:`artifacts/household-insights/${engine.name()}-${width}-service-payment.png`});
  await paidForm.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal((await admin.query('select count(*)::int n from public.item_activities where item_id=$1',[item])).rows[0].n,0);
  await payment.getByRole('button',{name:'Edit amount',exact:true}).click();
  await payment.getByLabel('This is an estimate').uncheck();
  await payment.getByRole('button',{name:'Save expected amount',exact:true}).click();
  await paidForm.waitFor({state:'hidden'});await settleActions(page);
  await payment.getByRole('button',{name:'Mark paid',exact:true}).click();
  assert.equal(await paidForm.getByText(/was an estimate/).count(),0);
  await paidForm.getByLabel('Amount paid (optional, PHP)').fill('invalid');
  await paidForm.getByRole('button',{name:'Confirm service and payment',exact:true}).click();
  await paidForm.getByRole('alert').waitFor();
  await paidForm.getByLabel('Amount paid (optional, PHP)').fill('1400');
  const nextService=new Date(Date.parse(today+'T00:00:00Z')+60*86400000).toISOString().slice(0,10);
  await paidForm.getByLabel('Next service date (optional)').fill(nextService);
  failSave();await paidForm.getByRole('button',{name:'Confirm service and payment',exact:true}).click();
  await paidForm.getByRole('alert').waitFor();
  assert.equal(await paidForm.getByLabel('Amount paid (optional, PHP)').inputValue(),'1400');
  await paidForm.getByRole('button',{name:'Confirm service and payment',exact:true}).click();
  await payment.waitFor({state:'hidden'});await settleActions(page);
  const activities=(await admin.query('select activity_type,amount_minor from public.item_activities where item_id=$1',[item])).rows;
  assert.equal(activities.length,1);assert.equal(activities[0].activity_type,'service');assert.equal(Number(activities[0].amount_minor),140000);
  assert.equal((await admin.query("select due_on::text from public.date_occurrences where date_id=$1 and status='open'",[date.id])).rows[0].due_on,nextService);
  await page.reload();await page.waitForLoadState('networkidle');assert.equal(await payment.count(),0);
  // Both legacy service intervals and completion-based recurring services keep their next dates.
  for(const schedule of ['interval','fixed','from_completion']) {
    const recurring=schedule!=='interval',serviceId=randomUUID(),name=schedule+' paid service';
    await actor(owner,"select public.create_item_draft($1,'aircon')",[serviceId]);
    await actor(owner,'select public.save_item_with_date($1,1,$2,$3,$4)',[serviceId,name,'',{kind:'service',label:'Cleaning',due_on:due,reminders_enabled:false,offsets:[],interval_months:recurring?null:3,recurrence_months:recurring?3:null,recurrence_policy:'from_completion',payment_amount_minor:0,payment_amount_certainty:'estimated'}]);
    if(schedule==='from_completion')await admin.query("update public.important_dates set recurrence_policy='from_completion' where item_id=$1",[serviceId]);
    await visit(page,base+'/items/payments');
    const servicePayment=page.getByRole('listitem').filter({has:page.getByRole('link',{name,exact:true})});
    await servicePayment.getByRole('button',{name:'Mark paid',exact:true}).click();
    await servicePayment.getByText(/Your saved cost of ₱0 was an estimate/).waitFor();
    await servicePayment.getByRole('button',{name:'Confirm service and payment',exact:true}).click();
    await servicePayment.waitFor({state:'hidden'});await settleActions(page);
    const history=(await admin.query('select activity_type,amount_minor from public.item_activities where item_id=$1',[serviceId])).rows;
    assert.equal(history.length,1);assert.equal(history[0].activity_type,'service');assert.equal(Number(history[0].amount_minor),0);
    const next=(await admin.query("select o.due_on::text from public.date_occurrences o join public.important_dates d on d.id=o.date_id where d.item_id=$1 and o.status='open'",[serviceId])).rows[0].due_on;
    const expected=(await admin.query("select ($1::date+interval '3 months')::date::text due",[schedule==='fixed'?due:today])).rows[0].due;
    assert.equal(next,expected);
  }
  console.log('✓ Maintenance payments, cost confirmation, cancellation, retry, service history and schedules: '+engine.name()+' '+width);
}

async function testPremiumExperience({page,context,base,owner,actor,admin,engine,width,failSave}) {
 const output='artifacts/household-premium';await mkdir(output,{recursive:true});
 await visit(page,base+'/planner?days=365');
 await page.getByRole('heading',{name:'Your Household Outlook',exact:true}).waitFor();
 assert.equal(await page.getByRole('link',{name:'Next 30 days',exact:true}).getAttribute('aria-current'),'page');
 await page.getByRole('link',{name:'Show me how to install',exact:true}).waitFor();
 await assert.rejects(actor(owner,'select public.household_planner(365)'),/PREMIUM_REQUIRED/);
 await visit(page,base+'/settings/alerts');
 await page.getByRole('button',{name:'Show me how',exact:true}).click();
 const guide=page.getByRole('dialog');await guide.getByRole('button',{name:/Android/}).click();
 // Keyboard activation keeps each step independent of the mobile sticky footer's scroll position.
 for(let n=0;n<3;n++){const next=guide.getByRole('button',{name:'Next',exact:true});await next.focus();await next.press('Enter');await page.waitForFunction(value=>document.querySelector('dialog progress')?.value===value,n+2);}
 await guide.getByText(/30-day Premium gift activates automatically/).waitFor();await guide.getByRole('button',{name:'Got it',exact:true}).click();
 assert.equal((await admin.query('select count(*)::int n from private.household_premium_periods where user_id=$1',[owner])).rows[0].n,0);
 // Simulated standalone detection. Native installation still requires physical-device acceptance.
 await context.addInitScript(()=>{
  const original=window.matchMedia.bind(window);
  window.matchMedia=query=>{const media=original(query);if(query==='(display-mode: standalone)')Object.defineProperty(media,'matches',{value:true});return media;};
 });
 failSave();await visit(page,base+'/dashboard');
 await page.getByRole('button',{name:'Retry gift activation',exact:true}).waitFor();await page.getByRole('button',{name:'Retry gift activation',exact:true}).click();
 const gift=page.getByRole('dialog',{name:/Hooray!/});await gift.waitFor();
 await gift.getByText('No card. No payment details. No automatic charges.',{exact:true}).waitFor();
 assert.equal((await admin.query('select count(*)::int n from private.household_premium_periods where user_id=$1',[owner])).rows[0].n,1);
 assert.equal((await admin.query('select count(*)::int n from private.push_subscriptions where user_id=$1',[owner])).rows[0].n,0);
 await gift.screenshot({path:`${output}/${engine.name()}-${width}-gift.png`});
 const acknowledgement=page.waitForResponse(response=>response.url()===base+'/dashboard'&&response.request().method()==='POST');
 await page.keyboard.press('Escape');await gift.waitFor({state:'hidden'});await acknowledgement;await settleActions(page);await page.waitForLoadState('networkidle');
 await visit(page,base+'/planner?days=365');await page.getByRole('heading',{name:'Your Household Outlook',exact:true}).waitFor();
 assert.equal(await page.getByRole('link',{name:/^Year ahead/}).getAttribute('aria-current'),'page');assert.equal(await gift.count(),0);
 assert.equal((await actor(owner,'select public.activate_installation_premium(true) data')).rows[0].data.celebrate,false);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`${output}/${engine.name()}-${width}-private-planner.png`,fullPage:true});
 await visit(page,base+'/demo/planner?days=365');
 const months=page.locator('[aria-label="Monthly household costs"]');const old=await months.innerText();
 await page.getByRole('button',{name:'Change amount',exact:true}).first().click();
 const form=page.locator('form').filter({has:page.getByLabel('Sample expected amount (₱)')});
 await form.getByLabel('Sample expected amount (₱)').fill('12345.67');await form.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await months.innerText(),old);
 await page.getByRole('button',{name:'Change amount',exact:true}).first().click();await form.getByLabel('Sample expected amount (₱)').fill('invalid');await form.getByRole('button',{name:'Update sample plan',exact:true}).click();await form.getByRole('alert').waitFor();
 await form.getByLabel('Sample expected amount (₱)').fill('12345.67');await form.getByRole('button',{name:'Update sample plan',exact:true}).click();
 await page.getByText('Sample amount updated. Monthly totals have changed. Nothing is saved.',{exact:true}).waitFor();assert.notEqual(await months.innerText(),old);
 await months.getByRole('link').first().click();await page.waitForLoadState('networkidle');assert(await page.locator('ol').last().getByText('₱12,345.67',{exact:true}).count()>0);
 await page.screenshot({path:`${output}/${engine.name()}-${width}-demo-planner.png`,fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await admin.query("update private.household_premium_periods set starts_at=now()-interval '31 days',ends_at=now()-interval '1 day' where user_id=$1",[owner]);
 await visit(page,base+'/planner?days=365');assert.equal(await page.getByRole('link',{name:'Next 30 days',exact:true}).getAttribute('aria-current'),'page');
 await page.getByRole('link',{name:'See Premium plans',exact:true}).click();await page.getByRole('heading',{name:'Ease into the months ahead.',exact:true}).waitFor();
 assert(await page.getByRole('button',{name:'Choose 30 days · ₱59',exact:true}).isDisabled());
 assert.equal((await admin.query('select count(*)::int n from private.household_premium_periods where user_id=$1',[owner])).rows[0].n,1);
 console.log(`✓ Premium trial, modal, expiry and interactive planner: ${engine.name()} ${width}`);
}
