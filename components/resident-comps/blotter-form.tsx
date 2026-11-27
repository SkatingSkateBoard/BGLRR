"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitBlotterReport } from "@/app/pwa/(Resident-PWA)/resident/blotter/actions";

const TZ = "Asia/Manila";

// Returns YYYY-MM-DD for a Date, in Manila time.
function formatManilaDate(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: TZ });
}

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

const BLOTTER_TYPES = [
  "Community concern",
  "Neighbor dispute",
  "Noise complaint",
  "Safety issue",
  "Property issue",
  "Other",
];

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#fff" aria-hidden="true">
      <path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V8h4.5L13 3.5ZM7 12h10v1.6H7V12Zm0 3.4h10V17H7v-1.6Zm0-6.8h4v1.6H7V8.6Z" />
    </svg>
  );
}

export default function BlotterReportingForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const [year, month] = formatManilaDate(new Date()).split("-").map(Number);
    return new Date(year, month - 1, 1);
  });

  const today = formatManilaDate(new Date());
  const monthLabel = calendarMonth.toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });
  const daysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0,
  ).getDate();
  const firstWeekday = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1,
  ).getDay();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const readField = (name: string) => {
      const value = formData.get(name);
      return typeof value === "string" ? value.trim() : "";
    };

    if (!appointmentDate || appointmentDate < today) {
      setSubmissionMessage("");
      setSubmissionError("Please select an available appointment day.");
      return;
    }

    setSubmissionError("");
    setSubmissionMessage("");

    startTransition(async () => {
      const result = await submitBlotterReport({
        concernType: readField("concernType"),
        concern: readField("concern"),
        location: readField("location"),
        requestedHelp: readField("requestedHelp"),
        appointmentDate,
      });

      if (!result.ok) {
        setSubmissionError(result.error);
        return;
      }

      setSubmissionMessage(`Report submitted. Reference #${result.id}.`);
      form.reset();
      setAppointmentDate("");
    });
  }

  return (
    <main className="h-dvh overflow-y-auto overscroll-contain bg-white px-5 pb-10 pt-5 text-slate-900">
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

        {/* Title block */}
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
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-extrabold">Blotter type</span>
              <select name="concernType" required defaultValue="" className={FIELD}>
                <option value="" disabled>Select a type</option>
                {BLOTTER_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
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

            <fieldset>
              <legend className="mb-1.5 text-sm font-extrabold">
                Choose an appointment day
              </legend>
              <p className="mb-3 text-xs font-medium text-slate-600">
                Select a date for your blotter appointment.
              </p>
              <div className="rounded-2xl border border-amber-200 bg-white p-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() =>
                      setCalendarMonth(
                        (month) => new Date(month.getFullYear(), month.getMonth() - 1, 1),
                      )
                    }
                    className="rounded-lg px-3 py-1.5 font-bold text-amber-900 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    ‹
                  </button>
                  <h2 aria-live="polite" className="text-sm font-extrabold text-slate-800">
                    {monthLabel}
                  </h2>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() =>
                      setCalendarMonth(
                        (month) => new Date(month.getFullYear(), month.getMonth() + 1, 1),
                      )
                    }
                    className="rounded-lg px-3 py-1.5 font-bold text-amber-900 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    ›
                  </button>
                </div>

                <div role="grid" aria-label={monthLabel} className="grid grid-cols-7 gap-1 text-center">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => (
                    <span key={weekday} role="columnheader" className="py-1 text-xs font-bold text-slate-500">
                      {weekday}
                    </span>
                  ))}
                  {Array.from({ length: firstWeekday }, (_, index) => (
                    <div key={`empty-${index}`} role="gridcell" aria-hidden="true" />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, index) => {
                    const day = index + 1;
                    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                    const dateValue = formatManilaDate(date);
                    const isPast = dateValue < today;
                    const isSelected = dateValue === appointmentDate;

                    return (
                      <div key={dateValue} role="gridcell">
                        <button
                          type="button"
                          aria-label={date.toLocaleDateString("en-PH", { dateStyle: "full", timeZone: TZ })}
                          aria-pressed={isSelected}
                          disabled={isPast}
                          onClick={() => {
                            setAppointmentDate(dateValue);
                            setSubmissionError("");
                          }}
                          className={`aspect-square w-full rounded-full text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                            isSelected
                              ? "bg-amber-600 text-white"
                              : isPast
                                ? "cursor-not-allowed text-slate-300"
                                : "text-slate-700 hover:bg-amber-100"
                          }`}
                        >
                          {day}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="mt-2 text-sm font-bold text-slate-700" aria-live="polite">
                {appointmentDate
                  ? `Selected: ${new Date(`${appointmentDate}T00:00:00+08:00`).toLocaleDateString("en-PH", {
                      dateStyle: "long",
                      timeZone: TZ,
                    })}`
                  : "No appointment day selected."}
              </p>
            </fieldset>

            <button
              type="submit"
              disabled={isPending}
              className={`w-full rounded-2xl px-4 py-4 text-base font-extrabold text-white transition disabled:opacity-60 ${GOLD_BTN}`}
            >
              {isPending ? "Submitting..." : "Submit report"}
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
          onClick={() => router.push("/pwa/resident/dashboard")}
          className="mx-auto mt-6 block rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-extrabold text-slate-700 shadow-[0_3px_8px_rgba(0,0,0,0.1)] active:translate-y-px"
        >
          Back to dashboard
        </button>

        <p className="mt-8 text-center text-xs font-bold italic text-slate-500">Pindot mo, Rescue ko</p>
      </section>
    </main>
  );
}