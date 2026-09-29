"use client";

//style
import Image from "next/image";


//actions
import { login } from "@/app/actions/auth";

//deps
import { useState } from "react";
import type {SubmitEvent} from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

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

        setError(result.error || "An error occurred during login.")
        return
      }

      router.push("/operator/dashboard");
      router.refresh()
    } catch (err) {
      setLoading(false)
      setError("Something went wrong. Please try again.")
    }
  }
    return (
      <form onSubmit={handleLogin} className="relative h-screen w-full">
      <Image
        src="/login_bg_op.png"
        alt="Operator Login Background"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(35,35,184,0.65)] to-[rgba(202,202,202,0.50)]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid grid-row-3 gap-4 place-items-center mb-10 max-w-sm">
          <img
            src="/icon_bgl.png"
            alt="Barangay Greater Lagro"
            className="w-34 h-32 rounded-full"
          />
          <div className="w-full bg-white p-7 py-12 rounded-lg shadow-lg/35 flex flex-col items-center">
        
            {error && (
              <p className="text-red-500 text-[12px] mb-2 self-start">{error}</p>
            )}

            <input id="email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="text-[12px] mb-4 p-2 border border-gray-300 rounded w-full" />
            <input id="password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="text-[12px] mb-4 p-2 border border-gray-300 rounded w-full" />
            
            
            <button disabled={loading} className="cursor-pointer mt-6 bg-[rgb(32,32,162)] hover:bg-blue-800 disabled:bg-gray-400 text-[12px] text-white font-bold py-2 px-4 rounded w-full h-12" > {loading ? "Logging in..." : "Login"}</button>
          </div>
          <div className="w-full flex gap-3 place-items-center px-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="white"
              className="size-7 shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
            <p className="w-full text-center text-white text-left grow-15">
              Please contact your administrator if you have trouble logging in.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}