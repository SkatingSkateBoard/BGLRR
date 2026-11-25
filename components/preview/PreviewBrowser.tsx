"use client";

import { useEffect, useState } from "react";

const screens = [
  { group: "Resident", label: "Login", path: "/resident/login?preview=1" },
  { group: "Resident", label: "Sign up", path: "/resident/signup?preview=1" },
  { group: "Resident", label: "Email verification", path: "/resident/otp?preview=1" },
  { group: "Resident", label: "Dashboard", path: "/resident/dashboard?preview=1" },
  { group: "Resident", label: "Emergency call", path: "/resident/call/emergency-1048?preview=1" },
  { group: "Resident", label: "Emergency history", path: "/resident/history?preview=1" },
  { group: "Resident", label: "Account settings", path: "/resident/settings?preview=1" },
  { group: "Resident", label: "Announcements", path: "/resident/announcements?preview=1" },
  { group: "Resident", label: "Verification pending", path: "/resident/unverified?preview=1" },
  { group: "Resident", label: "Verification rejected", path: "/resident/rejected?preview=1" },
  { group: "Operator", label: "Login", path: "/operator/login?preview=1" },
  { group: "Operator", label: "Dashboard", path: "/operator/dashboard?preview=1" },
  { group: "Operator", label: "Call screen", path: "/operator/call/emergency-1048?preview=1" },
  { group: "Responder", label: "Dashboard", path: "/responder/dashboard?preview=1" },
  { group: "Admin", label: "Create accounts", path: "/admin/create?preview=1" },
  { group: "System", label: "Unauthorized", path: "/unauthorized?preview=1" },
];

const previewCookie = "bglrr_preview";

function clearPreviewCookie() {
  document.cookie = `${previewCookie}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export default function PreviewBrowser() {
  const [selectedPath, setSelectedPath] = useState(screens[3].path);
  const [previewEnded, setPreviewEnded] = useState(false);

  useEffect(() => {
    document.cookie = `${previewCookie}=1; Path=/; SameSite=Lax`;

    const clearCookie = () => clearPreviewCookie();
    window.addEventListener("beforeunload", clearCookie);
    return () => {
      window.removeEventListener("beforeunload", clearCookie);
      clearPreviewCookie();
    };
  }, []);

  const selectedScreen = screens.find((screen) => screen.path === selectedPath) ?? screens[3];
  const groups = [...new Set(screens.map((screen) => screen.group))];

  const preventActions = (frame: HTMLIFrameElement) => {
    const frameDocument = frame.contentDocument;
    if (!frameDocument) return;

    const navigationButtons = new Set([
      "account & app settings",
      "emergency history",
      "announcements",
      "analytics",
      "back",
      "close",
      "emergencies",
      "history",
      "open announcement inbox",
      "open menu",
      "residents",
    ]);

    frameDocument.addEventListener(
      "click",
      (event) => {
        const button = (event.target as Element | null)?.closest("button, [role='button'], input[type='submit']");
        if (!button) return;
        const label = (button.textContent || button.getAttribute("aria-label") || button.getAttribute("title") || "").trim().toLowerCase();
        if (navigationButtons.has(label)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      true
    );
    frameDocument.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      true
    );
  };

  return (
    <main className="flex h-dvh flex-col bg-white text-slate-900">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
        <h1 className="mr-auto text-sm font-bold">Preview mode</h1>
        <span className="hidden text-xs text-slate-500 sm:inline">
          Actual app UI · controls disabled · preview only
        </span>
        <button
          type="button"
          onClick={() => {
            clearPreviewCookie();
            setPreviewEnded(true);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          Exit preview
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-3">
          <nav aria-label="Preview screens" className="space-y-5">
            {groups.map((group) => (
              <section key={group}>
                <h2 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {group}
                </h2>
                <ul className="space-y-1">
                  {screens.filter((screen) => screen.group === group).map((screen) => (
                    <li key={screen.path}>
                      <button
                        type="button"
                        aria-pressed={selectedPath === screen.path}
                        onClick={() => setSelectedPath(screen.path)}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                          selectedPath === screen.path
                            ? "bg-blue-100 font-semibold text-blue-900"
                            : "text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {screen.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
            {selectedScreen.group} / {selectedScreen.label} — {selectedScreen.path.split("?")[0]}
          </p>

          {!previewEnded ? (
            <iframe
              key={selectedPath}
              title={`${selectedScreen.group} ${selectedScreen.label} preview`}
              src={selectedPath}
              onLoad={(event) => preventActions(event.currentTarget)}
              className="min-h-0 w-full flex-1 border-0 bg-white"
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-slate-600">Preview ended. Reload this page to start preview mode again.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
