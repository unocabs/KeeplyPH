import { formatDate } from './domain';
export function escapeHtml(value: string) { return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!); }
export function reminderEmail(input: { from: string; to: string; product: string; expires: string; purchaseId: string; url: string }) {
  const name = escapeHtml(input.product);
  const date = formatDate(input.expires);
  const link = input.url + '/purchases/' + encodeURIComponent(input.purchaseId);
  return {
    from: input.from, to: input.to, subject: 'A little alert: your warranty expires on ' + date,
    text: input.product + ' has a warranty ending on ' + date + '.\n\nReview your receipt and coverage: ' + link + '\n\nCheck your seller’s terms before making a claim. Manage alert preferences: ' + input.url + '/settings',
    html: '<div style="font-family:Arial,sans-serif;max-width:520px;margin:32px auto;color:#292639;line-height:1.7"><h2 style="color:#6153ca">Keeply.</h2><h1 style="font-size:25px">A little heads-up.</h1><p>The warranty for <strong>' + name + '</strong> expires on <strong>' + escapeHtml(date) + '</strong>.</p><p>If something needs attention, now is a good time to find your receipt and review your coverage.</p><p><a href="' + escapeHtml(link) + '" style="color:#6153ca">View your reminder →</a></p><p style="font-size:12px;color:#777">Keeply alerts are a helpful nudge. Your seller’s warranty terms determine coverage.</p><hr style="border:0;border-top:1px solid #eee"><p style="font-size:12px"><a href="' + escapeHtml(input.url + '/settings') + '">Manage email preferences</a></p></div>',
  };
}

export function dateReminderEmail(input: { from:string;to:string;product:string;expires:string;purchaseId:string;kind:string;url:string }) {
  const date = formatDate(input.expires), link = input.url + '/items/' + encodeURIComponent(input.purchaseId);
  return {from:input.from,to:input.to,subject:'A little heads-up: '+input.kind+' on '+date,
    text: input.product+' — '+input.kind+' is due on '+date+'.\n\nReview your reminder: '+link+'\n\nConfirm deadlines and requirements with the responsible provider. Manage email preferences: '+input.url+'/settings',
    html:'<div style="font-family:Arial,sans-serif;max-width:520px;margin:32px auto;color:#292639;line-height:1.7"><h2>Keeply.</h2><h1>A little heads-up.</h1><p><strong>'+escapeHtml(input.product)+'</strong> · '+escapeHtml(input.kind)+' · '+escapeHtml(date)+'</p><p><a href="'+escapeHtml(link)+'">Review your reminder →</a></p><p>Confirm deadlines and requirements with the responsible provider.</p><p><a href="'+escapeHtml(input.url+'/settings')+'">Manage email preferences</a></p></div>'};
}
