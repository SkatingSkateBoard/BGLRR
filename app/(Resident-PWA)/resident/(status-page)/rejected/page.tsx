import StatusScreen from "@/components/resident-comps/StatusScreen";
import { createClient } from "@/utils/supabase/server";

async function getRejectionReason(): Promise<{ reason: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Failed to load resident session for rejection reason:", userError.message);
    return { reason: null, error: "Unable to retrieve the rejection reason. Please try again later." };
  }
  if (!user) return { reason: null, error: null };

  const { data, error } = await supabase
    .from("tbl_resident")
    .select("rejection_reason")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load resident rejection reason:", error.message);
    return { reason: null, error: "Unable to retrieve the rejection reason. Please try again later." };
  }

  return { reason: data?.rejection_reason ?? null, error: null };
}

export default async function RejectedResidentPage() {
  const { reason, error } = await getRejectionReason();

  return (
    <StatusScreen
      tone="rejected"
      title="Account not approved"
      actionLabel="Return to login"
      actionHref="/resident/login"
    >
      <p>Your account was not approved by the BPSO.</p>
      <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-left shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)]">
        <span className="block text-xs font-extrabold text-red-700">Reason</span>
        {error ? (
          <span role="alert" className="font-medium text-red-700">{error}</span>
        ) : (
          reason ?? "No reason was recorded."
        )}
      </p>
    </StatusScreen>
  );
}