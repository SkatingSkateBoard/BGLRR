"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveBlotterReport } from "@/lib/blotterReports";

/* Gold "Blotter" tile palette, lifted from the dashboard */
const GOLD_BTN =
  "bg-linear-to-b from-[#f2bd3d] to-[#c98a0e] " +
  "shadow-[0_8px_16px_rgba(201,138,14,0.35),inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-3px_0_rgba(0,0,0,0.12)] " +
  "active:translate-y-0.5 active:shadow-[0_3px_8px_rgba(201,138,14,0.35),inset_0_2px_0_rgba(255,255,255,0.35)]";

/* Pressed-in field look so inputs match the raised tiles */
const FIELD =
  "w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 " +
  "shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] placeholder:font-medium placeholder:text-slate-400 " +
  "focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-300/50";

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#fff" aria-hidden="true">
      <path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V8h4.5L13 3.5ZM7 12h10v1.6H7V12Zm0 3.4h10V17H7v-1.6Zm0-6.8h4v1.6H7V8.6Z" />
    </svg>
  );
}

export default function BlotterReportingForm() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const readField = (name: string) => {
      const value = formData.get(name);
      return typeof value === "string" ? value.trim() : "";
    };

    try {
      const report = saveBlotterReport({
        concernType: readField("concernType"),
        concern: readField("concern"),
        location: readField("location"),
        requestedHelp: readField("requestedHelp"),
      });

      setSubmissionError("");
      setSubmissionMessage(
        `Report saved in this browser. Report ID: ${report.id.slice(0, 8)}.`,
      );
      form.reset();
    } catch (error) {
      console.error("Failed to save blotter report:", error);
      setSubmissionMessage("");
      setSubmissionError(
        "The report could not be saved in this browser. Please try again.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-white px-5 pb-10 pt-5 text-slate-900">
      <section className="mx-auto w-full max-w-md">
        {/* Header: hamburger (Log out only) + notifications */}
        <header className="relative mb-4 flex items-center justify-between">
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-lg p-1"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute left-0 top-11 z-10 w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.15)]">
              <button
                type="button"
                onClick={() => router.push("/resident/login")}
                className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-extrabold text-red-700 hover:bg-red-50"
              >
                Log out
              </button>
            </div>
          )}

          <button type="button" aria-label="Notifications" className="rounded-lg p-1">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
              <path d="M10.3 20a2 2 0 0 0 3.4 0" />
            </svg>
          </button>
        </header>

        {/* Title block with the gold Blotter tile icon */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className={`mb-3 flex h-20 w-20 items-center justify-center rounded-3xl ${GOLD_BTN}`}
            aria-hidden="true"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-700/25 shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)]">
              <DocIcon />
            </span>
          </div>
          <h1 className="text-2xl font-extrabold leading-tight">Blotter</h1>
          <p className="mt-1 max-w-xs text-sm font-bold leading-snug text-slate-700">
            Describe your concern and the barangay will respond.
          </p>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-linear-to-b from-amber-50 to-white p-5 shadow-[0_10px_24px_rgba(201,138,14,0.15)]">
          <div className="mb-5 rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">
            Preview only: reports are saved in this browser and are not synced
            to a server.
          </div>

          <form onSubmit={handleSubmit} data-preview-local="true" className="space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-extrabold">Blotter type</span>
              <select
                name="concernType"
                required
                defaultValue=""
                className={FIELD}
              >
                <option value="" disabled>Select a type</option>
                <option>Community concern</option>
                <option>Neighbor dispute</option>
                <option>Noise complaint</option>
                <option>Safety issue</option>
                <option>Property issue</option>
                <option>Other</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-extrabold">What is your main concern?</span>
              <textarea
                name="concern"
                required
                rows={4}
                placeholder="Describe what happened and who or what is affected."
                className={`${FIELD} resize-y`}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-extrabold">Where did this happen? (optional)</span>
              <input
                name="location"
                type="text"
                placeholder="Street, landmark, or location"
                className={FIELD}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-extrabold">How can the barangay help you?</span>
              <textarea
                name="requestedHelp"
                required
                rows={3}
                placeholder="Describe the help or outcome you are requesting."
                className={`${FIELD} resize-y`}
              />
            </label>

            <button
              type="submit"
              className={`w-full rounded-2xl px-4 py-4 text-base font-extrabold text-white transition ${GOLD_BTN}`}
            >
              Submit report
            </button>
          </form>

          {submissionError && (
            <p
              role="alert"
              className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800"
            >
              {submissionError}
            </p>
          )}

          {submissionMessage && (
            <p
              role="status"
              className="mt-5 rounded-2xl bg-linear-to-b from-emerald-400 to-emerald-600 p-4 text-sm font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.35)]"
            >
              {submissionMessage}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => router.push("/resident/dashboard")}
          className="mx-auto mt-6 block rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-extrabold text-slate-700 shadow-[0_3px_8px_rgba(0,0,0,0.1)] active:translate-y-px"
        >
          Back to dashboard
        </button>

        <p className="mt-8 text-center text-xs font-bold italic text-slate-500">Pindot mo, Rescue ko</p>
      </section>
    </main>
  );
}