import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "pending" | "rejected";

const TONES: Record<Tone, { tile: string; ring: string; button: string; card: string }> = {
  pending: {
    tile:
      "bg-linear-to-b from-[#f2bd3d] to-[#c98a0e] shadow-[0_8px_16px_rgba(201,138,14,0.35),inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-3px_0_rgba(0,0,0,0.12)]",
    ring: "bg-amber-700/25",
    button:
      "bg-linear-to-b from-[#f2bd3d] to-[#c98a0e] shadow-[0_8px_16px_rgba(201,138,14,0.35),inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-3px_0_rgba(0,0,0,0.12)]",
    card: "border-amber-100 from-amber-50 shadow-[0_10px_24px_rgba(201,138,14,0.15)]",
  },
  rejected: {
    tile:
      "bg-linear-to-b from-[#ef5b5b] to-[#b72424] shadow-[0_8px_16px_rgba(183,36,36,0.35),inset_0_2px_0_rgba(255,255,255,0.4),inset_0_-3px_0_rgba(0,0,0,0.15)]",
    ring: "bg-red-900/25",
    button:
      "bg-linear-to-b from-[#ef5b5b] to-[#b72424] shadow-[0_8px_16px_rgba(183,36,36,0.35),inset_0_2px_0_rgba(255,255,255,0.4),inset_0_-3px_0_rgba(0,0,0,0.15)]",
    card: "border-red-100 from-red-50 shadow-[0_10px_24px_rgba(183,36,36,0.15)]",
  },
};

function Icon({ tone }: { tone: Tone }) {
  return tone === "pending" ? (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export default function StatusScreen({
  tone,
  title,
  children,
  actionLabel,
  actionHref,
  footer,
}: {
  tone: Tone;
  title: string;
  children: ReactNode;
  actionLabel?: string;
  actionHref?: string;
  footer?: ReactNode;
}) {
  const t = TONES[tone];

  return (
    <main className="min-h-screen bg-white px-5 pb-10 pt-16 text-slate-900">
      <section className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <div className={`mb-4 flex h-24 w-24 items-center justify-center rounded-3xl ${t.tile}`} aria-hidden="true">
          <span className={`flex h-16 w-16 items-center justify-center rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] ${t.ring}`}>
            <Icon tone={tone} />
          </span>
        </div>

        <h1 className="mb-4 text-2xl font-extrabold leading-tight">{title}</h1>

        <div className={`w-full rounded-3xl border bg-linear-to-b to-white p-5 text-sm font-bold leading-relaxed text-slate-700 ${t.card}`}>
          {children}
        </div>

        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className={`mt-6 block w-full rounded-2xl px-4 py-4 text-base font-extrabold text-white transition active:translate-y-0.5 ${t.button}`}
          >
            {actionLabel}
          </Link>
        )}

        {footer}

        <p className="mt-10 text-xs font-bold italic text-slate-500">Pindot mo, Rescue ko.</p>
      </section>
    </main>
  );
}