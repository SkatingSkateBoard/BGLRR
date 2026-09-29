"use server";

import { createClient } from "@/utils/supabase/server"; 

export async function acceptEmergencyRequest(requestId: number) {
    const supabase = await createClient(); 
    const { error } = await supabase
        .from("tbl_emergency_req")
        .update({ status: "accepted" })
        .eq("id", requestId);

    if (error) {
        console.error("Error accepting emergency request:", error);
        throw new Error("Failed to accept emergency request");
    }

    return { success: true };
}