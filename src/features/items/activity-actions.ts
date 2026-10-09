'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { uuidSchema } from '@/lib/validation';
import { errorMessage } from '@/lib/errors';
import type { ActionResult } from '@/lib/domain';
import { activitySchema, type ActivityPage } from './activity';
import { requiredDate } from './validation';

function refresh() {
  revalidatePath('/dashboard');
  revalidatePath('/items', 'layout');
  revalidatePath('/purchases', 'layout');
}

export async function recordOccurrence(request: string, occurrence: string, revision: number, input: unknown, next: string, policy: string): Promise<ActionResult> {
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (![request, occurrence].every(id => uuidSchema.safeParse(id).success) || !Number.isInteger(revision) || revision < 1 ||
      (next && !requiredDate.safeParse(next).success) || !['fixed', 'from_completion', 'manual', 'stop'].includes(policy)) return { error: 'Check the completion and next dates.' };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('complete_occurrence', {
    p_request: request, p_occurrence: occurrence, p_revision: revision, p_data: parsed.data, p_next: next || null, p_policy: policy,
  });
  if (error) return { error: errorMessage(error) };
  refresh();
  return { id: data, success: 'Activity recorded.' };
}

export async function saveActivity(id: string, item: string, revision: number, input: unknown, reason = '', request = id): Promise<ActionResult> {
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (![id, item, request].every(value => uuidSchema.safeParse(value).success) || !Number.isInteger(revision) || revision < 0 || reason.length > 1000 || (revision > 0 && !reason.trim())) return { error: 'Check the activity and give a reason for any correction.' };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('save_item_activity', { p_id: id, p_item: item, p_revision: revision, p_data: parsed.data, p_reason: reason || null, p_request: revision ? request : null });
  if (error) return { error: errorMessage(error) };
  refresh();
  return { id: data, success: revision ? 'Activity corrected.' : 'Activity recorded.' };
}

export async function voidActivity(id: string, revision: number, reason: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success || !Number.isInteger(revision) || revision < 1 || !reason.trim() || reason.length > 1000) return { error: 'Give a reason for removing this activity.' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('void_item_activity', { p_id: id, p_revision: revision, p_reason: reason });
  if (error) return { error: errorMessage(error) };
  refresh();
  return { success: 'Activity removed. Its correction history is retained.' };
}

export async function skipOccurrence(request: string, occurrence: string, revision: number, reason: string, reopen = false): Promise<ActionResult> {
  if (![request, occurrence].every(id => uuidSchema.safeParse(id).success) || !Number.isInteger(revision) || revision < 1 || !reason.trim() || reason.length > 1000) return { error: 'Give a reason for skipping this occurrence.' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('skip_unconfirmed_occurrence', { p_request: request, p_occurrence: occurrence, p_revision: revision, p_reason: reason, p_reopen: reopen });
  if (error) return { error: errorMessage(error) };
  refresh();
  return { success: reopen ? 'Occurrence reopened for review.' : 'Occurrence marked skipped. Your current schedule stays the same.' };
}

export async function activityHistory(item: string, before: string, beforeId: string): Promise<ActivityPage> {
  if (!uuidSchema.safeParse(item).success || !uuidSchema.safeParse(beforeId).success || !Number.isFinite(Date.parse(before))) throw new Error('Invalid history cursor.');
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('item_activity_history', { p_item: item, p_before: before, p_before_id: beforeId });
  if (error) throw new Error('Unable to load activity history. Please retry.');
  return data as unknown as ActivityPage;
}

export async function activityCorrections(id: string): Promise<import('./activity').ActivityCorrection[]> {
  if (!uuidSchema.safeParse(id).success) throw new Error('Invalid activity.');
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('activity_corrections', { p_id: id });
  if (error) throw new Error('Unable to load corrections. Please retry.');
  return data as unknown as import('./activity').ActivityCorrection[];
}
