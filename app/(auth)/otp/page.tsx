"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export default function OtpPage() {
  const router = useRouter();
  const otpInputRef = useRef<HTMLInputElement>(null);

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

    const verifiedEmail: string = savedEmail;

    setEmail(verifiedEmail);
    setOtpSource(savedOtpSource || "signup");

    otpInputRef.current?.focus();

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
      setError("Email was not found. Please try again.");
      return;
    }

    if (otpToken.length < 6) {
      setError("Please enter the complete verification code.");
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

    router.push("/resident/dashboard");
    router.refresh();
  }

  async function handleResend() {
    if (!email) {
      setError("Email was not found. Please try again.");
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
      setOtpToken("");
      otpInputRef.current?.focus();
    }

    setResending(false);
  }

  return (
    <main className="fixed left-0 top-0 h-lvh w-screen overflow-hidden bg-white">
      {/* Background */}
      <div className="absolute left-0 top-0 h-[62vh] w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(35,35,184,0.92)] to-white" />

        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.15)_2px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Main content */}
      <div className="relative flex h-full min-h-lvh items-center justify-center overflow-y-auto px-5 py-10">
        <div className="flex min-h-full w-full max-w-md flex-col items-center">
          {/* Header */}
          <div className="mt-12 flex items-end gap-2">
            <img
              src="/icon_bgl.png"
              alt="Barangay Greater Lagro logo"
              className="h-20 w-22 rounded-md bg-white object-contain shadow-sm"
            />

            <div className="mb-1 text-white">
              <p className="text-[13px] leading-tight sm:text-[15px]">
                Barangay Greater Lagro
              </p>

              <p className="text-[27px] font-bold leading-tight sm:text-[34px]">
                Rapid Response
              </p>
            </div>
          </div>

          {/* OTP form */}
          <form
            onSubmit={handleVerify}
            className="mt-14 mb-8 w-full rounded-2xl bg-white/10 p-6 backdrop-blur-[2px] sm:p-7"
          >
            <div className="mb-7 text-center">
              <h1 className="text-2xl font-bold text-blue-900">
                Verify your email
              </h1>

              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                Enter the verification code sent to
              </p>

              <p className="break-all text-sm font-bold text-blue-800">
                {email || "your email address"}
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="mb-4 rounded-xl bg-red-100 p-3 text-center text-sm font-semibold text-red-700 shadow-sm"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="mb-4 rounded-xl bg-green-100 p-3 text-center text-sm font-semibold text-green-700 shadow-sm"
              >
                {message}
              </p>
            )}

            <label
              htmlFor="otp-token"
              className="mb-2 block text-sm font-semibold text-blue-900"
            >
              Verification code
            </label>

            <input
              ref={otpInputRef}
              id="otp-token"
              name="otp-token"
              type="text"
              value={otpToken}
              onChange={(event) => {
                const onlyNumbers = event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 8);

                setOtpToken(onlyNumbers);
                setError("");
              }}
              maxLength={8}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,8}"
              placeholder="123456"
              required
              className="h-14 w-full rounded-xl border border-blue-300 bg-white/80 px-4 text-center text-2xl font-bold tracking-[0.45em] text-blue-900 outline-none transition placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-300"
            />

            <button
              type="submit"
              disabled={loading || otpToken.length < 6}
              className="mt-6 h-13 w-full cursor-pointer rounded-xl bg-[rgb(237,41,44)] px-4 py-2 text-base font-bold text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {loading ? "Verifying..." : "Verify email"}
            </button>

            <div className="mt-5 text-center text-sm text-gray-700">
              Didn&apos;t receive the code?
            </div>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending || !email}
              className="mt-2 h-12 w-full cursor-pointer rounded-xl bg-[rgb(32,32,162)] px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {resending ? "Sending..." : "Send code again"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-4 w-full cursor-pointer text-center text-sm font-semibold text-blue-800 hover:underline"
            >
              Back to login
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
