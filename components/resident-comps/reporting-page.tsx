"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createEmergencyRequest } from "@/app/actions/resident";
import { logout } from "@/app/actions/auth";

export interface EmergencyCategory {
  id: string;
  tone: "fire" | "disaster" | "crime" | "medical" | "missing" | "blotter";
  label: React.ReactNode;
  icon: (cutColorClass: string) => React.ReactNode; 
}

const toneStyles: Record<
  EmergencyCategory["tone"],
  {
    border: string;
    bgGradient: string;
    shadowNormal: string;
    shadowPressed: string;
    discGradient: string;
    discShadow: string;
    cutClass: string;
  }
> = {
  fire: {
    border: "border-[#b02a2a]",
    bgGradient: "from-[#f26a6a] via-[#d33a3a] to-[#b52626]",
    shadowNormal: "shadow-[0_16px_24px_-8px_rgba(210,50,50,0.55),0_2px_3px_rgba(0,0,0,0.12),inset_0_1.5px_0_rgba(255,255,255,0.55),inset_0_-3px_6px_rgba(0,0,0,0.14)]",
    shadowPressed: "group-active:shadow-[0_6px_10px_-4px_rgba(210,50,50,0.55),inset_4px_5px_10px_rgba(0,0,0,0.28),inset_-2px_-2px_6px_rgba(255,255,255,0.22)]",
    discGradient: "bg-[radial-gradient(circle_at_35%_28%,rgba(255,120,120,0.4),rgba(120,10,10,0.5))]",
    discShadow: "shadow-[inset_0_3px_6px_rgba(0,0,0,0.22),inset_0_-2px_3px_rgba(255,255,255,0.25),0_1px_0_rgba(255,255,255,0.25)]",
    cutClass: "fill-[#d33a3a] stroke-[#d33a3a]",
  },
  disaster: {
    border: "border-[#cf6a0c]",
    bgGradient: "from-[#ffa24a] via-[#ef7f17] to-[#d46505]",
    shadowNormal: "shadow-[0_16px_24px_-8px_rgba(237,129,24,0.55),0_2px_3px_rgba(0,0,0,0.12),inset_0_1.5px_0_rgba(255,255,255,0.55),inset_0_-3px_6px_rgba(0,0,0,0.14)]",
    shadowPressed: "group-active:shadow-[0_6px_10px_-4px_rgba(237,129,24,0.55),inset_4px_5px_10px_rgba(0,0,0,0.28),inset_-2px_-2px_6px_rgba(255,255,255,0.22)]",
    discGradient: "bg-[radial-gradient(circle_at_35%_28%,rgba(255,190,100,0.4),rgba(150,60,0,0.5))]",
    discShadow: "shadow-[inset_0_3px_6px_rgba(0,0,0,0.22),inset_0_-2px_3px_rgba(255,255,255,0.25),0_1px_0_rgba(255,255,255,0.25)]",
    cutClass: "stroke-[#ef7f17] fill-none",
  },
  crime: {
    border: "border-[#2c47ba]",
    bgGradient: "from-[#5a7cf0] via-[#3558d6] to-[#2540b4]",
    shadowNormal: "shadow-[0_16px_24px_-8px_rgba(53,88,214,0.55),0_2px_3px_rgba(0,0,0,0.12),inset_0_1.5px_0_rgba(255,255,255,0.55),inset_0_-3px_6px_rgba(0,0,0,0.14)]",
    shadowPressed: "group-active:shadow-[0_6px_10px_-4px_rgba(53,88,214,0.55),inset_4px_5px_10px_rgba(0,0,0,0.28),inset_-2px_-2px_6px_rgba(255,255,255,0.22)]",
    discGradient: "bg-[radial-gradient(circle_at_35%_28%,rgba(120,150,255,0.45),rgba(20,40,130,0.5))]",
    discShadow: "shadow-[inset_0_3px_6px_rgba(0,0,0,0.22),inset_0_-2px_3px_rgba(255,255,255,0.25),0_1px_0_rgba(255,255,255,0.25)]",
    cutClass: "fill-[#2d4bc4] stroke-[#2d4bc4]",
  },
  medical: {
    border: "border-[#0f8f76]",
    bgGradient: "from-[#25c0a2] via-[#14a186] to-[#0d8369]",
    shadowNormal: "shadow-[0_16px_24px_-8px_rgba(20,161,134,0.55),0_2px_3px_rgba(0,0,0,0.12),inset_0_1.5px_0_rgba(255,255,255,0.55),inset_0_-3px_6px_rgba(0,0,0,0.14)]",
    shadowPressed: "group-active:shadow-[0_6px_10px_-4px_rgba(20,161,134,0.55),inset_4px_5px_10px_rgba(0,0,0,0.28),inset_-2px_-2px_6px_rgba(255,255,255,0.22)]",
    discGradient: "bg-[radial-gradient(circle_at_35%_28%,rgba(80,220,190,0.35),rgba(0,90,70,0.45))]",
    discShadow: "shadow-[inset_0_3px_6px_rgba(0,0,0,0.22),inset_0_-2px_3px_rgba(255,255,255,0.25),0_1px_0_rgba(255,255,255,0.25)]",
    cutClass: "fill-[#14a186]",
  },
  missing: {
    border: "border-[#7f45a8]",
    bgGradient: "from-[#b574da] via-[#9650c0] to-[#7a39a4]",
    shadowNormal: "shadow-[0_16px_24px_-8px_rgba(150,80,192,0.55),0_2px_3px_rgba(0,0,0,0.12),inset_0_1.5px_0_rgba(255,255,255,0.55),inset_0_-3px_6px_rgba(0,0,0,0.14)]",
    shadowPressed: "group-active:shadow-[0_6px_10px_-4px_rgba(150,80,192,0.55),inset_4px_5px_10px_rgba(0,0,0,0.28),inset_-2px_-2px_6px_rgba(255,255,255,0.22)]",
    discGradient: "bg-[radial-gradient(circle_at_35%_28%,rgba(210,150,255,0.4),rgba(70,20,110,0.5))]",
    discShadow: "shadow-[inset_0_3px_6px_rgba(0,0,0,0.22),inset_0_-2px_3px_rgba(255,255,255,0.25),0_1px_0_rgba(255,255,255,0.25)]",
    cutClass: "stroke-[#8c48b8] fill-none",
  },
  blotter: {
    border: "border-[#c78b0c]",
    bgGradient: "from-[#f6b73a] via-[#dd9a14] to-[#bd7f06]",
    shadowNormal: "shadow-[0_16px_24px_-8px_rgba(221,154,20,0.55),0_2px_3px_rgba(0,0,0,0.12),inset_0_1.5px_0_rgba(255,255,255,0.55),inset_0_-3px_6px_rgba(0,0,0,0.14)]",
    shadowPressed: "group-active:shadow-[0_6px_10px_-4px_rgba(221,154,20,0.55),inset_4px_5px_10px_rgba(0,0,0,0.28),inset_-2px_-2px_6px_rgba(255,255,255,0.22)]",
    discGradient: "bg-[radial-gradient(circle_at_35%_28%,rgba(255,215,120,0.35),rgba(120,70,0,0.4))]",
    discShadow: "shadow-[inset_0_3px_6px_rgba(0,0,0,0.22),inset_0_-2px_3px_rgba(255,255,255,0.25),0_1px_0_rgba(255,255,255,0.25)]",
    cutClass: "fill-[#c98a0a] stroke-[#c98a0a]",
  },
};

