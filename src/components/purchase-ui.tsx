import Link from 'next/link';
import { Laptop, WashingMachine, House, Shirt, ShoppingBag, ArrowUpRight, ShieldCheck, Plus, ReceiptText } from 'lucide-react';
import { formatDate, formatMoney, remainingLabel, warrantyStatus, type Category, type PurchaseWithDetails } from '@/lib/domain';
export function CategoryIcon({ category, large = false }: { category: Category | null; large?: boolean }) {
  const Icon = category === 'electronics' ? Laptop : category === 'appliances' ? WashingMachine : category === 'home' ? House : category === 'clothing' ? Shirt : ShoppingBag;
  return <span className={'category-icon ' + (category || 'other') + (large ? ' large' : '')}><Icon size={large ? 30 : 23} strokeWidth={1.6} /></span>;
}
export function StatusBadge({ purchase, today }: { purchase: PurchaseWithDetails; today: string }) {
  const status = warrantyStatus(purchase.warranty, today);
  const label = { none: 'No warranty', expired: 'Expired', upcoming: 'Starts soon', expiring: 'Expiring soon', active: 'Protected' }[status];
  return <span className={'badge ' + status}>{status === 'active' && <ShieldCheck size={12} />}{status === 'expiring' && <span className="status-dot" />}{label}</span>;
}
export function PurchaseCard({ purchase: p, today, base = '' }: { purchase: PurchaseWithDetails; today: string; base?: string }) {
  return <Link className="purchase-card" href={base + '/purchases/' + p.id}>
    <div className="purchase-card-top"><CategoryIcon category={p.category} /><ArrowUpRight size={17} /></div>
    <span className="category-label">{p.category || 'Purchase'}</span>
    <h3>{p.product_name}</h3><p>{p.merchant || 'Merchant not added'}<span>·</span>{formatMoney(p.price_minor)}</p>
    <div className="purchase-card-bottom"><StatusBadge purchase={p} today={today} /><span>{formatDate(p.purchased_on, true)}</span></div>
  </Link>;
}
export function EmptyPurchases({ base = '' }: { base?: string }) {
  return <div className="empty-state"><span className="empty-icon"><ReceiptText size={34} /></span><h3>Your receipts deserve a safe place.</h3><p>Add your first reminder. Keep the receipt, remember the warranty,<br className="desktop-only" /> and find it all right here.</p><Link className="button primary" href={base + '/purchases/new'}><Plus size={17} />Add your first reminder</Link><span className="empty-footnote">Start with just a product name. The rest can wait.</span></div>;
}
export function ExpiryRow({ purchase: p, today, base = '' }: { purchase: PurchaseWithDetails; today: string; base?: string }) {
  return <Link className="expiry-row" href={base + '/purchases/' + p.id}><CategoryIcon category={p.category} /><div className="expiry-name"><strong>{p.product_name}</strong><span>{p.merchant || 'Your purchase'}</span></div><div className="expiry-date"><strong>{remainingLabel(p.warranty!.expires_on, today)}</strong><span>{formatDate(p.warranty!.expires_on, true)}</span></div><ArrowUpRight size={16} /></Link>;
}
