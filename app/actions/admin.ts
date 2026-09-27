"use server";

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
)

export async function createOperator(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const username = formData.get('username') as string
 
  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' }
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, 
    })

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message ?? 'Could not create Auth user.',
      }
    }

    const { error: operatorError } = await supabaseAdmin.from('operators').insert({
      user_id: authData.user.id,
      email: authData.user.email,
      username: username,
    })

    if (operatorError) {
      return { success: false, error: operatorError.message }
    }

    return { success: true, message: `Operator ${authData.user.email} created successfully!` }
  } catch (err) {
    return { success: false, error: 'An unexpected error occurred.' }
  }
}