// Schema contract for the checked-in migrations. Regenerate from the deployed
// schema using the Supabase CLI after connecting a dedicated Supabase project.
import type { Item, ImportantDate, Occurrence } from '@/features/items/domain';
import type { Purchase, Warranty, Document, Profile } from '@/lib/domain';
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Table<T> = { Row: { [K in keyof T]: T[K] }; Insert: Partial<T>; Update: Partial<T>; Relationships: [] };
type Rpc<A, R = Json> = { Args: A; Returns: R };
export interface Database {
  public: {
    Tables: {
      items: Table<Item>; important_dates: Table<ImportantDate>; date_occurrences: Table<Occurrence>; reminder_offsets: Table<{ date_id: string; unit: string; value: number }>;
      profiles: Table<Profile>; purchases: Table<Purchase>; warranties: Table<Warranty>; documents: Table<Document>;
      account_entitlements: Table<{ user_id: string; premium_until: string | null; updated_at: string }>;
    };
    Views: Record<string, never>;
    Functions: {
      feedback_status: Rpc<Record<string, never>>;
      submit_feedback: Rpc<{p_id:string;p_kind:string;p_summary:string;p_notes:string;p_expect_reward:boolean}>;
      purge_old_feedback: Rpc<Record<string, never>,undefined>;
      apply_verified_refund: Rpc<{p_payment:string;p_amount:number;p_currency:string;p_live:boolean},undefined>;
      item_detail: Rpc<{p_id:string}>;
      date_history: Rpc<{p_id:string;p_before:number}>;
      record_upgrade_event: Rpc<{p_event:string},undefined>;
      revoke_refunded_order: Rpc<{p_payment:string},undefined>;
      item_coverage: Rpc<{ p_id: string }>;
      list_items: Rpc<{ p_filter?: string; p_query?: string; p_template?: string; p_cursor?: string | null; p_cursor_id?: string | null }>;
      dashboard_items: Rpc<Record<string, never>>;
      set_item_coverage: Rpc<{ p_id: string; p_revision: number; p_enabled: boolean; p_replace: string | null; p_replace_revision: number | null }, undefined>;
      create_pack_order: Rpc<{ p_user: string; p_id: string; p_product: string; p_live: boolean }>;
      pending_checkouts: Rpc<{ p_live: boolean }>;
      claim_renewal_jobs: Rpc<{ p_limit: number }>;
      prepare_renewal: Rpc<{ p_id: string; p_lease: string; p_payload: Json }>;
      update_renewal_preference: Rpc<{ p_enabled: boolean }, undefined>;
      update_analytics_preference: Rpc<{ p_enabled: boolean }, undefined>;
      record_funnel_count: Rpc<{ p_page: string; p_event: string; p_template: string }, undefined>;
      reminder_preview: Rpc<{ p_item_id: string }>;
      create_item_draft: Rpc<{ p_id: string; p_template: string }, string>;
      save_item_with_date: Rpc<{ p_id: string; p_revision: number; p_label: string; p_notes: string; p_date: Json | null }, string>;
      save_important_date: Rpc<{ p_id: string; p_item_id: string; p_revision: number; p_data: Json }, string>;
      complete_date: Rpc<{ p_id: string; p_revision: number; p_completed: string; p_next: string | null }, undefined>;
      archive_item: Rpc<{ p_id: string; p_revision: number; p_archive: boolean }, undefined>;
      delete_item: Rpc<{ p_id: string }, undefined>;
      create_purchase_draft: Rpc<{ p_id: string }, string>;
      save_purchase: Rpc<{ p_id: string; p_revision: number; p_data: Json; p_warranty: Json | null }, string>;
      delete_purchase: Rpc<{ p_id: string }, undefined>;
      update_preferences: Rpc<{ p_name: string; p_timezone: string; p_email_enabled: boolean }, undefined>;
      reserve_document: Rpc<{ p_id: string; p_purchase_id: string; p_kind: string; p_name: string; p_bytes: number }>;
      remove_document: Rpc<{ p_id: string }, undefined>;
      begin_document_validation: Rpc<{ p_id: string }>;
      finalize_document: Rpc<{ p_id: string; p_user_id: string; p_size: number; p_mime: string; p_checksum: string }, undefined>;
      account_usage: Rpc<Record<string, never>>;
      create_billing_order: Rpc<{ p_id: string }>;
      get_billing_orders: Rpc<Record<string, never>>;
      attach_checkout: Rpc<{ p_id: string; p_checkout_id: string; p_url: string }, undefined>;
      credit_payment: Rpc<{ p_event_id: string; p_order_id: string; p_checkout_id: string; p_payment_id: string; p_amount: number; p_currency: string; p_live: boolean }, undefined>;
      record_billing_review: Rpc<{ p_event_id: string; p_payment_id: string; p_type: string }, undefined>;
      claim_notification_jobs: Rpc<{ p_limit: number; p_daily_limit: number }>;
      prepare_notification: Rpc<{ p_id: string; p_lease: string; p_payload: Json }>;
      finish_notification: Rpc<{ p_id: string; p_lease: string; p_status: string; p_provider_id: string | null; p_error: string | null }, undefined>;
      record_email_event: Rpc<{ p_id: string; p_type: string }, undefined>;
      run_maintenance: Rpc<Record<string, never>>;
      complete_object_deletion: Rpc<{ p_id: string; p_success: boolean }, undefined>;
      request_account_deletion: Rpc<Record<string, never>, undefined>;
      complete_account_deletion: Rpc<{ p_user_id: string }, undefined>;
    };
    Enums: Record<string, never>; CompositeTypes: Record<string, never>;
  };
}
