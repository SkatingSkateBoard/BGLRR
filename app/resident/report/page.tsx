"use client";

import "@/app/styles/dashboard.css";
import React, { useState, useEffect, useRef } from "react";

// Define TypeScript structure for our emergency categories
interface EmergencyCategory {
  id: string;
  name: string;
  label: React.ReactNode;
  icon: React.ReactNode;
}

export default function EmergencyReportPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pressedBtnId, setPressedBtnId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the settings sub-menu when clicking outside anywhere on the screen
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Centralized configuration array for your 6 categories
  const categories: EmergencyCategory[] = [
    {
      id: "Fire",
      name: "fire",
      label: "SUNOG",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
        </svg>
      ),
    },
    {
      id: "Disaster",
      name: "disaster",
      label: "SAKUNA",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
    },
    {
      id: "Crime",
      name: "crime",
      label: "KRIMEN",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="7" cy="12" r="4"/>
          <circle cx="17" cy="12" r="4"/>
          <path d="M11 12h2"/>
        </svg>
      ),
    },
    {
      id: "Medical",
      name: "medical",
      label: "MEDIKAL",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
          <line x1="12" y1="4" x2="12" y2="20"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
        </svg>
      ),
    },
    {
      id: "Missing Person",
      name: "missing-p",
      label: <>NAWAWALANG<br />TAO</>,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="7" r="3"/>
          <path d="M4 20c0-3 2.5-5.5 5.5-5.5"/>
          <circle cx="16" cy="16" r="3.5"/>
          <line x1="18.5" y1="18.5" x2="21" y2="21"/>
        </svg>
      ),
    },
    {
      id: "Schedule Blotter",
      name: "blotter",
      label: "BLOTTER",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          <path d="M2 13h20"/>
        </svg>
      ),
    },
  ];

  const handleCategoryClick = (category: string) => {
    console.log("Selected category:", category);
    // Wire up your routing logic here (e.g., router.push(`/report?type=${category}`))
  };

  return (
    <>
      <div className="grain"></div>

      <div className="device">
        <header ref={menuRef}>
          <button 
            className="icon-btn" 
            id="menuBtn" 
            aria-label="Open settings"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          <div className={`submenu ${isMenuOpen ? "open" : ""}`} id="submenu">
            <button className="submenu-item">Language</button>
            <button className="submenu-item">Account</button>
            <button className="submenu-item">Help</button>
            <button className="submenu-item">Log Out</button>
          </div>

          <div className="brand">BGL<span>·</span>RR</div>
          <div className="icon-btn" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <circle cx="12" cy="8" r="3.4"/>
              <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/>
            </svg>
          </div>
        </header>

        <main>
          <h1>What kind of emergency<br />will you report?</h1>

          <div className="grid">
            {categories.map((cat) => {
              const isPressed = pressedBtnId === cat.id;
              
              return (
                <button
                  key={cat.id}
                  className={`cat ${cat.name} ${isPressed ? "is-pressed" : ""}`}
                  data-cat={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  onPointerDown={() => setPressedBtnId(cat.id)}
                  onPointerUp={() => setPressedBtnId(null)}
                  onPointerLeave={() => setPressedBtnId(null)}
                  onPointerCancel={() => setPressedBtnId(null)}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") setPressedBtnId(cat.id);
                  }}
                  onKeyUp={(e) => {
                    if (e.key === " " || e.key === "Enter") setPressedBtnId(null);
                  }}
                >
                  <span className="icon-disc">
                    {cat.icon}
                  </span>
                  {cat.label}
                </button>
              );
            })}
          </div>

          <footer className="hint">
            Pindutin ang kategorya para maisimulan ang iyong report.
          </footer>
        </main>
      </div>
    </>
  );
}

