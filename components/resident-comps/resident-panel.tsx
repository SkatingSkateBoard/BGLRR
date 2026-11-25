"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getAnnouncementsAction, type AnnouncementRow } from "@/app/actions/announcement-actions";

export type ResidentPanel = "account" | "history" | "announcements" | "blotter";

interface ResidentPanelsProps {
  panel: ResidentPanel;
  fullScreen?: boolean;
}

type PermState = "granted" | "denied" | "prompt" | "unsupported";
type PermissionKey = "notifications" | "location" | "microphone";
type Platform = "ios" | "android" | "desktop";
type BadgeTone = "ok" | "bad" | "warn" | "idle";

type HelpModalState = {
  title: string;
  message: string;
  steps: string[];
} | null;

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  notifications: "Notifications",
  location: "Location",
  microphone: "Microphone",
};

const emergencyHistory = [
  { id: "EM-1048", category: "Medikal", status: "Resolving", date: "Nov 21, 2026", detail: "Emergency response request" },
  { id: "EM-1031", category: "Aksidente", status: "Resolved", date: "Nov 18, 2026", detail: "Road incident report" },
  { id: "EM-0994", category: "Krimen", status: "Resolved", date: "Nov 12, 2026", detail: "Suspicious activity report" },
];

const getPlatform = (): Platform => {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
};

const buildEnableSteps = (key: PermissionKey): string[] => {
  const label = PERMISSION_LABELS[key];
  switch (getPlatform()) {
    case "ios":
      return [
        "Open your iPhone Settings app.",
        "Scroll down and tap BGLRR.",
        `Tap ${label} and set it to Allow.`,
      ];
    case "android":
      return [
        "Long-press the BGLRR app icon on your home screen.",
        "Tap App info (ⓘ) → Permissions.",
        `Enable ${label}.`,
      ];
    default:
      return [
        "Click the lock or settings icon next to the URL bar.",
        "Open Site Settings.",
        `Set ${label} to Allow, then refresh the page.`,
      ];
  }
};

