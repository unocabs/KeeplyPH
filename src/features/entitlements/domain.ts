import type { Usage } from '@/lib/domain';
export function capabilities(usage: Usage) {
  return { slots: usage.slot_limit ?? 3, used: usage.reminders, available: Math.max(0, (usage.slot_limit ?? 3) - usage.reminders), storageBytes: usage.storage_limit_bytes ?? 104857600 };
}
