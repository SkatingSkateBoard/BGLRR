"use server";

import { createClient } from "@/utils/supabase/server"; 


export async function createEmergencyRequest(residentId: number, description: string) {
    const supabase = await createClient(); 
    const { data, error } = await supabase
        .from("tbl_emergency_request")
        .insert({ resident_id: residentId, description: description });

    if (error) {
        console.error("Error creating emergency request:", error);
        throw new Error("Failed to create emergency request");
    }

    return { success: true };
}