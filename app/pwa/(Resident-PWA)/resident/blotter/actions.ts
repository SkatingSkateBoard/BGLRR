"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getCurrentResidentId } from "@/app/actions/helpers"; // adjust to your auth helper

// Must match the <option> values in the form.
const BLOTTER_TYPES = [
  "Community concern",
  "Neighbor dispute",
  "Noise complaint",
  "Safety issue",
  "Property issue",
  "Other",
];

export type SubmitBlotterInput = {
  concernType: string;
  concern: string;
  location: string;
  requestedHelp: string;
  appointmentDate: string; // YYYY-MM-DD
};

export type SubmitBlotterResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

export async function submitBlotterReport(
  input: SubmitBlotterInput,
): Promise<SubmitBlotterResult> {
  const residentId = await getCurrentResidentId();
  if (!residentId) {
    return { ok: false, error: "Please log in again." };
  }

  // Validate on the server. Never trust the client alone.
  if (!BLOTTER_TYPES.includes(input.concernType)) {
    return { ok: false, error: "Please select a valid blotter type." };
  }
  if (!input.concern || !input.requestedHelp) {
    return { ok: false, error: "Please fill in all required fields." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.appointmentDate)) {
    return { ok: false, error: "Please select an appointment day." };
  }

  // "Today" in Manila time, not the server's timezone.
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });
  if (input.appointmentDate < today) {
    return { ok: false, error: "Please select an available appointment day." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tbl_appointment_blotter")
    .insert({
      resident_id: residentId,
      type: input.concernType,
      description: input.concern,
      location: input.location || null,
      requested_help: input.requestedHelp,
      appointment_date: input.appointmentDate,
      blotter_status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Blotter insert failed:", error);
    return {
      ok: false,
      error: "The report could not be submitted. Please try again.",
    };
  }

  revalidatePath("/resident/dashboard");
  return { ok: true, id: data.id };
}