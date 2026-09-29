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
