"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

type Result = { success: true; message: string } | { success: false; error: string };

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

async function createAuthUser(email: string, password: string, role: "operator" | "responder") {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  });

  if (error || !data.user) {
    return { user: null, error: error?.message ?? "Could not create the login account." };
  }
  return { user: data.user, error: null };
}

export async function createOperator(formData: FormData): Promise<Result> {
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const username = field(formData, "username") || null;

  if (!email || password.length < 8) {
    return { success: false, error: "Email and a password of at least 8 characters are required." };
  }

  const { user, error } = await createAuthUser(email, password, "operator");
  if (!user) return { success: false, error: error! };

  const { error: insertError } = await supabaseAdmin
    .from("operators")
    .insert({ user_id: user.id, email, username });

  if (insertError) {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    console.error("[createOperator]", insertError.message);
    return { success: false, error: "Could not save the operator. The account was not created." };
  }

  return { success: true, message: `Operator ${email} created.` };
}

export async function createResponder(formData: FormData): Promise<Result> {
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const firstName = field(formData, "first_name");
  const middleName = field(formData, "middle_name") || null;
  const surname = field(formData, "surname");
  const branch = field(formData, "branch");

  if (!email || password.length < 8 || !firstName || !surname || !branch) {
    return {
      success: false,
      error: "Email, a password of at least 8 characters, first name, surname, and branch are required.",
    };
  }

  const { user, error } = await createAuthUser(email, password, "responder");
  if (!user) return { success: false, error: error! };

  const { error: insertError } = await supabaseAdmin.from("tbl_responder").insert({
    user_id: user.id,
    email,
    first_name: firstName,
    middle_name: middleName,
    surname,
    branch,
  });

  if (insertError) {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    console.error("[createResponder]", insertError.message);
    return { success: false, error: "Could not save the responder. The account was not created." };
  }

  return { success: true, message: `Responder ${email} created.` };
}