import 'server-only';
import PostalMime from 'postal-mime';
import type { Resend } from 'resend';
import { z } from 'zod';
import { requireEnv, supportEmail } from '@/lib/env';

function mailbox(value: string) {
  return (value.match(/<([^<>]+)>/)?.[1] || value).trim().toLowerCase();
}

export async function forwardSupportEmail(resend: Resend, emailId: string): Promise<'forwarded' | 'ignored'> {
  const { data: email, error: readError } = await resend.emails.receiving.get(emailId);
  if (readError || !email) throw new Error('Support email retrieval failed');

  const support = mailbox(supportEmail());
  // Prefer the SMTP envelope, which also covers Bcc deliveries. Resend's older
  // receiving records expose only the visible recipient fields.
  const recipients = email.received_for?.length ? email.received_for : [...email.to, ...(email.cc || []), ...(email.bcc || [])];
  if (!recipients.some(recipient => mailbox(recipient) === support)) return 'ignored';

  const to = z.email().parse(requireEnv('SUPPORT_FORWARD_TO').trim());
  if (mailbox(to) === support) throw new Error('Support forwarding loop');
  if (!email.raw?.download_url) throw new Error('Support email content unavailable');

  const response = await fetch(email.raw.download_url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Support email download failed');
  // Parse the original MIME message to preserve attachments and inline images.
  // Signed download URLs change between retries; file contents give Resend a
  // stable payload for the idempotency key even after a lost success response.
  const parsed = await PostalMime.parse(await response.arrayBuffer(), { attachmentEncoding: 'base64' });
  const { data, error } = await resend.emails.send({
    from: requireEnv('EMAIL_FROM'),
    to,
    replyTo: email.reply_to?.length ? email.reply_to : email.from,
    subject: '[Keeply feedback] ' + (email.subject || '(no subject)'),
    text: parsed.text || (parsed.html ? '' : '(This message has no text body.)'),
    html: parsed.html || undefined,
    attachments: parsed.attachments.map(attachment => ({
      filename: attachment.filename || 'attachment',
      content: typeof attachment.content === 'string' ? attachment.content : Buffer.from(attachment.content instanceof ArrayBuffer ? new Uint8Array(attachment.content) : attachment.content).toString('base64'),
      contentType: attachment.mimeType,
      contentId: attachment.contentId?.replace(/^<|>$/g, '') || undefined,
    })),
    tags: [{ name: 'category', value: 'support_feedback' }],
  }, { idempotencyKey: 'keeply-support/' + emailId });
  if (error || !data) throw new Error('Support email forwarding failed');
  return 'forwarded';
}
