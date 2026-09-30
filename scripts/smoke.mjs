import assert from 'node:assert/strict';
const base = process.env.SMOKE_URL || 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Smoke checks are restricted to a local development/test server.');
for (const path of ['/', '/demo', '/demo/items', '/demo/items/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '/demo/add/passport', '/loan-payment-reminder', '/demo/add/other?preset=personal-loan', '/demo/add/other?preset=credit-card-installment', '/warranty-tracker', '/vehicle-registration-reminder', '/document-expiry-tracker', '/demo/purchases', '/demo/purchases/new', '/demo/purchases/11111111-1111-4111-8111-111111111111', '/demo/settings', '/demo/settings/billing', '/login', '/pricing', '/privacy', '/terms']) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  const body = await response.text();
  assert.ok(!body.includes('Application error: a server-side exception'), path + ' rendered an error');
  assert.ok(response.headers.get('content-security-policy')?.includes("object-src 'none'"), path + ' CSP');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  console.log('✓ ' + path);
}
for (const path of ['/dashboard', '/items', '/settings/billing']) {
  const response = await fetch(base + path, { redirect: 'manual' });
  assert.ok([303, 307, 308].includes(response.status), path);
  assert.ok(response.headers.get('location')?.startsWith('/login'), path);
  console.log('✓ signed-out guard ' + path);
}
for (const name of ['maintenance', 'notifications']) {
  const response = await fetch(base + '/api/cron/' + name, { method: 'POST' });
  assert.equal(response.status, 401);
}
const forged = await fetch(base + '/api/documents/11111111-1111-4111-8111-111111111111/finalize', { method: 'POST', headers: { origin: 'https://untrusted.example' } });
assert.equal(forged.status, 403);
console.log('✓ cron authorization and upload origin checks');
