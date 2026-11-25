"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAnnouncementsAction, type AnnouncementRow } from "@/app/actions/announcement-actions";
import { usePreviewMode } from "@/lib/usePreviewMode";

export type ResidentPanel = "account" | "history" | "announcements";

interface ResidentPanelsProps {
  panel: ResidentPanel;
  fullScreen?: boolean;
}

const emergencyHistory = [
  { id: "EM-1048", category: "Medikal", status: "Resolving", date: "Nov 21, 2026", detail: "Emergency response request" },
  { id: "EM-1031", category: "Aksidente", status: "Resolved", date: "Nov 18, 2026", detail: "Road incident report" },
  { id: "EM-0994", category: "Krimen", status: "Resolved", date: "Nov 12, 2026", detail: "Suspicious activity report" },
];

export function ResidentPanels({ panel, fullScreen = false }: ResidentPanelsProps) {
  const router = useRouter();
  const previewMode = usePreviewMode();
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null);

  useEffect(() => {
    const isPreviewSession =
      process.env.NODE_ENV !== "production" &&
      (previewMode ||
        document.cookie.split("; ").includes("bglrr_preview=1") ||
        new URLSearchParams(window.location.search).get("preview") === "1");
    if (panel !== "announcements" || isPreviewSession) return;

    getAnnouncementsAction().then((rows) => {
      setAnnouncements(rows);
    });
  }, [panel, previewMode]);

  const title =
    panel === "account"
      ? "Account & App Settings"
      : panel === "history"
        ? "Emergency History"
        : "Announcement Inbox";

  return (
    <main className={fullScreen ? "min-h-screen bg-white text-[#0a0a0a]" : "absolute inset-0 z-60 flex items-end justify-center bg-black/35 backdrop-blur-[2px]"}>
      <section className={fullScreen ? "mx-auto min-h-screen w-full max-w-105 overflow-y-auto px-6 py-5 pb-10" : "max-h-[82dvh] w-full max-w-105 overflow-y-auto rounded-t-[28px] bg-white p-5 pb-8 shadow-[0_-12px_40px_rgba(0,0,0,0.18)]"}>
        {fullScreen ? (
          <button
            type="button"
            onClick={() => {
              if (previewMode) {
                router.push("/resident/dashboard?preview=1");
              } else {
                window.history.back();
              }
            }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-800"
          >
            <span aria-hidden="true">←</span> Back
          </button>
        ) : (
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-zinc-200" />
        )}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-zinc-400">Resident</p>
            <h1 className="text-xl font-extrabold text-zinc-950">{title}</h1>
          </div>
        </div>

        {panel === "account" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#2020a2] text-lg font-bold text-white">JR</div>
              <div>
                <p className="font-bold text-zinc-900">Juan Resident</p>
                <p className="text-sm text-zinc-500">Resident account</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-200">
              {[
                ["Profile information", "Name, phone, and address"],
                ["Notifications", "Emergency and barangay alerts"],
                ["Location", "Allow location while using the app"],
                ["Privacy & security", "Password and account access"],
              ].map(([label, detail], index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (previewMode) setSelectedSetting(label);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-4 text-left ${index > 0 ? "border-t border-zinc-200" : ""}`}
                >
                  <span>
                    <span className="block font-semibold text-zinc-900">{label}</span>
                    <span className="mt-0.5 block text-xs text-zinc-500">{detail}</span>
                  </span>
                  <span className="text-zinc-400">›</span>
                </button>
              ))}
            </div>

            {previewMode && selectedSetting && (
              <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
                {selectedSetting === "Delete account"
                  ? "Account deletion is disabled in preview."
                  : `${selectedSetting} opened in preview. No changes are saved.`}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                if (previewMode) setSelectedSetting("Delete account");
              }}
              className="w-full rounded-xl border border-red-200 py-3 font-bold text-red-600"
            >
              Delete account
            </button>
          </div>
        )}

        {panel === "history" && (
          <div className="space-y-3">
            {emergencyHistory.map((item) => (
              <article key={item.id} className="rounded-2xl border border-zinc-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-zinc-900">{item.category}</p>
                    <p className="mt-1 text-sm text-zinc-500">{item.detail}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "Resolved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {item.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                  <span>{item.id}</span>
                  <span>{item.date}</span>
                </div>
              </article>
            ))}
          </div>
        )}

        {panel === "announcements" && (
          <div className="space-y-3">
            {announcements.length === 0 ? (
              <>
                {[
                  ["Community Road Closure", "A portion of Regalado Avenue will be closed for maintenance from 8:00 AM to 5:00 PM.", "Today"],
                  ["Barangay Health Schedule", "Free blood pressure checkups are available at the community center.", "Yesterday"],
                ].map(([titleText, detail, date]) => (
                  <article key={titleText} className="rounded-2xl border border-zinc-200 p-4">
                    <p className="font-bold text-zinc-900">{titleText}</p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600">{detail}</p>
                    <p className="mt-3 text-xs text-zinc-400">{date}</p>
                  </article>
                ))}
              </>
            ) : (
              announcements.map((item) => (
                <article key={item.id} className="rounded-2xl border border-zinc-200 p-4">
                  <p className="font-bold text-zinc-900">{item.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.description}</p>
                  <p className="mt-3 text-xs text-zinc-400">{new Date(item.scheduled_at).toLocaleString()}</p>
                </article>
              ))
            )}
          </div>
        )}
      </section>
    </main>
  );
}
