import Link from "next/link";
import { X } from "lucide-react";
import { logout } from "../actions/auth";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div
          aria-hidden="true"
          className="grid h-20 w-20 place-items-center rounded-[1.4rem] bg-gradient-to-b from-red-500 to-red-700 shadow-[0_10px_24px_rgba(220,38,38,0.35)]"
        >
          <div className="grid h-14 w-14 place-items-center rounded-full bg-red-900/25 ring-1 ring-white/10">
            <X className="h-7 w-7 text-white" strokeWidth={3} />
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
          Access denied
        </h1>

        <div className="mt-6 w-full rounded-3xl border border-red-200/70 bg-gradient-to-b from-red-50 to-white p-5 shadow-[0_10px_30px_rgba(220,38,38,0.12)]">
          <p className="text-sm font-semibold text-slate-700">
            Your account is not authorized to view this page.
          </p>

          <div className="mt-4 rounded-2xl border border-red-100 bg-white px-4 py-3 text-left">
            <p className="text-xs font-bold text-red-700">Reason</p>
            <p className="mt-0.5 text-sm leading-6 text-red-700">
              This page is restricted to a different role. Go back, or sign out
              and use an authorized account.
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-b from-red-500 to-red-700 text-sm font-bold text-white shadow-[0_8px_20px_rgba(220,38,38,0.35)] transition hover:from-red-600 hover:to-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
        >
          Go back
        </Link>

        <form action={logout} className="mt-3">
          <button
            type="submit"
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          >
            Sign out
          </button>
        </form>

        <p className="mt-8 text-xs font-semibold italic text-slate-500">
          Pindot mo, Rescue ko.
        </p>
      </div>
    </main>
  );
}