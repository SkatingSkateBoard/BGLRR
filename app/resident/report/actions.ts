"use server";

import { createClient } from "@/utils/supabase/server";

export async function createEmergencyRequest(category: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User is not authenticated.");
  }

  const { data: resident, error: residentError } = await supabase
    .from("tbl_resident")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (residentError || !resident) {
    throw new Error("Resident record not found.");
  }

  const { data, error } = await supabase
    .from("tbl_emergency_req")
    .insert({
      resident_id: resident.id,
      emerg_category: category,
    })
    .select()
    .single();

  if (error) {
    console.error("Insert error:", error);
    throw new Error(error.message);
  }

  console.log("Created emergency:", data);

  return {
    success: true,
    request: data,
  };
}
