"use server";

import { createClient } from "@/utils/supabase/server"; 

export async function approveResident(residentId: number) {
    const supabase = await createClient(); 
    const { data, error } = await supabase
        .from("tbl_resident")
        .update({ status: "verified" })
        .eq("id", residentId);

    if (error) {
        console.error("Error approving resident:", error);
        throw new Error("Failed to approve resident");
    }

    return { success: true };
}

export async function rejectResident(residentId: number) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("tbl_resident")
        .update({ status: "rejected" })
        .eq("id", residentId);

    if (error) {
        console.error("Error rejecting resident:", error);
        throw new Error("Failed to reject resident");
    }

    return { success: true };
}