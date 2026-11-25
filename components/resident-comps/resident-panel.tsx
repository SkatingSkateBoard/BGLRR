"use client";

import { useEffect, useState } from "react";
import { getAnnouncementsAction, type AnnouncementRow } from "@/app/actions/announcement-actions";

export type ResidentPanel = "account" | "history" | "announcements" | "blotter";

interface ResidentPanelsProps {
  panel: ResidentPanel;
  fullScreen?: boolean;
}

type PermState = "granted" | "denied" | "prompt" | "unsupported";

const emergencyHistory = [
  { id: "EM-1048", category: "Medikal", status: "Resolving", date: "Nov 21, 2026", detail: "Emergency response request" },
  { id: "EM-1031", category: "Aksidente", status: "Resolved", date: "Nov 18, 2026", detail: "Road incident report" },
  { id: "EM-0994", category: "Krimen", status: "Resolved", date: "Nov 12, 2026", detail: "Suspicious activity report" },
];

export function ResidentPanels({ panel, fullScreen = false }: ResidentPanelsProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [swVersion, setSwVersion] = useState<string>("");

  // Live permission states
  const [notifPerm, setNotifPerm] = useState<PermState>("prompt");
  const [locPerm, setLocPerm] = useState<PermState>("prompt");
  const [micPerm, setMicPerm] = useState<PermState>("prompt");
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);
  const [helpModal, setHelpModal] = useState<string | null>(null);

  // Fetch announcements
  useEffect(() => {
    if (panel !== "announcements") return;

    getAnnouncementsAction().then((rows) => {
      setAnnouncements(rows);
    });
  }, [panel]);

  // Fetch Service Worker version & check live permissions
  useEffect(() => {
    if (panel !== "account") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          if (event.data?.version) {
            setSwVersion(event.data.version);
          }
        };
        reg.active?.postMessage({ type: "GET_VERSION" }, [channel.port2]);
      });
    }

    if ("Notification" in window) {
      setNotifPerm(Notification.permission as PermState);
    } else {
      setNotifPerm("unsupported");
    }

    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((res) => {
          setLocPerm(res.state as PermState);
          res.onchange = () => setLocPerm(res.state as PermState);
        })
        .catch(() => {});

      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((res) => {
          setMicPerm(res.state as PermState);
          res.onchange = () => setMicPerm(res.state as PermState);
        })
        .catch(() => {});
    }
  }, [panel]);

  const handleRequestNotifications = async () => {
    if (!("Notification" in window)) {
      setHelpModal("On iPhone/iPad, tap the Share button at the bottom of Safari and choose 'Add to Home Screen' first to enable alerts.");
      return;
    }
    if (Notification.permission === "denied") {
      setHelpModal("Notifications are blocked by your browser. Tap the lock/settings icon in your address bar -> Permissions -> Allow Notifications.");
      return;
    }
    const result = await Notification.requestPermission();
    setNotifPerm(result as PermState);
    if (result === "granted") {
      // TODO: Trigger your pushManager.subscribe() & save token to Supabase here
    }
  };

  const handleRequestLocation = () => {
    if (!("geolocation" in navigator)) return;
    if (locPerm === "denied") {
      setHelpModal("Location access is blocked. Open your browser or phone Settings -> Site Settings -> Location and allow access for BGLRR.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setLocPerm("granted"),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocPerm("denied");
          setHelpModal("Location was denied. Please enable it in your browser settings so barangay responders can find you.");
        }
      },
      { enableHighAccuracy: true }
    );
  };

  const handleRequestMicAndAudio = async () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") await ctx.resume();
        setAudioUnlocked(true);
      }
    } catch {}

    if (!navigator.mediaDevices?.getUserMedia) return;
    if (micPerm === "denied") {
      setHelpModal("Microphone access is blocked. Please enable Microphone in your browser's Site Settings.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPerm("granted");
    } catch {
      setMicPerm("denied");
    }
  };

  const renderBadge = (state: PermState, extraLabel?: string) => {
    if (state === "granted") {
      return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{extraLabel || "Allowed"}</span>;
    }
    if (state === "denied") {
      return <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">Blocked</span>;
    }
    if (state === "unsupported") {
      return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Install App</span>;
    }
    return <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#2020a2]">Turn On</span>;
  };
  const title =
    panel === "account"
      ? "Account & App Settings"
      : panel === "history"
        ? "Emergency History"
        : "Announcement Inbox";

  return (
    <main className={fullScreen ? "min-h-screen bg-white text-[#0a0a0a]" : "absolute inset-0 z-[60] flex items-end justify-center bg-black/35 backdrop-blur-[2px]"}>
      <section className={fullScreen ? "mx-auto min-h-screen w-full max-w-105 overflow-y-auto px-6 py-5 pb-10" : "max-h-[82dvh] w-full max-w-105 overflow-y-auto rounded-t-[28px] bg-white p-5 pb-8 shadow-[0_-12px_40px_rgba(0,0,0,0.18)]"}>
        {fullScreen ? (
          <button
            type="button"
            onClick={() => window.history.back()}
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
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-4 shadow-sm">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#2020a2] text-lg font-bold text-white">JR</div>
              <div>
                <p className="font-bold text-zinc-900">Juan Resident</p>
                <p className="text-sm text-zinc-500">Resident account</p>
              </div>
            </div>

            {helpModal && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-bold">How to Enable</p>
                <p className="mt-1 leading-relaxed">{helpModal}</p>
                <button
                  type="button"
                  onClick={() => setHelpModal(null)}
                  className="mt-2 text-xs font-bold underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <span>
                  <span className="block font-semibold text-zinc-900">Profile information</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">Name, phone, and address</span>
                </span>
                <span className="text-zinc-400">›</span>
              </button>

              <button
                type="button"
                onClick={handleRequestNotifications}
                className="flex w-full items-center justify-between border-t border-zinc-200 px-4 py-4 text-left"
              >
                <span>
                  <span className="block font-semibold text-zinc-900">Notifications</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">Emergency and barangay alerts</span>
                </span>
                {renderBadge(notifPerm)}
              </button>

              <button
                type="button"
                onClick={handleRequestLocation}
                className="flex w-full items-center justify-between border-t border-zinc-200 px-4 py-4 text-left"
              >
                <span>
                  <span className="block font-semibold text-zinc-900">Location</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">Allow location while using the app</span>
                </span>
                {renderBadge(locPerm)}
              </button>

              <button
                type="button"
                onClick={handleRequestMicAndAudio}
                className="flex w-full items-center justify-between border-t border-zinc-200 px-4 py-4 text-left"
              >
                <span>
                  <span className="block font-semibold text-zinc-900">Audio & Microphone</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">Siren sound alerts and voice SOS</span>
                </span>
                {renderBadge(micPerm, audioUnlocked ? "Ready" : undefined)}
              </button>

              <button
                type="button"
                className="flex w-full items-center justify-between border-t border-zinc-200 px-4 py-4 text-left"
              >
                <span>
                  <span className="block font-semibold text-zinc-900">Privacy & security</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">Password and account access</span>
                </span>
                <span className="text-zinc-400">›</span>
              </button>
            </div>

            <button type="button" className="w-full rounded-xl border border-red-200 py-3 font-bold text-red-600">
              Delete account
            </button>

            <p className="pt-2 text-center text-xs font-medium text-zinc-400">
              BGLRR PWA {swVersion ? `• ${swVersion}` : ""}
            </p>
          </div>
        )}

        {panel === "history" && (
          <div className="space-y-3">
            {emergencyHistory.map((item) => (
              <article key={item.id} className="rounded-2xl border border-zinc-200 p-4 shadow-sm">
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
                  <article key={titleText} className="rounded-2xl border border-zinc-200 p-4 shadow-sm">
                    <p className="font-bold text-zinc-900">{titleText}</p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600">{detail}</p>
                    <p className="mt-3 text-xs text-zinc-400">{date}</p>
                  </article>
                ))}
              </>
            ) : (
              announcements.map((item) => (
                <article key={item.id} className="rounded-2xl border border-zinc-200 p-4 shadow-sm">
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
