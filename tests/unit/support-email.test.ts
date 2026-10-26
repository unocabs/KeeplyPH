import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ get: vi.fn(), send: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ adminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock('resend', async importOriginal => {
  const actual = await importOriginal<typeof import('resend')>();
  return { Resend: class {
    webhooks = new actual.Resend('test-key').webhooks;
    emails = { receiving: { get: mocks.get }, send: mocks.send };
  } };
});

import { POST } from '@/app/api/webhooks/resend/route';

const secretBytes = Buffer.from('support-email-test-signing-secret');
const secret = 'whsec_' + secretBytes.toString('base64');
const email = {
  id: 'incoming-1', from: 'Household <sender@example.com>', to: ['support@keeplyph.com'],
  cc: [], bcc: [], received_for: ['support@keeplyph.com'], reply_to: null,
  subject: 'A useful suggestion', raw: { download_url: 'https://example.com/signed-message' },
};
const mime = [
  'From: Household <sender@example.com>', 'To: support@keeplyph.com',
  'Subject: A useful suggestion', 'MIME-Version: 1.0',
  'Content-Type: multipart/mixed; boundary="test-boundary"', '',
  '--test-boundary', 'Content-Type: text/html; charset=utf-8', '',
  '<p>Please check this <img src="cid:proof-image"></p>',
  '--test-boundary', 'Content-Type: image/png',
  'Content-Disposition: inline; filename="proof.png"',
  'Content-ID: <proof-image>', 'Content-Transfer-Encoding: base64', '',
  'cHJvb2Y=', '--test-boundary--', '',
].join('\r\n');

function request(type = 'email.received', valid = true) {
  const body = JSON.stringify({ type, data: { email_id: email.id } });
  const id = 'msg_support_test', timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', secretBytes).update(`${id}.${timestamp}.${body}`).digest('base64');
  return new Request('https://www.keeplyph.com/api/webhooks/resend', {
    method: 'POST', body, headers: {
      'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': valid ? 'v1,' + signature : 'v1,invalid',
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('RESEND_API_KEY', 'test-key');
  vi.stubEnv('RESEND_WEBHOOK_SECRET', secret);
  vi.stubEnv('SUPPORT_EMAIL', 'support@keeplyph.com');
  vi.stubEnv('SUPPORT_FORWARD_TO', 'operator@example.com');
  vi.stubEnv('EMAIL_FROM', 'Keeply <reminders@mail.keeplyph.com>');
  mocks.get.mockResolvedValue({ data: email, error: null });
  mocks.send.mockResolvedValue({ data: { id: 'forwarded-1' }, error: null });
  mocks.rpc.mockResolvedValue({ error: null });
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(mime)));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('signed support email forwarding', () => {
  it('rejects an invalid signature before retrieving or forwarding mail', async () => {
    expect((await POST(request('email.received', false))).status).toBe(400);
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('forwards content, inline attachments and the sender reply address to the private destination', async () => {
    const response = await POST(request());
    expect(await response.json()).toEqual({ forwarded: true });
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      from: 'Keeply <reminders@mail.keeplyph.com>', to: 'operator@example.com',
      replyTo: email.from, subject: '[Keeply feedback] A useful suggestion',
      html: '<p>Please check this <img src="cid:proof-image"></p>\n',
      attachments: [{ filename: 'proof.png', content: 'cHJvb2Y=', contentType: 'image/png', contentId: 'proof-image' }],
    }), { idempotencyKey: 'keeply-support/incoming-1' });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('preserves an explicit Reply-To address and plain text content', async () => {
    mocks.get.mockResolvedValue({ data: { ...email, reply_to: ['replies@example.com'] }, error: null });
    vi.mocked(fetch).mockResolvedValue(new Response('Content-Type: text/plain\r\n\r\nMy suggestion'));
    expect((await POST(request())).status).toBe(200);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      replyTo: ['replies@example.com'], text: 'My suggestion\n', html: undefined, attachments: [],
    }), expect.anything());
  });

  it('uses the SMTP recipient for Bcc delivery and ignores unrelated recipients', async () => {
    mocks.get.mockResolvedValueOnce({ data: { ...email, to: [], received_for: ['SUPPORT@keeplyph.com'] }, error: null });
    expect(await (await POST(request())).json()).toEqual({ forwarded: true });
    mocks.send.mockClear();
    mocks.get.mockResolvedValueOnce({ data: { ...email, received_for: ['other@keeplyph.com'] }, error: null });
    expect(await (await POST(request())).json()).toEqual({ ignored: true });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('uses the same payload and idempotency key when download URLs change on retry', async () => {
    await POST(request());
    mocks.get.mockResolvedValueOnce({ data: { ...email, raw: { download_url: 'https://example.com/new-signed-url' } }, error: null });
    await POST(request());
    expect(mocks.send.mock.calls[0]).toEqual(mocks.send.mock.calls[1]);
  });

  it.each(['retrieval', 'download', 'missing-content', 'forwarding', 'configuration', 'loop'])('returns a retryable error for %s failures without leaking contents', async failure => {
    if (failure === 'retrieval') mocks.get.mockResolvedValue({ data: null, error: { message: 'private provider detail' } });
    if (failure === 'download') vi.mocked(fetch).mockResolvedValue(new Response('private provider detail', { status: 503 }));
    if (failure === 'missing-content') mocks.get.mockResolvedValue({ data: { ...email, raw: null }, error: null });
    if (failure === 'forwarding') mocks.send.mockResolvedValue({ data: null, error: { message: 'private provider detail' } });
    if (failure === 'configuration') vi.stubEnv('SUPPORT_FORWARD_TO', '');
    if (failure === 'loop') vi.stubEnv('SUPPORT_FORWARD_TO', 'support@keeplyph.com');
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Retry later');
  });

  it('still records outgoing delivery events and ignores unsupported events', async () => {
    expect(await (await POST(request('email.delivered'))).json()).toEqual({ received: true });
    expect(mocks.rpc).toHaveBeenCalledWith('record_email_event', { p_id: email.id, p_type: 'email.delivered' });
    expect(await (await POST(request('email.opened'))).json()).toEqual({ ignored: true });
    expect(mocks.get).not.toHaveBeenCalled();
  });
});