const Badge = ({ tone, children }: { tone: BadgeTone; children: ReactNode }) => {
  const styles: Record<BadgeTone, string> = {
    ok: "bg-emerald-50 text-emerald-700",
    bad: "bg-red-50 text-red-600",
    warn: "bg-amber-50 text-amber-700",
    idle: "bg-blue-50 text-[#2020a2]",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${styles[tone]}`}>
      {children}
    </span>
  );
};

const permBadge = (state: PermState) => {
  if (state === "granted") return <Badge tone="ok">Allowed</Badge>;
  if (state === "denied") return <Badge tone="bad">Blocked</Badge>;
  if (state === "unsupported") return <Badge tone="warn">Not supported</Badge>;
  return <Badge tone="idle">Turn on</Badge>;
};

const SettingRow = ({
  title,
  subtitle,
  badge,
  onClick,
  bordered = true,
}: {
  title: string;
  subtitle: string;
  badge?: ReactNode;
  onClick?: () => void;
  bordered?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={`flex w-full items-center justify-between gap-3 px-4 py-4 text-left disabled:cursor-default ${
      bordered ? "border-t border-zinc-200" : ""
    }`}
  >
    <span className="min-w-0">
      <span className="block font-semibold text-zinc-900">{title}</span>
      <span className="mt-0.5 block text-xs text-zinc-500">{subtitle}</span>
    </span>
    {badge ?? <span className="text-zinc-400">›</span>}
  </button>
);

export function ResidentPanels({ panel, fullScreen = false }: ResidentPanelsProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [swVersion, setSwVersion] = useState<string>("");

  const [notifPerm, setNotifPerm] = useState<PermState>("prompt");
  const [locPerm, setLocPerm] = useState<PermState>("prompt");
  const [micPerm, setMicPerm] = useState<PermState>("prompt");
  const [helpModal, setHelpModal] = useState<HelpModalState>(null);

  const openEnableHelp = (key: PermissionKey, reason: string) => {
    setHelpModal({
      title: `Turn on ${PERMISSION_LABELS[key]}`,
      message: reason,
      steps: buildEnableSteps(key),
    });
  };

  // Announcements
  useEffect(() => {
    if (panel !== "announcements") return;
    getAnnouncementsAction().then(setAnnouncements);
  }, [panel]);

  // Service worker version
  useEffect(() => {
    if (panel !== "account") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    navigator.serviceWorker.ready.then((reg) => {
      if (cancelled || !reg.active) return;
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (event.data?.version) setSwVersion(event.data.version);
      };
      reg.active.postMessage({ type: "GET_VERSION" }, [channel.port2]);
    });

    return () => {
      cancelled = true;
    };
  }, [panel]);

  // Live permission states. Re-read when the user comes back to the app,
  // so changes made in phone or browser settings show up.
  useEffect(() => {
    if (panel !== "account") return;

    const refreshPermissions = () => {
      if ("Notification" in window) {
        const p = Notification.permission;
        setNotifPerm(p === "default" ? "prompt" : (p as PermState));
      } else {
        setNotifPerm("unsupported");
      }

      if (!navigator.permissions) return;

      navigator.permissions
        .query({ name: "geolocation" })
        .then((res) => setLocPerm(res.state as PermState))
        .catch(() => {});

      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((res) => setMicPerm(res.state as PermState))
        .catch(() => {});
    };

    refreshPermissions();
    document.addEventListener("visibilitychange", refreshPermissions);
    window.addEventListener("focus", refreshPermissions);

    return () => {
      document.removeEventListener("visibilitychange", refreshPermissions);
      window.removeEventListener("focus", refreshPermissions);
    };
  }, [panel]);

  const handleNotifications = async () => {
    if (!("Notification" in window)) {
      setHelpModal({
        title: "Install the app first",
        message: "Alerts on iPhone and iPad need the app added to your Home Screen.",
        steps: [
          "Tap the Share button at the bottom of Safari.",
          "Choose 'Add to Home Screen'.",
          "Open BGLRR from your Home Screen and try again.",
        ],
      });
      return;
    }
    if (Notification.permission === "denied") {
      openEnableHelp("notifications", "Notifications are blocked for this site.");
      return;
    }
    const result = await Notification.requestPermission();
    setNotifPerm(result === "default" ? "prompt" : (result as PermState));
    // TODO: pushManager.subscribe() and save the token to Supabase when result === "granted"
  };

  const handleLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocPerm("unsupported");
      return;
    }
    if (locPerm === "denied") {
      openEnableHelp("location", "Responders need your location to find you.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setLocPerm("granted"),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocPerm("denied");
          openEnableHelp("location", "Responders need your location to find you.");
        }
      },
      { enableHighAccuracy: true }
    );
  };

  const handleVoiceSos = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicPerm("unsupported");
      return;
    }
    if (micPerm === "denied") {
      openEnableHelp("microphone", "Voice SOS is off because the microphone is blocked.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPerm("granted");
    } catch {
      setMicPerm("denied");
      openEnableHelp("microphone", "Microphone access was denied, so voice SOS is off.");
    }
  };

  const voiceSosSubtitle =
    micPerm === "granted"
      ? "You can call for help by voice."
      : micPerm === "denied"
        ? "Blocked. Tap for steps to turn it on."
        : micPerm === "unsupported"
          ? "Not supported in this browser."
          : "Lets you call for help by voice.";

  const title =
    panel === "account"
      ? "Account & App Settings"
      : panel === "history"
        ? "Emergency History"
        : "Announcement Inbox";

  return (
    <main
      className={
        fullScreen
          ? "min-h-screen bg-white text-[#0a0a0a]"
          : "absolute inset-0 z-[60] flex items-end justify-center bg-black/35 backdrop-blur-[2px]"
      }
    >
      <section
        className={
          fullScreen
            ? "mx-auto min-h-screen w-full max-w-105 overflow-y-auto px-6 py-5 pb-10"
            : "max-h-[82dvh] w-full max-w-105 overflow-y-auto rounded-t-[28px] bg-white p-5 pb-8 shadow-[0_-12px_40px_rgba(0,0,0,0.18)]"
        }
      >
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

        <div className="mb-5">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-zinc-400">Resident</p>
          <h1 className="text-xl font-extrabold text-zinc-950">{title}</h1>
        </div>

        {panel === "account" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-4 shadow-sm">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#2020a2] text-lg font-bold text-white">
                JR
              </div>
              <div>
                <p className="font-bold text-zinc-900">Juan Resident</p>
                <p className="text-sm text-zinc-500">Resident account</p>
              </div>
            </div>

            {helpModal && (
              <div
                role="alert"
                className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
              >
                <p className="font-bold">{helpModal.title}</p>
                <p className="mt-1 leading-relaxed">{helpModal.message}</p>
                <ol className="mt-3 list-decimal space-y-1 pl-5 leading-relaxed">
                  {helpModal.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => setHelpModal(null)}
                  className="mt-3 text-xs font-bold underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm">
              <SettingRow
                bordered={false}
                title="Profile information"
                subtitle="Name, phone, and address"
              />
              <SettingRow
                title="Notifications"
                subtitle="Emergency and barangay alerts"
                badge={permBadge(notifPerm)}
                onClick={handleNotifications}
              />
              <SettingRow
                title="Location"
                subtitle="Lets responders find you while you use the app"
                badge={permBadge(locPerm)}
                onClick={handleLocation}
              />
              <SettingRow
                title="Voice SOS"
                subtitle={voiceSosSubtitle}
                badge={permBadge(micPerm)}
                onClick={handleVoiceSos}
              />
              <SettingRow
                title="Privacy & security"
                subtitle="Password and account access"
              />
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
                  <Badge tone={item.status === "Resolved" ? "ok" : "warn"}>{item.status}</Badge>
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
              [
                ["Community Road Closure", "A portion of Regalado Avenue will be closed for maintenance from 8:00 AM to 5:00 PM.", "Today"],
                ["Barangay Health Schedule", "Free blood pressure checkups are available at the community center.", "Yesterday"],
              ].map(([titleText, detail, date]) => (
                <article key={titleText} className="rounded-2xl border border-zinc-200 p-4 shadow-sm">
                  <p className="font-bold text-zinc-900">{titleText}</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">{detail}</p>
                  <p className="mt-3 text-xs text-zinc-400">{date}</p>
                </article>
              ))
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