"use server";

import { createClient } from "@/utils/supabase/server"; 
import { notifyResidents } from "./notify";

function parseManilaTimestamp(scheduledAt?: string): string {
  if (!scheduledAt) return new Date().toISOString();

  // If it already includes 'Z' or a timezone offset like '+08:00', parse directly
  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(scheduledAt);
  if (hasTimezone) {
    return new Date(scheduledAt).toISOString();
  }

  // Otherwise treat naive datetime-local strings as Philippine Time (UTC+8)
  return new Date(`${scheduledAt}+08:00`).toISOString();
}
//announcement schema
export interface AnnouncementRow {
  id: number;
  title: string;
  description: string;
  isScheduled: boolean;
  isPushed: boolean;
  scheduled_at: string;
  created_at: string;
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

  return data || [];
} 

export async function createAnnouncementAction(input: {
  title: string;
  description: string;
  isScheduled: boolean;
  scheduledAt?: string;
}) {
  const supabase = await createClient();

  // Optional: get current logged-in operator ID if linked to auth.users
  const { data: { user } } = await supabase.auth.getUser();
  const { data: operatorData } = await supabase
    .from("tbl_operator")
    .select("id")
    .eq("user_id", user?.id)
    .single();

  const isImmediate = !input.isScheduled;

  const releaseTimestamp =
    input.isScheduled && input.scheduledAt
      ? parseManilaTimestamp(input.scheduledAt)
      : new Date().toISOString();

  const { data, error } = await supabase
    .from("tbl_announcement")
    .insert({
      title: input.title,
      description: input.description,
      isScheduled: input.isScheduled,
      isPushed: isImmediate, // true immediately if NOT scheduled; false if scheduled
      scheduled_at: releaseTimestamp,
      operator_id: operatorData?.id ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Send push notification to residents right away if not scheduled
  if (isImmediate && data) {
    await notifyResidents({
      id: data.id,
      title: data.title,
      description: data.description,
    });
  }

  return data as AnnouncementRow;
}


export async function deleteAnnouncementAction(id: number) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tbl_announcement")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
export async function updateAnnouncementAction(input: {
  id: number;
  title: string;
  description: string;
  isScheduled: boolean;
  scheduledAt?: string;
}) {
  const supabase = await createClient();

  const releaseTimestamp =
    input.isScheduled && input.scheduledAt
      ? parseManilaTimestamp(input.scheduledAt)
      : new Date().toISOString();

  const { data, error } = await supabase
    .from("tbl_announcement")
    .update({
      title: input.title,
      description: input.description,
      isScheduled: input.isScheduled,
      scheduled_at: releaseTimestamp,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as AnnouncementRow;
}