'use server';

import * as webpush from 'web-push';
import { createAdminClient, createClient } from '@/utils/supabase/server';

export interface EmergencyReqInput {
  id: number | string;
  category?: string;
  resident_description?: string;
}

export interface AnnouncementInput {
  id: number | string;
  title: string;
  description?: string;
}

// 1. Send VAPID push notifications to all responders (Unchanged)
export async function notifyResponders(emergency: EmergencyReqInput) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  const supabaseAdmin = createAdminClient();

  const { data: rows, error } = await supabaseAdmin
    .from('tbl_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('role', 'responder');

  if (error || !rows?.length) {
    return { success: false, sentCount: 0, error: error?.message };
  }

  const categoryLabel = emergency.category
    ? emergency.category.toUpperCase()
    : 'EMERGENCY';

  const payload = JSON.stringify({
    type: 'emergency',
    title: `🚨 Standby [${categoryLabel}] — Request #${emergency.id}`,
    body: emergency.resident_description
      ? `"${emergency.resident_description}" — Tap to claim now.`
      : 'New emergency on standby — Tap to claim now.',
    emergencyId: emergency.id,
    url: `/responder?claim=${emergency.id}`,
  });

  let sentCount = 0;

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload,
          { TTL: 60, urgency: 'high' }
        );
        sentCount++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin.from('tbl_push_subscriptions').delete().eq('id', row.id);
        }
      }
    })
  );

  return { success: true, sentCount };
}
export async function notifyResidents(announcement: AnnouncementInput) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  const supabaseAdmin = createAdminClient();

  const { data: rows, error } = await supabaseAdmin
    .from('tbl_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('role', 'resident');

  if (error || !rows?.length) {
    return { success: false, sentCount: 0, error: error?.message };
  }

  const payload = JSON.stringify({
    type: 'announcement',
    title: `📢 ${announcement.title}`,
    body: announcement.description || 'New community announcement posted.',
    announcementId: announcement.id,
    url: '/resident', // Change to '/resident/announcements' if you have a dedicated page
  });

  let sentCount = 0;

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload,
          { TTL: 3600, urgency: 'normal' }
        );
        sentCount++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin.from('tbl_push_subscriptions').delete().eq('id', row.id);
        }
      }
    })
  );

  return { success: true, sentCount };
}

// 3. Save responder or resident push subscription to Supabase
export async function savePushSubscription(subData: {
  userId?: number | string | null;
  role: 'responder' | 'resident';
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from('tbl_push_subscriptions')
    .upsert(
      {
        user_id: userData?.user?.id ?? subData.userId ?? null,
        role: subData.role,
        endpoint: subData.endpoint,
        p256dh: subData.p256dh,
        auth: subData.auth,
      },
      { onConflict: 'endpoint' }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// 4. Atomically claim an 'on-standby' emergency and set status to 'resolving'
export async function claimStandbyEmergency(emergencyId: number, responderId: number) {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('tbl_emergency_req')
    .update({
      responder_id: responderId,
      status: 'resolving',
      updated_at: new Date().toISOString(),
    })
    .eq('id', emergencyId)
    .eq('status', 'on-standby')
    .is('responder_id', null)
    .select()
    .single();

  if (error || !data) {
    return {
      success: false,
      error: 'Too late — another responder already claimed this emergency.',
    };
  }

  return { success: true, emergency: data };
}
