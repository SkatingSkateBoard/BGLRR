'use server';

// app/actions/responder.ts
// Server actions for the Responder PWA. Every action resolves the logged-in
// responder from the Supabase session; the client never passes a responder id.

import { revalidatePath } from 'next/cache';
import { AccessToken } from 'livekit-server-sdk';
import { createClient } from '@/utils/supabase/server';

const DASHBOARD_PATH = '/pwa/responder/dashboard';

const EMERGENCY_FIELDS =
  'id, resident_id, category, status, resident_description, photo_emergency, current_latitude, current_longitude, created_at, active_at, updated_at, responder_id';

export type EmergencyRow = {
  id: number;
  resident_id: number | null;
  category: string;
  status: string;
  resident_description: string | null;
  photo_emergency: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
  created_at: string;
  active_at: string | null;
  updated_at: string | null;
  responder_id: number | null;
};

export type ActionResult<T extends object = {}> =
  | ({ success: true } & T)
  | { success: false; error: string };

type ResponderContext =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; responderId: number }
  | { ok: false; error: string };

/**
 * Resolves the tbl_responder row for the signed-in user.
 * ASSUMPTION: tbl_responder has a `user_id` (uuid) column matching auth.users.id.
 * Change the .eq() below if your link column is named differently.
 */
async function requireResponder(): Promise<ResponderContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'Not signed in.' };

  const { data: responder, error } = await supabase
    .from('tbl_responder')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !responder) {
    return { ok: false, error: 'No responder profile is linked to this account.' };
  }

  return { ok: true, supabase, responderId: responder.id as number };
}

/**
 * Standby queue (unclaimed, on-standby) plus this responder's current
 * 'resolving' assignment, if any.
 */
export async function getStandbyAndActiveEmergencies(): Promise<
  ActionResult<{ standby: EmergencyRow[]; active: EmergencyRow | null }>
> {
  const ctx = await requireResponder();
  if (!ctx.ok) return { success: false, error: ctx.error };
  const { supabase, responderId } = ctx;

  const [standbyRes, activeRes] = await Promise.all([
    supabase
      .from('tbl_emergency_req')
      .select(EMERGENCY_FIELDS)
      .eq('status', 'on-standby')
      .is('responder_id', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('tbl_emergency_req')
      .select(EMERGENCY_FIELDS)
      .eq('status', 'resolving')
      .eq('responder_id', responderId)
      .maybeSingle(),
  ]);

  const err = standbyRes.error ?? activeRes.error;
  if (err) return { success: false, error: err.message };

  return {
    success: true,
    standby: (standbyRes.data ?? []) as unknown as EmergencyRow[],
    active: (activeRes.data ?? null) as unknown as EmergencyRow | null,
  };
}

/**
 * Atomically claims an on-standby emergency. The UPDATE only matches while the
 * row is still on-standby and unassigned, so two responders racing for the same
 * emergency cannot both succeed.
 */
export async function claimEmergency(
  emergencyId: number
): Promise<ActionResult<{ emergency: EmergencyRow }>> {
  const ctx = await requireResponder();
  if (!ctx.ok) return { success: false, error: ctx.error };
  const { supabase, responderId } = ctx;

  // One active assignment per responder.
  const { count, error: countErr } = await supabase
    .from('tbl_emergency_req')
    .select('id', { count: 'exact', head: true })
    .eq('responder_id', responderId)
    .eq('status', 'resolving');

  if (countErr) return { success: false, error: countErr.message };
  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: 'You already have an active emergency. Resolve it before claiming another.',
    };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('tbl_emergency_req')
    .update({
      status: 'resolving',
      responder_id: responderId,
      active_at: now,
      updated_at: now,
    })
    .eq('id', emergencyId)
    .eq('status', 'on-standby')
    .is('responder_id', null)
    .select(EMERGENCY_FIELDS)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) {
    return {
      success: false,
      error: 'This emergency was already claimed or is no longer on standby.',
    };
  }

  revalidatePath(DASHBOARD_PATH);
  return { success: true, emergency: data as unknown as EmergencyRow };
}

/**
 * Mints a LiveKit token for the responder, but only if this responder is
 * currently assigned to the emergency and it is still 'resolving'.
 */
export async function getResponderCallToken(
  emergencyId: number
): Promise<ActionResult<{ token: string; serverUrl: string; roomName: string }>> {
  const ctx = await requireResponder();
  if (!ctx.ok) return { success: false, error: ctx.error };
  const { supabase, responderId } = ctx;

  const { data, error } = await supabase
    .from('tbl_emergency_req')
    .select('id')
    .eq('id', emergencyId)
    .eq('responder_id', responderId)
    .eq('status', 'resolving')
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) {
    return {
      success: false,
      error: 'You are not assigned to this emergency, or it is no longer active.',
    };
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !serverUrl) {
    return { success: false, error: 'LiveKit is not configured on the server.' };
  }

  const roomName = `emergency-${emergencyId}`;
  const at = new AccessToken(apiKey, apiSecret, {
    identity: `Responder-${responderId}`,
    name: `Responder ${responderId}`,
    ttl: '2h',
  });
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
  });

  const token = await at.toJwt();
  return { success: true, token, serverUrl, roomName };
}

/**
 * Marks the responder's own assigned emergency as resolved. Setting status to
 * 'resolved' is what disconnects the resident's call and unlocks their dashboard.
 */
export async function resolveEmergency(emergencyId: number): Promise<ActionResult> {
  const ctx = await requireResponder();
  if (!ctx.ok) return { success: false, error: ctx.error };
  const { supabase, responderId } = ctx;

  const { data, error } = await supabase
    .from('tbl_emergency_req')
    .update({ status: 'resolved', updated_at: new Date().toISOString() })
    .eq('id', emergencyId)
    .eq('responder_id', responderId)
    .eq('status', 'resolving')
    .select('id')
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) {
    return {
      success: false,
      error: 'Could not resolve: this emergency is not assigned to you or is no longer active.',
    };
  }

  revalidatePath(DASHBOARD_PATH);
  return { success: true };
}