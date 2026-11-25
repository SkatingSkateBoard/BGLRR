"use server";

import { createClient } from "@/utils/supabase/server";
import { notifyResidents } from "./notify";

// announcement schema
export interface AnnouncementRow {
  id: number;
  title: string;
  description: string;
  isScheduled: boolean;
  isPushed: boolean;
  scheduled_at: string;
  created_at: string;
}

export interface CreateAnnouncementInput {
  title: string;
  description: string;
  isScheduled: boolean;
  scheduledAt?: string;
}

export interface UpdateAnnouncementInput {
  id: number;
  title: string;
  description: string;
  isScheduled?: boolean;
  scheduledAt?: string;
}

// The client always sends a UTC ISO string. Reject anything without an offset so the
// Workers runtime (which runs in UTC) can never misread a local time.
function toValidIso(value: string): string {
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error("scheduledAt must include a timezone offset");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid scheduled date/time");
  }
  return date.toISOString();
}

function resolveReleaseTimestamp(isScheduled: boolean, scheduledAt?: string): string {
  if (isScheduled) {
    if (!scheduledAt) throw new Error("A release time is required for scheduled posts");
    return toValidIso(scheduledAt);
  }
  return new Date().toISOString();
}

export async function getAnnouncementsAction(): Promise<AnnouncementRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tbl_announcement")
    .select("id, title, description, isScheduled, isPushed, scheduled_at, created_at")
    .order("scheduled_at", { ascending: false });

  if (error) {
    console.error("Error fetching announcements:", error.message);
    return [];
  }

  return data ?? [];
}

export async function createAnnouncementAction(input: CreateAnnouncementInput): Promise<AnnouncementRow> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  let operatorId: number | null = null;
  if (user) {
    const { data: operator } = await supabase
      .from("tbl_operator")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    operatorId = operator?.id ?? null;
  }

  const isImmediate = !input.isScheduled;

  const { data, error } = await supabase
    .from("tbl_announcement")
    .insert({
      title: input.title,
      description: input.description,
      isScheduled: input.isScheduled,
      isPushed: isImmediate,
      scheduled_at: resolveReleaseTimestamp(input.isScheduled, input.scheduledAt),
      operator_id: operatorId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const row = data as AnnouncementRow;

  // Inserts are pushed here directly. The webhook only handles UPDATE, so this is the single send path.
  if (isImmediate) {
    try {
      await notifyResidents({ id: row.id, title: row.title, description: row.description });
    } catch (err) {
      // The row is saved. Don't surface an error that would make the admin retry and duplicate it.
      console.error("Push failed for announcement", row.id, err);
    }
  }

  return row;
}

export async function updateAnnouncementAction(input: UpdateAnnouncementInput): Promise<AnnouncementRow> {
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("tbl_announcement")
    .select("isPushed")
    .eq("id", input.id)
    .single();

  if (fetchError || !existing) throw new Error("Announcement not found");

  const update: Record<string, unknown> = {
    title: input.title,
    description: input.description,
    updated_at: new Date().toISOString(),
  };

  // Schedule changes are only allowed before the post has gone out.
  if (!existing.isPushed && input.isScheduled !== undefined) {
    update.isScheduled = input.isScheduled;
    update.scheduled_at = resolveReleaseTimestamp(input.isScheduled, input.scheduledAt);
    // Push Now sets isPushed = true, and the UPDATE webhook sends the push.
    update.isPushed = !input.isScheduled;
  }

  let query = supabase.from("tbl_announcement").update(update).eq("id", input.id);

  // Guard against the cron job pushing this row between the read above and this write.
  if (!existing.isPushed) query = query.eq("isPushed", false);

  const { data, error } = await query.select().single();

  if (error || !data) throw new Error("Could not update this announcement");

  return data as AnnouncementRow;
}

export async function deleteAnnouncementAction(id: number): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("tbl_announcement").delete().eq("id", id);

  if (error) throw new Error(error.message);
}