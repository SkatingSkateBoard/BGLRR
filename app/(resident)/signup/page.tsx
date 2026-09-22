"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import "../../styles/signUp.css";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  // Ensuring fallback values fixes the warning on autofill
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Holds the resident form data until the user verifies their email
  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    phone: "",
    age: "",
    sex: "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    // Capture the resident info now — we'll insert it after verification
    const form = new FormData(event.currentTarget);
    setFormData({
      first_name: (form.get("first_name") as string) || "",
      middle_name: (form.get("middle_name") as string) || "",
      last_name: (form.get("last_name") as string) || "",
      suffix: (form.get("suffix") as string) || "",
      phone: (form.get("phone") as string) || "",
      age: (form.get("age") as string) || "",
      sex: (form.get("sex") as string) || "",
    });

    setLoading(true);

    // Attempts to sign up user with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is required, send the OTP and stop here.
    if (data.user && !data.session) {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });

      if (otpError) {
        setError(otpError.message);
      } else {
        setMessage("Account created. Check your email for the 6-digit code.");
      }

      setLoading(false);
      return;
    }

    // If no confirmation needed, go straight home.
    setLoading(false);
    router.push("/");
    router.refresh();
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
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

    if (data.session) {
      const { error: insertError } = await supabase.from("residents").insert({
        user_id: data?.user?.id,
        email: email,
        first_name: formData.first_name,
        middle_name: formData.middle_name || null,
        last_name: formData.last_name,
        suffix: formData.suffix || null,
        phone: formData.phone || null,
        age: formData.age ? Number(formData.age) : null,
        sex: formData.sex || null,
      });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="signup-page">
      <h1>Register your resident account</h1>
      <form onSubmit={handleSubmit}>
        <fieldset>
          <legend>General Information</legend>

          <div className="form-row">
            <label htmlFor="first-name">First Name</label>
            <input type="text" id="first-name" name="first_name" autoComplete="given-name" required/>
          </div>

          <div className="form-row">
            <label htmlFor="middle-name">Middle Name</label>
            <input type="text" id="middle-name" name="middle_name" autoComplete="additional-name"/>
          </div>

          <div className="form-row">
            <label htmlFor="last-name">Last Name</label>
            <input type="text" id="last-name" name="last_name" autoComplete="family-name" required/>
          </div>

          <div className="form-row">
            <label htmlFor="suffix">Suffix</label>
            <input type="text" id="suffix" name="suffix" placeholder="Jr., III, etc."/>
          </div>

          <div className="form-row">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" name="email" autoComplete="email" required value={email || ""} onChange={(e) => setEmail(e.target.value)}/>
          </div>

          <div className="form-row">
            <label htmlFor="phone">Phone Number</label>
            <input type="tel" id="phone" name="phone" autoComplete="tel"/>
          </div>

          <div className="form-row">
            <label htmlFor="age">Age</label>
            <input type="number" id="age" name="age" autoComplete="age" required/>
          </div>

          <div className="form-row">
            <label htmlFor="sex">Sex</label>
            <input type="text" id="sex" name="sex" autoComplete="sex"/>
          </div>

          <div className="form-row">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" autoComplete="current-password" required value={password || ""} onChange={(e) => setPassword(e.target.value)}/>
          </div>

          <div className="form-row">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input type="password" id="confirm-password" name="confirm_password" autoComplete="current-password" required value={confirmPassword || ""} onChange={(e) => setConfirmPassword(e.target.value)}/>
          </div>

          <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200">
            {loading ? "Creating account..." : "Create Account"}
          </button>

          {error && <p className="error">{error}</p>}
          {message && <p className="message">{message}</p>}
        </fieldset>
      </form>

      <form onSubmit={handleVerify}>
        <fieldset>
          <legend>Enter Verification Code</legend>

          <div className="form-row">
            <label htmlFor="otp-token">6-Digit PIN</label>
            <input
              type="text"
              id="otp-token"
              maxLength={6}
              placeholder="123456"
              value={otpToken}
              onChange={(e) => setOtpToken(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-200">
            {loading ? "Verifying..." : "Verify & Complete Setup"}
          </button>
        </fieldset>
      </form>
    </main>
  );
}