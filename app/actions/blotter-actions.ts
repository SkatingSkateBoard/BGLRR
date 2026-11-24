"use server";

import { createClient } from "@/utils/supabase/server";

export type BlotterStatus = "pending" | "scheduled" | "rejected" | "completed";

export interface BlotterResident {
  first_name: string;
  last_name: string;
  phone: string;
}

export interface BlotterRow {
  id: number;
  resident_id: string;
  description: string | null;
  appointment_date: string | null;
  reviewed_by: number | null;
  blotter_status: BlotterStatus;
  rejection_reason: string | null;
  created_at: string;
  resident?: BlotterResident | null;
}

export type ActionResult<T = BlotterRow> =
  | { success: true; data: T }
  | { success: false; error: string };

type OperatorAuth =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; operatorId: number }
  | { ok: false; error: string };

/**
 * Converts a datetime-local string (e.g. "2026-11-25T14:30") or any ISO-like
 * string into an ISO timestamp. Strings without an explicit offset are
 * interpreted as Asia/Manila (UTC+08:00).
 */
function parseManilaTimestamp(dateString: string): string | null {
  if (!dateString) return null;

  const hasTimezone = /(Z|[+-]\d{2}:?\d{2})$/i.test(dateString);
  // datetime-local omits seconds; add them so the string is a full ISO time.
  const withSeconds = /T\d{2}:\d{2}$/.test(dateString) ? `${dateString}:00` : dateString;
  const candidate = hasTimezone ? withSeconds : `${withSeconds}+08:00`;

  const parsed = new Date(candidate);
  if (isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

async function getAuthenticatedOperator(): Promise<OperatorAuth> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: "Operator is not authenticated." };
  }

  const { data: operatorData, error: operatorError } = await supabase
    .from("tbl_operator")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (operatorError || !operatorData) {
    return { ok: false, error: "Failed to locate operator record." };
  }

  return { ok: true, supabase, operatorId: operatorData.id as number };
}

export async function getBlottersAction(): Promise<BlotterRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tbl_appointment_blotter")
    .select(
      `
      id,
      resident_id,
      description,
      appointment_date,
      reviewed_by,
      blotter_status,
      rejection_reason,
      created_at,
      resident:tbl_resident(first_name, last_name, phone)
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching blotters:", error.message);
    return [];
  }

  // Supabase types joined relations as arrays for some relationships; normalize to a single object.
  const rows = (data ?? []) as unknown as Array<
    Omit<BlotterRow, "resident"> & { resident: BlotterResident | BlotterResident[] | null }
  >;

  return rows.map((row) => ({
    ...row,
    resident: Array.isArray(row.resident) ? row.resident[0] ?? null : row.resident ?? null,
  }));
}

export async function scheduleBlotterAction(input: {
  id: number;
  appointmentDate: string;
}): Promise<ActionResult> {
  const auth = await getAuthenticatedOperator();
  if (!auth.ok) return { success: false, error: auth.error };

  const isoDate = parseManilaTimestamp(input.appointmentDate);
  if (!isoDate) {
    return { success: false, error: "Invalid appointment date." };
  }

  const { data, error } = await auth.supabase
    .from("tbl_appointment_blotter")
    .update({
      blotter_status: "scheduled",
      appointment_date: isoDate,
      reviewed_by: auth.operatorId,
    })
    .eq("id", input.id)
    .select(
      "id, resident_id, description, appointment_date, reviewed_by, blotter_status, rejection_reason, created_at"
    )
    .single();

  if (error) return { success: false, error: error.message };

  return { success: true, data: data as BlotterRow };
}

export async function rejectBlotterAction(input: {
  id: number;
  rejectionReason: string;
}): Promise<ActionResult> {
  const auth = await getAuthenticatedOperator();
  if (!auth.ok) return { success: false, error: auth.error };

  const reason = input.rejectionReason.trim();
  if (!reason) return { success: false, error: "Rejection reason is required." };

  const { data, error } = await auth.supabase
    .from("tbl_appointment_blotter")
    .update({
      blotter_status: "rejected",
      rejection_reason: reason,
      reviewed_by: auth.operatorId,
    })
    .eq("id", input.id)
    .select(
      "id, resident_id, description, appointment_date, reviewed_by, blotter_status, rejection_reason, created_at"
    )
    .single();

  if (error) return { success: false, error: error.message };

  return { success: true, data: data as BlotterRow };
}

export async function completeBlotterAction(id: number): Promise<ActionResult> {
  const auth = await getAuthenticatedOperator();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase
    .from("tbl_appointment_blotter")
    .update({
      blotter_status: "completed",
      reviewed_by: auth.operatorId,
    })
    .eq("id", id)
    .select(
      "id, resident_id, description, appointment_date, reviewed_by, blotter_status, rejection_reason, created_at"
    )
    .single();

  if (error) return { success: false, error: error.message };

  return { success: true, data: data as BlotterRow };
}