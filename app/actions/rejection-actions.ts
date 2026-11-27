'use server';

import { createClient } from "@/utils/supabase/server";

export type RejectionResult = { reason: string | null; error: string | null };

export async function getRejectionReasonAction(): Promise<RejectionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Failed to load resident session:", userError.message);
    return { reason: null, error: "Unable to retrieve the rejection reason. Please try again later." };
  }
  if (!user) return { reason: null, error: null };

  const { data, error } = await supabase
    .from("tbl_resident")
    .select("rejection_reason")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load rejection reason:", error.message);
    return { reason: null, error: "Unable to retrieve the rejection reason. Please try again later." };
  }

  return { reason: data?.rejection_reason ?? null, error: null };
}