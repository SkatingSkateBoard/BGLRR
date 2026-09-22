// app/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { logout } from "./actions/auth";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log(user?.user_metadata || "No user metadata found");

  if (!user) {
    redirect("/login");
  }

  return (
    <main>
      <h1>Welcome</h1>
      <p>You are logged in.</p>

      <form action={logout}>
        <button type="submit">Logout</button>
      </form>
    </main>
  );
}
