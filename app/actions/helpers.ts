//helpers
import { createClient } from "@/utils/supabase/server";

export async function getCurrentResidentId(): Promise<number | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("tbl_resident")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Resident lookup failed:", error);
    return null;
  }

  return data?.id ?? null;
}
