"use client";

//style
import "@/app/styles/loginPage.css";


//actions
import { login } from "@/app/actions/auth";

//deps
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

    try {
      const result = await login(email, password)

      if (!result.success) {
        setLoading(false)

        if (result.isEmailNotConfirmed) {
          sessionStorage.setItem("signupEmail", email)
          sessionStorage.setItem("otpSource", "login")
          router.push("/otp")
          return
        }

        setError(result.error || "An error occurred during login.")
        return
      }

      router.push("/")
      router.refresh()
    } catch (err) {
      setLoading(false)
      setError("Something went wrong. Please try again.")
    }
  }

  return (
    <main className="login-page">
      <h1>Login</h1>

      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="email">Email or Phone Number: </label>
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
