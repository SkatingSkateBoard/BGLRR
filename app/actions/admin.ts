"use server";

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
)

export async function createOperator(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' }
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, 
      user_metadata: { 
        role: 'operator'  
      }
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, message: `Operator ${data.user.email} created successfully!` }
  } catch (err) {
    return { success: false, error: 'An unexpected error occurred.' }
  }
}