import { formatDate } from './domain';
import { escapeHtml } from './reminder-email';
export function renewalEmail(input:{from:string;to:string;expires:string;expired:boolean;url:string}) {
  const sentence=input.expired?'Your extra alert slots have expired. Your saved reminders and three free slots are still here.':'Your extra alert slots expire on '+formatDate(input.expires)+'.';
  const text=sentence+' Choose your slot count and renew for another 30 days in billing if you’d like to keep them. No automatic charges.';
  return {from:input.from,to:input.to,subject:input.expired?'Your extra Keeply slots have expired':'An alert about your extra Keeply slots',text:text+'\n\n'+input.url+'/settings/billing\n\nEmail preferences: '+input.url+'/settings',html:'<h2>Keeply.</h2><p>'+escapeHtml(text)+'</p><p><a href="'+escapeHtml(input.url+'/settings/billing')+'">Review your alert slots</a></p><p><a href="'+escapeHtml(input.url+'/settings')+'">Email preferences</a></p>'};
}
