"use client";

//actions
import { login } from "@/app/actions/auth";

//deps
import { useState, useEffect } from "react";
import type { FormEvent } from "react"; // Fixed to standard React FormEvent type
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bgHeight, setBgHeight] = useState<number>();

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const result = await login(email, password);

      if (!result.success) {
        setLoading(false);

        if (result.isEmailNotConfirmed) {
          sessionStorage.setItem("signupEmail", email);
          sessionStorage.setItem("otpSource", "login");
          router.push("/otp");
          return;
        }

        setError(result.error || "An error occurred during login.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  }

  const moveToRegister = () => {
    router.push("/signup"); 
  };

  useEffect(() => {
    const measure = () => setBgHeight(screen.height);
    measure();
    const onOrient = () => setTimeout(measure, 300);
    window.addEventListener("orientationchange", onOrient);
    return () => window.removeEventListener("orientationchange", onOrient);
  }, []);

  return (
    <main className="fixed left-0 top-0 h-lvh w-screen bg-white overflow-hidden">
      <div
        className="absolute left-0 top-0 h-lvh w-full"
        style={{ height: bgHeight }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(35,35,184,0.90)] to-white" />
        <div className="absolute inset-0 bg-transparent bg-[radial-gradient(rgba(255,255,255,0.15)_2px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <div className="relative inset-0 flex items-center justify-center">
        <div className="flex flex-col h-full place-items-center">
          <div className="flex items-end gap-2 mb-auto mt-20">
            <img src="/icon_bgl.png" className="bg-white h-20 w-22" alt="BGL Logo" />
            <div className="grid-row-2 text-white">
              <p>Barangay Greater Lagro</p>
              <p className="font-bold text-[34px]">Rapid Response</p>
            </div>
          </div>

          <form 
            onSubmit={handleLogin}
            className="bg-white/0 flex flex-col p-7 w-screen md:w-115 text-white mt-10 mb-30"
          >

            {error && (
              <p className="text-red-500 font-bold text-[14px] mb-4 bg-white/90 p-2 rounded-xl text-center shadow-sm">
                {error}
              </p>
            )}

            <label htmlFor="email">Email or Phone Number</label>
            <input type="text" id="email" placeholder="example@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required 
            className="text-[14px] mb-2 p-2 border border-white rounded-[3vw] md:rounded-xl focus:outline-none w-full h-12 bg-white/20" />

            <label htmlFor="password">Password</label>
            <input type="password" id="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required 
            className="text-[14px] p-2 border border-white rounded-[3vw] md:rounded-xl focus:outline-none w-full h-12 bg-white/20" />

            <div className="mb-5 font-bold text-blue-700 text-right w-full cursor-pointer hover:underline text-[14px]">
              Forgot password?
            </div>

            <button
              type="submit"
              disabled={loading}
              className="shadow-md/20 cursor-pointer mt-4 mb-3 bg-[rgb(237,41,44)] hover:bg-red-700 disabled:bg-gray-400 text-[16px] text-white font-bold py-2 px-4 rounded-[3vw] md:rounded-xl w-full h-13"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="mt-2 text-black text-center w-full mb-2 text-[14px]">
              No account? Sign up here.
            </div>

            <button
              type="button"
              onClick={moveToRegister}
              className="shadow-md/20 cursor-pointer bg-[rgb(32,32,162)] hover:bg-blue-800 text-[16px] text-white font-bold py-2 px-4 rounded-[3vw] md:rounded-xl w-full h-13"
            >
              Register
            </button>

            {/* Bottom Support Information Section */}
            <div className="flex flex-col items-center mt-10">
              <p className="text-black font-bold mb-1">Questions?</p>
              <div className="flex flex-row gap-1 justify-center px-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="black"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                  />
                </svg>
                <p className="text-center text-black">0987 654 3210</p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