const categories: EmergencyCategory[] = [
  {
    id: "fire",
    tone: "fire",
    label: "Sunog",
    icon: (cut) => (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="w-[64%] h-[64%] overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]">
        <path fill="#fff" d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        <path className={cut} d="M12 21a3 3 0 0 0 3-3c0-1.5-1-2.2-1.6-3.2-.5-.8-.9-1.6-1.4-2.6-.5 1-.9 1.8-1.4 2.6C10 15.8 9 16.5 9 18a3 3 0 0 0 3 3z" />
      </svg>
    ),
  },
  {
    id: "disaster",
    tone: "disaster",
    label: "Aksidente",
    icon: (cut) => (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="w-[64%] h-[64%] overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]">
        <path fill="#fff" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <g className={cut} strokeWidth="2.4" strokeLinecap="round">
          <line x1="12" y1="9" x2="12" y2="14" />
          <line x1="12" y1="17.5" x2="12.01" y2="17.5" />
        </g>
      </svg>
    ),
  },
  {
    id: "crime",
    tone: "crime",
    label: "Krimen",
    icon: (cut) => (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="w-[64%] h-[64%] overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]">
        <path d="M7.5 11V6.5a2.2 2.2 0 0 1 4.4 0M16.5 11V9" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <circle cx="7.5" cy="16" r="5" fill="#fff" />
        <circle cx="16.5" cy="16" r="5" fill="#fff" />
        <circle cx="7.5" cy="16" r="1.9" className={cut} />
        <circle cx="16.5" cy="16" r="1.9" className={cut} />
      </svg>
    ),
  },
  {
    id: "medical",
    tone: "medical",
    label: "Medikal",
    icon: () => (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="w-[64%] h-[64%] overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]">
        <path fill="#fff" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />
      </svg>
    ),
  },
  {
    id: "missing",
    tone: "missing",
    label: (
      <>
        Nawawalang
        <br />
        Tao
      </>
    ),
    icon: (cut) => (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="w-[64%] h-[64%] overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]">
        <path fill="#fff" d="M3.5 21.5c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5z" />
        <circle cx="12" cy="8" r="5" fill="#fff" />
        <g className={cut} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.4 6.9a1.7 1.7 0 1 1 2.4 1.5c-.5.3-.8.6-.8 1.1" />
          <line x1="12" y1="11.4" x2="12.01" y2="11.4" />
        </g>
      </svg>
    ),
  },
];
export default function ReportingDashboard() {
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleCategoryClick = async (category: string) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setReportError(null);

    try {
      const result = await createEmergencyRequest(category);
      if (result.success) {
        router.push(`/resident/call/${result.roomId}?token=${result.livekitToken}`);
      }
    } catch (error) {
      console.error("Failed to create emergency request:", error);
      setReportError(
        error instanceof Error
          ? error.message
          : "Could not submit your report. Please try again.",
      );
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await logout();
  };
  return (
    <div className="h-[100vh] h-[100dvh] overflow-y-auto overscroll-contain flex justify-center text-[#0a0a0a] bg-white motion-reduce:transition-none">
      <div className="w-full max-w-[420px] min-h-max px-[1.4rem] pb-8 flex flex-col">
        
        {/* Header Block with Dropdown */}
        <header className="relative pt-4 z-10" ref={menuRef}>
          <button
            type="button"
            className="box-border w-11 h-11 -ml-2 flex flex-col justify-center items-center gap-[5px] cursor-pointer [-webkit-tap-highlight-color:transparent] active:opacity-55 focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#111] focus-visible:outline-offset-2 focus-visible:rounded-lg"
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen((open) => !open);
            }}
          >
            <span className="block w-6 h-[3px] rounded-[2px] bg-[#111]" />
            <span className="block w-6 h-[3px] rounded-[2px] bg-[#111]" />
            <span className="block w-6 h-[3px] rounded-[2px] bg-[#111]" />
          </button>

          {/* Action Dropdown Menu */}
          <div
            className={`absolute top-[calc(100%+4px)] left-0 min-width-[170px] p-1.5 rounded-[16px] border border-[rgba(255,255,255,0.85)] bg-gradient-to-br from-[#fbfcff] to-[#d9e1ed] shadow-[8px_10px_22px_rgba(100,115,140,0.35),-4px_-4px_12px_rgba(255,255,255,0.8),inset_1px_1px_0_rgba(255,255,255,0.9)] transform-gpu origin-top-left transition-all duration-140 ${
              isMenuOpen ? "opacity-100 visible translate-y-0 scale-100" : "opacity-0 invisible -translate-y-1.5 scale-[0.97]"
            }`}
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              className="box-border block w-full px-4 py-3 border border-[#a92828] rounded-[12px] cursor-pointer font-extrabold text-white bg-gradient-to-br from-[#f05b5b] via-[#c93636]_55% to-[#a92323] shadow-[0_4px_8px_rgba(169,35,35,0.35),inset_0_1px_0_rgba(255,255,255,0.45)] active:translate-y-[1px] active:shadow-[inset_3px_3px_6px_rgba(100,10,10,0.45)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#111] focus-visible:outline-offset-2"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </div>
        </header>

        {/* Dynamic Context View */}
        <main className="flex-1 flex flex-col">
          <h1 className="my-4 mb-[1.9rem] text-center text-[1.45rem] leading-[1.25] font-extrabold">
            Pindutin ng kategorya para
            <br />
            masimulan ang inyong report.
          </h1>

          {reportError && (
            <p className="mt-[-1rem] mb-4 p-3 border border-[#b42318] rounded-[0.75rem] color-[#8a1c13] bg-[#fff1f0] text-[0.9rem] text-center" role="alert">
              {reportError}
            </p>
          )}

          {/* Matrix Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-[1.6rem]">
            {categories.map((cat, index) => {
              const currentTone = toneStyles[cat.tone];
              const isPressed = pressedId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  disabled={isSubmitting}
                  /* Added hover:-translate-y-1 and transition-transform for the lift-up animation */
                  className={`group flex flex-col items-center gap-3 cursor-pointer [-webkit-tap-highlight-color:transparent] focus-visible:outline-none transition-transform duration-200 hover:-translate-y-1 active:translate-y-0 ${
                    categories.length === 5 && index === 4 ? "col-span-2 mx-auto w-1/2" : ""
                  }`}
                  onClick={() => handleCategoryClick(cat.id)}
                  onPointerDown={() => setPressedId(cat.id)}
                  onPointerUp={() => setPressedId(null)}
                  onPointerLeave={() => setPressedId(null)}
                  onPointerCancel={() => setPressedId(null)}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") setPressedId(cat.id);
                  }}
                  onKeyUp={(e) => {
                    if (e.key === " " || e.key === "Enter") setPressedId(null);
                  }}
                >
                  <span
                    className={`relative w-full aspect-[1.22/1] ${categories.length === 5 && index === 4 ? "max-w-[172px]" : ""} grid place-items-center rounded-[26px] border bg-gradient-to-br transition-all duration-140 before:content-[''] before:absolute before:inset-0 before:rounded-inherit before:bg-gradient-to-b before:from-white/22 before:to-transparent before:to-[45%] before:pointer-events-none group-hover:brightness-104 group-focus-visible:outline group-focus-visible:outline-3 group-focus-visible:outline-[#111] group-focus-visible:outline-offset-[3px] motion-reduce:transition-none ${
                      currentTone.border
                    } ${currentTone.bgGradient} ${
                      isPressed
                        ? `translate-y-[3px] shadow-[0_6px_10px_-4px_rgba(0,0,0,0.3),inset_4px_5px_10px_rgba(0,0,0,0.28),inset_-2px_-2px_6px_rgba(255,255,255,0.22)]`
                        : currentTone.shadowNormal
                    }`}
                  >
                    <span className={`relative w-[56%] aspect-square grid place-items-center rounded-full ${currentTone.discGradient} ${currentTone.discShadow}`}>
                      {cat.icon(currentTone.cutClass)}
                    </span>
                  </span>
                  
                  <span className="text-[1.3rem] leading-[1.1] font-extrabold text-center text-[#0a0a0a]">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
