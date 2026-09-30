import { AppShell } from '@/components/app-shell';
import { Dashboard } from '@/components/dashboard';
import { PurchaseList } from '@/components/purchase-list';
import { ItemList } from '@/components/item-list';
import { ItemDetail } from '@/components/item-detail';
import { ItemForm } from '@/components/item-form';
import { TemplateChoices } from '@/components/template-picker';
import { isTemplate } from '@/features/templates';
import { samplePurchases, sampleItems } from '@/lib/demo';
import { todayIn } from '@/lib/domain';
import { PurchaseForm } from '@/components/purchase-form';
import { PurchaseDetail } from '@/components/purchase-detail';
import { SettingsForm } from '@/components/settings-form';
import { Billing } from '@/components/billing';
import { notFound } from 'next/navigation';
export const metadata = { title: 'Sample preview', robots: { index: false, follow: false } };
export default async function DemoPage({ params, searchParams }: { params: Promise<{ slug?: string[] }>; searchParams: Promise<{ filter?: string; preset?: string; focus?: string; renewalDate?: string }> }) {
  const { slug = [] } = await params;
  const query = await searchParams;
  const purchases = samplePurchases();
  const items = sampleItems();
  const today = todayIn();
  let content;
  if (slug[0] === 'add') {
    if(!slug[1]) content = <><h1>What do you want to keep?</h1><TemplateChoices demo /></>;
    else if(!isTemplate(slug[1])) notFound();
    else content = slug[1] === 'receipt' ? <PurchaseForm demo /> : <ItemForm template={slug[1]} preset={query.preset} focus={query.focus} renewalDate={query.renewalDate} demo />;
  }
  else if(slug[0] === 'items') {
    if(!slug[1]) content = <ItemList key={query.filter} items={items} today={today} initialFilter={query.filter} demo />;
    else { const item = items.find(i=>i.id===slug[1]); if(!item)notFound();content = slug[2] === 'edit' ? <ItemForm template={item.template_key} item={item} demo/> : <ItemDetail item={item} today={today} demo/>; }
  }
  else if (slug[0] === 'purchases' && !slug[1]) content = <PurchaseList key={query.filter} purchases={purchases} today={today} initialFilter={query.filter} demo />;
  else if (slug[0] === 'purchases' && slug[1] === 'new') content = <PurchaseForm demo />;
  else if (slug[0] === 'purchases' && slug[1]) {
    const purchase = purchases.find(p => p.id === slug[1]);
    if (!purchase) notFound();
    content = slug[2] === 'edit' ? <PurchaseForm purchase={purchase} demo /> : <PurchaseDetail purchase={purchase} today={today} demo />;
  }
  else if (slug[0] === 'settings' && slug[1] === 'billing') content = <Billing demo usage={{ purchases: 8, reminders: 3, storage_bytes: 0, premium: false, premium_until: null }} />;
  else if (slug[0] === 'settings') content = <><div className="page-heading"><div><h1>Make yourself at home.</h1><p>Your preferences, in this sample preview.</p></div></div><SettingsForm demo profile={{ id: 'sample', display_name: 'Alex Reyes', timezone: 'Asia/Manila', email_reminders_enabled: true, email_delivery_blocked: false, deletion_requested_at: null, created_at: '', updated_at: '' }} /></>;
  else content = <Dashboard items={items} usage={{ purchases: 8, reminders: 3, storage_bytes: 0, premium: false, premium_until: null }} name="Alex" today={today} demo />;
  return <AppShell name="Alex Reyes" hasExtraSlots={false} demo>{content}</AppShell>;
}
