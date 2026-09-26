"use client";

//style
import "../../styles/loginPage.css";

import { useState } from "react";
import type {SubmitEvent} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
       setLoading(false);

      const isEmailNotConfirmed = error.code === "email_not_confirmed" || error.message.toLowerCase().includes("email not confirmed");
      console.log(isEmailNotConfirmed, "isEmailNotConfirmed");
    if (isEmailNotConfirmed) {
      sessionStorage.setItem("signupEmail", email);
      sessionStorage.setItem("otpSource", "login");
      router.push("/otp");
      return;
    }

    setError(error.message);
    return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="login-page">
      <h1>Login</h1>

      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="email">Email orrrrrr: </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password">Password: </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error && <p>{error}</p>}

        <button type="submit" disabled={loading} className="submitBtn">
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p>No Account?{" "}
        <a href="/signup">Sign Up</a>
      </p>
    </main>
  );
}
