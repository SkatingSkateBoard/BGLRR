"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export default function OtpPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otpSource, setOtpSource] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("signupEmail");
    const savedOtpSource = sessionStorage.getItem("otpSource");

    if (!savedEmail) {
      setError("Email was not found. Please try again.");
      return;
    }

    const verifiedEmail = savedEmail;

    setEmail(verifiedEmail);
    setOtpSource(savedOtpSource || "signup");

    async function automaticallyResendCode() {
      if (savedOtpSource !== "login") {
        return;
      }

      setResending(true);
      setError("");
      setMessage("");

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: verifiedEmail,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage("A new verification code was sent to your email.");
      }

      setResending(false);
    }

    automaticallyResendCode();
  }, []);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email) {
      setError("Email was not found.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otpToken,
      type: "signup",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    sessionStorage.removeItem("signupEmail");
    sessionStorage.removeItem("otpSource");

    if (!data.session) {
      setError("Verification succeeded, but no session was created.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleResend() {
    if (!email) {
      setError("Email was not found.");
      return;
    }

    setResending(true);
    setError("");
    setMessage("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("A new verification code was sent to your email.");
    }

    setResending(false);
  }

  return (
    <main className="otp-page">
      <h1>Verify your email</h1>

      <p>
        Enter the code sent to{" "}
        <strong>{email || "your email address"}</strong>.
      </p>

      <form onSubmit={handleVerify}>
        <label htmlFor="otp-token">Verification code</label>

        <input
          id="otp-token"
          type="text"
          value={otpToken}
          onChange={(event) =>
            setOtpToken(event.target.value.replace(/\D/g, ""))
          }
          maxLength={8}
          inputMode="numeric"
          placeholder="12345678"
          required
        />

        {error && <p className="error">{error}</p>}
        {message && <p className="message">{message}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify email"}
        </button>
      </form>

      <p>
        Didn’t receive the code?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || !email}
        >
          {resending ? "Sending..." : "Send code again"}
        </button>
      </p>
    </main>
  );
}
