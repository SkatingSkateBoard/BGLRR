"use server"

import { createClient } from "@/utils/supabase/server" // Make sure this path points to your server client helper
import { UserFormValues } from "@/types/index"

export async function signUpResident(formData: UserFormValues) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.first_name,
          middle_name: formData.middle_name,
          last_name: formData.last_name,
          suffix: formData.suffix,
          phone: formData.phone,
          age: formData.age,
          gender: formData.sex,
          has_permanent_address: formData.has_permanent_address,
          current_address: formData.current_address,
          reason: formData.reason,
          specify_reason: formData.specify_reason,
          has_history: formData.has_history,
          medical_description: formData.medical_description,
          emergency_person: formData.emergency_person,
          emergency_contact_number: formData.emergency_contact_number,
          role: "resident",
        }
      }
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred." }
  }
}