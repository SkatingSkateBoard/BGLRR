"use server";

import {createClient} from "@/utils/supabase/client";

export async function approveResident(residentId: number) {
    const supabase = createClient();
    const {data, error} = await supabase
        .from("tbl_resident")
        .update({status: "APPROVED"})
        .eq("id", residentId);

    if (error) {
        console.error("Error approving resident:", error);
        throw new Error("Failed to approve resident");
    }

    return data;
}

export async function rejectResident(residentId: number) {
    const supabase = createClient();
    const {data, error} = await supabase.
        from("tbl_resident")
        .update({status: "REJECTED"})
        .eq("id", residentId);

    if (error) {
        console.error("Error rejecting resident:", error);
        throw new Error("Failed to reject resident");
    }

    return data;
}