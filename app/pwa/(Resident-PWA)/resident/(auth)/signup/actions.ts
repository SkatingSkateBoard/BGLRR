"use server"

import { createClient, createAdminClient } from "@/utils/supabase/server"
import { UserFormValues } from "@/types/index"

export async function signUpResident(formData: UserFormValues) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    let uploadedPath: string | null = null;

    // 1. Upload file to Supabase Storage if they are not a permanent resident
    if (!formData.has_permanent_address && formData.proof_of_accommodation) {
      const file = formData.proof_of_accommodation;
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from("accommodation-photos")
        .upload(fileName, file);

      if (uploadError) {
        return { success: false, error: `Upload failed: ${uploadError.message}` }
      }

      uploadedPath = uploadData.path;
    }

    // 2. Sign up the resident
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.first_name,
          middle_name: formData.middle_name,
          last_name: formData.last_name,
          suffix: formData.suffix,
          phone: formData.phone,
          age: formData.age.toString(),
          gender: formData.sex,
          has_permanent_address: formData.has_permanent_address,
          current_address: formData.current_address,
          reason: formData.reason,
          specify_reason: formData.specify_reason,
          proof_of_accommodation: uploadedPath,
          has_history: formData.has_history,
          medical_description: formData.medical_description,
          emergency_person: formData.emergency_person,
          emergency_contact_number: formData.emergency_contact_number,
          role: "resident",
        }
      }
    })

    if (error) {
      // Clean up the uploaded photo if account creation fails
      if (uploadedPath) {
        await supabaseAdmin.storage.from("accommodation-photos").remove([uploadedPath]);
      }
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred." }
  }
}