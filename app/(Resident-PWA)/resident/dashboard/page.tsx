"use client";

import styles from "./page.module.css";
import React, { useState, useEffect, useRef } from "react";
import { createEmergencyRequest } from "./actions";
import { useRouter } from "next/navigation";
import { logout } from "../../../actions/auth";

interface EmergencyCategory {
  id: string; // value sent to createEmergencyRequest (unchanged from your original)
  tone: "fire" | "disaster" | "crime" | "medical" | "missing" | "blotter";
  label: React.ReactNode;
  icon: React.ReactNode;
}

// Icons use two colors: white for the glyph, and `.cut` (the tile's own color) for details cut out of it.
const categories: EmergencyCategory[] = [
  {
    id: "fire",
    tone: "fire",
    label: "Sunog",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#fff"
          d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"
        />
        <path
          className={styles.cutFill}
          d="M12 21a3 3 0 0 0 3-3c0-1.5-1-2.2-1.6-3.2-.5-.8-.9-1.6-1.4-2.6-.5 1-.9 1.8-1.4 2.6C10 15.8 9 16.5 9 18a3 3 0 0 0 3 3z"
        />
      </svg>
    ),
  },
  {
    id: "disaster",
    tone: "disaster",
    label: "Aksidente",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#fff"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinejoin="round"
          d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        />
        <g className={styles.cutStroke} strokeWidth="2.4" strokeLinecap="round">
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
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7.5 11V6.5a2.2 2.2 0 0 1 4.4 0M16.5 11V9"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="7.5" cy="16" r="5" fill="#fff" />
        <circle cx="16.5" cy="16" r="5" fill="#fff" />
        <circle cx="7.5" cy="16" r="1.9" className={styles.cutFill} />
        <circle cx="16.5" cy="16" r="1.9" className={styles.cutFill} />
      </svg>
    ),
  },
  {
    id: "medical",
    tone: "medical",
    label: "Medikal",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#fff"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinejoin="round"
          d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"
        />
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
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#fff" d="M3.5 21.5c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5z" />
        <circle cx="12" cy="8" r="5" fill="#fff" />
        <g className={styles.cutStroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.4 6.9a1.7 1.7 0 1 1 2.4 1.5c-.5.3-.8.6-.8 1.1" />
          <line x1="12" y1="11.4" x2="12.01" y2="11.4" />
        </g>
      </svg>
    ),
  },
  {
    id: "Schedule Blotter",
    tone: "blotter",
    label: "Blotter",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="3" width="14" height="18" rx="2.2" fill="#fff" />
        <rect x="8" y="7" width="7" height="3.2" rx="0.8" className={styles.cutFill} />
        <g className={styles.cutStroke} strokeWidth="1.6" strokeLinecap="round">
          <line x1="8" y1="13" x2="15" y2="13" />
          <line x1="8" y1="16.5" x2="13" y2="16.5" />
        </g>
        <path fill="#fff" d="M19.2 6.5l2.3 1-2.8 9.8-1.6.5-.2-1.7z" />
      </svg>
    ),
  },
];

export default function EmergencyReportPage() {
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the menu when tapping anywhere outside it
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
    <div className={styles.page}>
      <div className={styles.screen}>
        <header className={styles.header} ref={menuRef}>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen((open) => !open);
            }}
          >
            <span />
            <span />
            <span />
          </button>

          <div className={`${styles.menu} ${isMenuOpen ? styles.menuOpen : ""}`} role="menu">
            <button type="button" role="menuitem" className={styles.menuItem} onClick={handleLogout}>
              Log Out
            </button>
          </div>
        </header>

        <main className={styles.main}>
          <h1 className={styles.title}>
            Pindutin ng kategorya para
            <br />
            masimulan ang inyong report.
          </h1>

          {reportError && (
            <p className={styles.reportError} role="alert">
              {reportError}
            </p>
          )}

          <div className={styles.grid}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                disabled={isSubmitting}
                className={`${styles.cat} ${styles[cat.tone]} ${pressedId === cat.id ? styles.pressed : ""}`}
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
                <span className={styles.tile}>
                  <span className={styles.disc}>{cat.icon}</span>
                </span>
                <span className={styles.label}>{cat.label}</span>
              </button>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}