import { isSignedIn } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { Dashboard } from '@/components/dashboard';
import { PurchaseList } from '@/components/purchase-list';
import { ItemList } from '@/components/item-list';
import { ItemDetail } from '@/components/item-detail';
import { ItemForm } from '@/components/item-form';
import { TemplateChoices } from '@/components/template-picker';
import { isTemplate } from '@/features/templates';
import { samplePurchases, sampleItems, sampleUsage } from '@/lib/demo';
import { todayIn, categories, type Category } from '@/lib/domain';
import { PurchaseForm } from '@/components/purchase-form';
import { PurchaseDetail } from '@/components/purchase-detail';
import { AlertOptions } from '@/components/alert-options';
import { SettingsForm } from '@/components/settings-form';
import { Billing } from '@/components/billing';
import { notFound } from 'next/navigation';
export const metadata = { title: 'Sample account', robots: { index: false, follow: false } };
export default async function DemoPage({ params, searchParams }: { params: Promise<{ slug?: string[] }>; searchParams: Promise<{ filter?: string; preset?: string; focus?: string; renewalDate?: string; category?: string; template?: string }> }) {
  const { slug = [] } = await params;
  const query = await searchParams;
  const today = todayIn();
  const items = sampleItems(today);
  const purchases = samplePurchases(items);
  const usage = sampleUsage(items, today);
  let content;
  if (slug[0] === 'add') {
    if(!slug[1]) content = <><h1>What would you like to organise first?</h1><TemplateChoices demo initialCategory={query.category} /></>;
    else if(!isTemplate(slug[1])) notFound();
    else content = slug[1] === 'receipt' ? <PurchaseForm demo initialCategory={categories.includes(query.category as Category) ? query.category as Category : undefined} /> : <ItemForm template={slug[1]} vehicles={items.filter(item => item.template_key === slug[1])} preset={query.preset} focus={query.focus} renewalDate={query.renewalDate} demo />;
  }
  else if(slug[0] === 'items') {
    if(!slug[1]) content = <ItemList key={JSON.stringify(query)} serverQuery={{template:query.template}} items={items} today={today} initialFilter={query.filter} demo />;
    else { const item = items.find(i=>i.id===slug[1]); if(!item)notFound();content = slug[2] === 'edit' ? <ItemForm template={item.template_key} item={item} demo/> : <ItemDetail item={item} usage={usage} today={today} demo/>; }
  }
  else if (slug[0] === 'purchases' && !slug[1]) content = <PurchaseList key={query.filter} purchases={purchases} today={today} initialFilter={query.filter} demo />;
  else if (slug[0] === 'purchases' && slug[1] === 'new') content = <PurchaseForm demo />;
  else if (slug[0] === 'purchases' && slug[1]) {
    const purchase = purchases.find(p => p.id === slug[1]);
    if (!purchase) notFound();
    content = slug[2] === 'edit' ? <PurchaseForm purchase={purchase} demo /> : <PurchaseDetail purchase={purchase} today={today} demo />;
  }
  else if (slug[0] === 'settings' && slug[1] === 'billing') content = <Billing demo usage={usage} />;
  else if (slug[0] === 'settings' && slug[1] === 'alerts') content = <><div className="page-heading"><div><h1>Alert Options</h1><p>Your alerts, in this sample account.</p></div></div><section className="panel narrow-form"><AlertOptions demo initial={{email_reminders_enabled:true}}/></section></>;
  else if (slug[0] === 'settings') content = <><div className="page-heading"><div><h1>Make yourself at home.</h1><p>Your preferences, in this sample account.</p></div></div><SettingsForm demo profile={{ id: 'sample', display_name: 'Alex Reyes', timezone: 'Asia/Manila', email_reminders_enabled: true, email_delivery_blocked: false, deletion_requested_at: null, created_at: '', updated_at: '' }} /></>;
  else content = <Dashboard items={items} usage={usage} name="Alex" today={today} demo />;
  return <AppShell name="Alex Reyes" hasExtraSlots={false} demo signedIn={await isSignedIn()}>{content}</AppShell>;
}
