"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/resident/login");
}
//resident
export async function login(email: string, password: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const isEmailNotConfirmed = 
      error.code === "email_not_confirmed" || 
      error.message.toLowerCase().includes("email not confirmed")

    return {
      success: false,
      error: error.message,
      isEmailNotConfirmed,
    }
  }

  return { success: true }
}

//operator todo

export async function operatorLogin(identifier: string, password: string) {

}

export async function isResidentVerified() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { success: false, error: "User is not authenticated." };
  }

  const {data: resident, error: residentError } = await supabase
    .from("tbl_resident")
    .select("status")
    .eq("user_id", user.id)
    .single();
    
  if (residentError || !resident) {
    return { success: false, error: "Resident record not found." };
  }

  return { success: true, status: resident.status};
}
