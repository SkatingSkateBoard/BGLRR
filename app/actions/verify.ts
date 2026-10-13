"use server";

import { createClient } from "@/utils/supabase/server"; 

export async function approveResident(residentId: number) {
    const supabase = await createClient(); 

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return { success: false, error: "Operator is not authenticated." };
    }

    const { data: operatorData, error: operatorError } = await supabase
        .from("tbl_operator")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (operatorError || !operatorData) {
        return { success: false, error: "Failed to locate operator record." };
    }

    const operatorId = operatorData.id;

    const { error } = await supabase
        .from("tbl_resident")
        .update({ status: "verified", verified_by: operatorId, verified_at: new Date().toISOString() })
        .eq("id", residentId);

    if (error) {
        console.error("Error approving resident:", error);
        throw new Error("Failed to approve resident");
    }

    return { success: true };
}

export async function rejectResident(residentId: number, reason: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("tbl_resident")
        .update({ status: "rejected", rejection_reason: reason })
        .eq("id", residentId);

    if (error) {
        console.error("Error rejecting resident:", error);
        throw new Error("Failed to reject resident");
    }

    return { success: true };
}