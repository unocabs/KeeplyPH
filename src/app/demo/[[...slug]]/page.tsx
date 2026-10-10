import { isSignedIn } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { Dashboard } from '@/components/dashboard';
import { PurchaseList } from '@/components/purchase-list';
import { ItemList } from '@/components/item-list';
import { ItemDetail } from '@/components/item-detail';
import { ItemForm } from '@/components/item-form';
import { TemplateChoices } from '@/components/template-picker';
import { isTemplate } from '@/features/templates';
import { samplePurchases, sampleItems, sampleUsage, sampleUnconfirmed } from '@/lib/demo';
import { todayIn, categories, type Category } from '@/lib/domain';
import { PurchaseForm } from '@/components/purchase-form';
import { PurchaseDetail } from '@/components/purchase-detail';
import { AlertOptions } from '@/components/alert-options';
import { SettingsForm } from '@/components/settings-form';
import { Billing } from '@/components/billing';
import { OccurrenceReviewList, OverdueReminderList } from '@/components/occurrence-review-list';
import { requiredDate } from '@/features/items/validation';
import { uuidSchema } from '@/lib/validation';
import { HouseholdPaymentPlan } from '@/components/payment-plan';
import { HouseholdPlannerView } from '@/components/household-planner';
import { plannerHorizon, samplePlanner, samplePlannerRows } from '@/features/premium/planner';
import { sampleInsights, samplePaymentPlan } from '@/features/items/insights';
import { dateRows } from '@/features/items/domain';
import { notFound } from 'next/navigation';
export const metadata = { title: 'Sample account', robots: { index: false, follow: false } };
export default async function DemoPage({ params, searchParams }: { params: Promise<{ slug?: string[] }>; searchParams: Promise<{ q?: string; filter?: string; preset?: string; focus?: string; renewalDate?: string; category?: string; template?: string; before?: string; id?: string; days?: string; month?: string }> }) {
  const { slug = [] } = await params;
  const query = await searchParams;
  const today = todayIn();
  const items = sampleItems(today);
  const purchases = samplePurchases(items);
  const usage = sampleUsage(items, today);
  let content;
  if (slug[0] === 'planner') {
    const days=plannerHorizon(query.days),month=/^\d{4}-\d{2}-01$/.test(query.month||'')&&requiredDate.safeParse(query.month).success?query.month:undefined;
    content=<HouseholdPlannerView key={days} plan={samplePlanner(items,today,days,month)} allSampleRows={samplePlannerRows(items,today,days)} premium demo month={month}/>;
  }
  else if (slug[0] === 'add') {
    if(!slug[1]) content = <><h1>What would you like to organise first?</h1><TemplateChoices demo initialCategory={query.category} /></>;
    else if(!isTemplate(slug[1])) notFound();
    else content = slug[1] === 'receipt' ? <PurchaseForm demo warrantyFocus={query.focus === 'warranty'} initialCategory={categories.includes(query.category as Category) ? query.category as Category : undefined} /> : <ItemForm template={slug[1]} vehicles={items.filter(item => item.template_key === slug[1])} preset={query.preset} focus={query.focus} renewalDate={query.renewalDate} demo />;
  }
  else if(slug[0] === 'items' && slug[1] === 'payments') {
    const valid = requiredDate.safeParse(query.before).success && uuidSchema.safeParse(query.id).success;
    const contexts=Object.fromEntries(items.flatMap(item=>item.dates.map(date=>[date.id,{revision:date.revision,can_record_payment:!['service','warranty'].includes(date.kind)}])));
    content = <HouseholdPaymentPlan key={valid?query.before+':'+query.id:'first'} plan={samplePaymentPlan(items,today,valid?query.before:undefined,valid?query.id:undefined)} contexts={contexts} paged={valid} base="/demo" demo/>;
  }
  else if(slug[0] === 'items' && slug[1] === 'review') {
    const valid = requiredDate.safeParse(query.before).success && uuidSchema.safeParse(query.id).success;
    content = <OccurrenceReviewList summary={sampleUnconfirmed(items,valid ? query.before : undefined,valid ? query.id : undefined)} paged={valid} base="/demo" />;
  }
  else if(slug[0] === 'items') {
    if(!slug[1] && query.filter === 'overdue') {
      const valid=requiredDate.safeParse(query.before).success && uuidSchema.safeParse(query.id).success;
      const summary=sampleUnconfirmed(items,valid?query.before:undefined,valid?query.id:undefined),last=summary.rows.at(-1);
      content=<OverdueReminderList rows={dateRows(items).filter(row=>row.occurrence.due_on<today)} summary={summary} base="/demo" paged={valid} pastNext={summary.has_more&&last?'/demo/items?'+new URLSearchParams({filter:'overdue',before:last.due_on,id:last.occurrence_id}):undefined}/>;
    }
    else if(!slug[1]) content = <ItemList key={JSON.stringify(query)} serverQuery={{template:query.template,q:query.q}} items={items} today={today} initialFilter={query.filter} demo />;
    else { const item = items.find(i=>i.id===slug[1]); if(!item)notFound();content = slug[2] === 'edit' ? <ItemForm template={item.template_key} item={item} demo/> : <ItemDetail item={item} usage={usage} today={today} demo/>; }
  }
  else if (slug[0] === 'purchases' && !slug[1]) content = <PurchaseList key={query.filter} purchases={purchases} today={today} initialFilter={query.filter} demo />;
  else if (slug[0] === 'purchases' && slug[1] === 'new') content = <PurchaseForm demo />;
  else if (slug[0] === 'purchases' && slug[1]) {
    const purchase = purchases.find(p => p.id === slug[1]);
    if (!purchase) notFound();
    content = slug[2] === 'edit' ? <PurchaseForm purchase={purchase} warrantyFocus={query.focus === 'warranty'} demo /> : <PurchaseDetail purchase={purchase} today={today} demo />;
  }
  else if (slug[0] === 'settings' && slug[1] === 'billing') content = <Billing demo usage={usage} />;
  else if (slug[0] === 'settings' && slug[1] === 'alerts') content = <><div className="page-heading"><div><h1>Alert Options</h1><p>Your alerts, in this sample account.</p></div></div><section className="panel narrow-form"><AlertOptions demo initial={{email_reminders_enabled:true}}/></section></>;
  else if (slug[0] === 'settings') content = <><div className="page-heading"><div><h1>Make yourself at home.</h1><p>Your preferences, in this sample account.</p></div></div><SettingsForm demo profile={{ id: 'sample', display_name: 'Alex Reyes', timezone: 'Asia/Manila', email_reminders_enabled: true, email_delivery_blocked: false, deletion_requested_at: null, created_at: '', updated_at: '' }} /></>;
  else content = <Dashboard items={items} usage={usage} name="Alex" today={today} unconfirmed={sampleUnconfirmed(items)} insights={sampleInsights(items,today)} demo />;
  return <AppShell name="Alex Reyes" hasExtraSlots demo signedIn={await isSignedIn()}>{content}</AppShell>;
}
