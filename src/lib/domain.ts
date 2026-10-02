export const categories = ['electronics', 'appliances', 'home', 'clothing', 'other'] as const;
export type Category = typeof categories[number];
export interface Purchase {
  id: string; user_id: string; state: 'draft' | 'saved'; product_name: string | null; purchased_on: string | null;
  merchant: string | null; price_minor: number | null; currency: string; category: Category | null; notes: string | null;
  revision: number; created_at: string; updated_at: string;
}
export interface Warranty {
  id: string; purchase_id: string; user_id: string; starts_on: string | null; expires_on: string;
  serial_number: string | null; notes: string | null; reminders_enabled: boolean; reminders_enabled_at: string | null;
  reminder_disabled_reason: string | null; created_at: string; updated_at: string;
}
export interface Document {
  id: string; purchase_id: string; user_id: string; kind: 'receipt' | 'warranty' | 'vehicle' | 'service'; state: 'pending' | 'ready' | 'failed';
  staging_key: string; object_key: string; original_name: string; mime_type: string | null; size_bytes: number | null;
  reserved_bytes: number; checksum: string | null; upload_expires_at: string; created_at: string;
}
export interface Profile {
  phone_number?: string | null; phone_verified_at?: string | null; sms_reminders_enabled?: boolean; phone_prompt_dismissed?: boolean;
  suggestion_emails_enabled?: boolean;
  id: string; display_name: string; timezone: string; analytics_enabled?: boolean; renewal_emails_enabled?: boolean; email_reminders_enabled: boolean;
  push_reminders_enabled?: boolean; push_subscription_count?: number; email_delivery_blocked: boolean; deletion_requested_at: string | null; created_at: string; updated_at: string;
}
export interface PurchaseWithDetails extends Purchase { warranty: Warranty | null; documents: Document[] }
export interface Usage { active_reminders?: number; purchases: number; reminders: number; storage_bytes: number; premium: boolean; premium_until: string | null; slot_limit?: number; storage_limit_bytes?: number; uncovered?: number; paid_until?: string | null; permanent?: boolean; permanent_slots?: number; renewal_slots?: number; temporary_active?: boolean; renewal_emails_enabled?: boolean; upcoming?: number; overdue?: number }
export type ActionResult = { error?: string; success?: string; id?: string; uncovered?: boolean };
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export function todayIn(timezone = 'Asia/Manila', now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1 + months, 1));
  const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, last));
  return result.toISOString().slice(0, 10);
}
export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
}
export function warrantyStatus(w: Warranty | null, today: string) {
  if (!w) return 'none';
  if (w.expires_on < today) return 'expired';
  if (w.starts_on && w.starts_on > today) return 'upcoming';
  return daysUntil(w.expires_on, today) <= 30 ? 'expiring' : 'active';
}
export function remainingLabel(expires: string, today: string): string {
  const days = daysUntil(expires, today);
  return days < 0 ? 'Expired ' + Math.abs(days) + ' days ago' : days === 0 ? 'Expires today' : days === 1 ? '1 day remaining' : days + ' days remaining';
}
export function formatDate(date: string | null, short = false): string {
  if (!date) return 'Not added';
  return new Intl.DateTimeFormat('en-PH', { month: short ? 'short' : 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(date.slice(0, 10) + 'T00:00:00Z'));
}
export function formatMoney(minor: number | null): string {
  if (minor === null) return '—';
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100);
}
export function parseMoney(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) throw new Error('Enter a valid price with at most two decimal places.');
  const [whole, decimal = ''] = value.split('.');
  return Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
}
export function safeReturnPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return fallback;
  try { const url = new URL(value, 'https://keeplyph.com'); return url.origin === 'https://keeplyph.com' ? url.pathname + url.search : fallback; } catch { return fallback; }
}
