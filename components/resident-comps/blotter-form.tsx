"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "bglrr-blotter-reports";

const CONCERN_TYPES = [
  "Alalahanin ng komunidad",
  "Away ng magkapitbahay",
  "Reklamo sa ingay",
  "Isyu sa kaligtasan",
  "Isyu sa ari-arian",
  "Iba pa",
];

const GOLD_BTN =
  "bg-linear-to-b from-[#f2bd3d] to-[#c98a0e] " +
  "shadow-[0_8px_16px_rgba(201,138,14,0.35),inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-3px_0_rgba(0,0,0,0.12)] " +
  "active:translate-y-0.5 active:shadow-[0_3px_8px_rgba(201,138,14,0.35),inset_0_2px_0_rgba(255,255,255,0.35)]";

const FIELD =
  "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 " +
  "placeholder:text-zinc-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] " +
  "focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-300/40";

const LABEL = "mb-1.5 block text-sm font-bold text-zinc-700";

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#fff" aria-hidden="true">
      <path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V8h4.5L13 3.5ZM7 12h10v1.6H7V12Zm0 3.4h10V17H7v-1.6Zm0-6.8h4v1.6H7V8.6Z" />
    </svg>
  );
}

export default function BlotterReportingForm() {
  const router = useRouter();
  const [status, setStatus] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const read = (name: string) => {
      const value = formData.get(name);
      return typeof value === "string" ? value.trim() : "";
    };

    const report = {
      id: crypto.randomUUID(),
      concernType: read("concernType"),
      concern: read("concern"),
      location: read("location"),
      requestedHelp: read("requestedHelp"),
      createdAt: new Date().toISOString(),
    };

    if (!report.concernType || !report.concern || !report.requestedHelp) {
      setStatus({ type: "error", text: "Kumpletuhin ang mga kinakailangang field." });
      return;
    }

    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      localStorage.setItem(STORAGE_KEY, JSON.stringify([report, ...existing]));
      form.reset();
      setStatus({ type: "ok", text: "Na-save na ang report sa browser na ito." });
    } catch {
      setStatus({ type: "error", text: "Hindi na-save ang report. Subukan ulit." });
    }
  }

  return (
    <main className="min-h-dvh bg-white px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-zinc-900">
      <div className="mx-auto w-full max-w-[420px]">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-800 active:scale-[0.98]"
        >
          <span aria-hidden="true">←</span> Back
        </button>

        <div className="mt-8 flex flex-col items-center text-center">
          <div
            className={`mb-4 flex h-20 w-20 items-center justify-center rounded-3xl ${GOLD_BTN}`}
            aria-hidden="true"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-700/25 shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)]">
              <DocIcon />
            </span>
          </div>
          <h1 className="text-2xl font-extrabold">Blotter</h1>
          <p className="mt-1 max-w-xs text-sm font-semibold leading-snug text-zinc-500">
            Ilahad ang inyong alalahanin at sasagutin ito ng barangay.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="concernType" className={LABEL}>Uri ng blotter</label>
            <select id="concernType" name="concernType" required defaultValue="" className={FIELD}>
              <option value="" disabled>Pumili ng uri</option>
              {CONCERN_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="concern" className={LABEL}>Ano ang inyong pangunahing alalahanin?</label>
            <textarea
              id="concern"
              name="concern"
              required
              rows={4}
              placeholder="Ilahad ang nangyari at sino o ano ang apektado."
              className={`${FIELD} resize-y`}
            />
          </div>

          <div>
            <label htmlFor="location" className={LABEL}>
              Saan ito nangyari? <span className="font-semibold text-zinc-400">(opsyonal)</span>
            </label>
            <input
              id="location"
              name="location"
              type="text"
              placeholder="Kalye, landmark, o lugar"
              className={`${FIELD} h-12 py-0`}
            />
          </div>

          <div>
            <label htmlFor="requestedHelp" className={LABEL}>Paano kayo matutulungan ng barangay?</label>
            <textarea
              id="requestedHelp"
              name="requestedHelp"
              required
              rows={3}
              placeholder="Sabihin ang tulong o resulta na inaasahan ninyo."
              className={`${FIELD} resize-y`}
            />
          </div>

          <button
            type="submit"
            className={`h-14 w-full rounded-2xl text-base font-extrabold text-white active:scale-[0.99] ${GOLD_BTN}`}
          >
            Ipadala ang report
          </button>
        </form>

        {status && (
          <p
            role={status.type === "error" ? "alert" : "status"}
            className={`mt-5 rounded-2xl px-4 py-3 text-sm font-bold ${
              status.type === "error"
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {status.text}
          </p>
        )}

        <p className="mt-10 text-center text-xs font-semibold italic text-zinc-400">
          pindot mo, rescue ko
        </p>
      </div>
    </main>
  );
}