'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { pushPublicKey, pushReady, sendWebPush, pushTestPayload } from '@/lib/web-push';
import { pushSubscriptionSchema, type PushDeviceStatus } from '@/lib/push-subscription';
import type { ActionResult } from '@/lib/domain';

function refresh() { revalidatePath('/settings', 'layout'); revalidatePath('/items', 'layout'); revalidatePath('/dashboard'); }
export async function pushDeviceStatus(endpoint: string | null): Promise<PushDeviceStatus> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('push_device_status', { p_endpoint: endpoint?.slice(0, 2048) || null });
  if (error) throw new Error('Unable to check this device. Please try again.');
  return data as unknown as PushDeviceStatus;
}
export async function registerPushSubscription(input: unknown): Promise<ActionResult> {
  if (!pushReady()) return { error: 'Web push is not available yet. Email remains available.' };
  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) return { error: 'This browser returned an unsupported notification subscription.' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('register_push_subscription', { p_endpoint: parsed.data.endpoint, p_p256dh: parsed.data.keys.p256dh, p_auth: parsed.data.keys.auth });
  if (error) return { error: error.message.includes('DEVICE_LIMIT') ? 'You can connect up to 5 devices. Turn off a device before adding another.' : error.message.includes('DEVICE_LINKED') ? 'This browser is linked to another Keeply account. Sign in to that account and turn off notifications here first.' : 'Unable to connect this device. Please try again.' };
  refresh(); return { success: 'Web push enabled on this device.' };
}
export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('remove_push_subscription', { p_endpoint: endpoint.slice(0, 2048) });
  if (error) return { error: 'Unable to turn off this device. Please try again.' };
  refresh(); return { success: 'Web push turned off on this device.' };
}
export async function sendPushTest(endpoint: string): Promise<ActionResult> {
  if (!pushPublicKey()) return { error: 'Web push is not available yet.' };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('prepare_push_test', { p_endpoint: endpoint.slice(0, 2048) });
  if (error) return { error: 'Test notifications are limited to 3 per hour. Please try again later.' };
  if (!data) return { error: 'Enable web push on this device first.' };
  const result = await sendWebPush(data, pushTestPayload(), 60);
  if (result.status === 'expired') {
    const subscription = pushSubscriptionSchema.parse(data);
    await adminClient().rpc('expire_push_subscription', { p_endpoint: subscription.endpoint, p_auth: subscription.keys.auth });
    refresh(); return { error: 'This device registration expired. Enable web push again.' };
  }
  return result.status === 'accepted' ? { success: 'Test accepted by your browser’s push service. Check your notifications; device settings can silence it.' } : { error: 'We could not confirm the test was accepted. Check your connection and try again later.' };
}
