'use client';

// app/pwa/(Responder-PWA)/responder/dashboard/page.tsx
// Merged: redesigned dashboard + dispatch alerts (push, sound, hidden-tab notification).

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { savePushSubscription } from '@/app/actions/notify';
import {
  claimEmergency,
  getStandbyAndActiveEmergencies,
  resolveEmergency,
  type EmergencyRow,
} from '@/app/actions/responder';

type Banner = { type: 'success' | 'error'; text: string } | null;
type PushStatus = 'checking' | 'subscribed' | 'unsubscribed' | 'denied' | 'unsupported' | 'insecure';

const VIBRATION_PATTERN = [250, 100, 250, 100, 250, 400, 700, 150, 700];

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function timeAgo(iso: string) {
  const mins = Math.floor(Math.max(0, Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleString('en-PH');
}

const STATUS_STYLES: Record<PushStatus, string> = {
  checking: 'bg-slate-100 text-slate-600 ring-slate-200',
  subscribed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  unsubscribed: 'bg-amber-50 text-amber-700 ring-amber-200',
  denied: 'bg-red-50 text-red-700 ring-red-200',
  unsupported: 'bg-slate-100 text-slate-600 ring-slate-200',
  insecure: 'bg-red-50 text-red-700 ring-red-200',
};

const STATUS_LABEL: Record<PushStatus, string> = {
  checking: 'Checking…',
  subscribed: 'Active',
  unsubscribed: 'Off',
  denied: 'Blocked',
  unsupported: 'Unsupported',
  insecure: 'Needs HTTPS',
};

export default function ResponderDashboardPage() {
  const [supabase] = useState(() => createClient());

  const [standby, setStandby] = useState<EmergencyRow[]>([]);
  const [active, setActive] = useState<EmergencyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmingResolve, setConfirmingResolve] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  const [pushStatus, setPushStatus] = useState<PushStatus>('checking');
  const [subscribing, setSubscribing] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeIdRef = useRef<number | null>(null);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const res = await getStandbyAndActiveEmergencies();
    if (res.success) {
      setStandby(res.standby);
      setActive(res.active);
    } else {
      setBanner({ type: 'error', text: res.error });
    }
    setLoading(false);
  }, []);

  const scheduleLoad = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(load, 250);
  }, [load]);

  useEffect(() => {
    activeIdRef.current = active?.id ?? null;
  }, [active]);

  // Initial load + check the current push subscription state.
  useEffect(() => {
    load();

    if (!window.isSecureContext) {
      setPushStatus('insecure');
    } else if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushStatus('unsupported');
    } else if (Notification.permission === 'denied') {
      setPushStatus('denied');
    } else {
      navigator.serviceWorker.getRegistration('/sw.js').then(async (reg) => {
        if (!reg) {
          setPushStatus('unsubscribed');
          return;
        }
        const sub = await reg.pushManager.getSubscription();
        setPushStatus(sub ? 'subscribed' : 'unsubscribed');
      });
    }

    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    };
  }, [load]);

  // Realtime: keeps the queue in sync, plays the alert and shows a local
  // notification when an emergency goes on standby, and patches live coordinates.
  useEffect(() => {
    const channel = supabase
      .channel('responder-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tbl_emergency_req' },
        (payload: any) => {
          const row = payload.new ?? {};
          const currentActiveId = activeIdRef.current;

          const becameStandby =
            row.status === 'on-standby' && payload.old?.status !== 'on-standby';

          if (becameStandby) {
            audioRef.current?.play().catch(() => {});

            if (Notification.permission === 'granted' && document.visibilityState === 'hidden') {
              navigator.serviceWorker.getRegistration('/sw.js').then((reg) => {
                reg?.showNotification('🚨 Emergency Dispatch Alert', {
                  body: row.resident_description || 'New emergency on standby. Tap to claim.',
                  tag: `emergency-${row.id}`,
                  requireInteraction: true,
                  renotify: true,
                  vibrate: VIBRATION_PATTERN,
                  data: {
                    url: '/pwa/responder/dashboard',
                    latitude: row.current_latitude ?? null,
                    longitude: row.current_longitude ?? null,
                  },
                } as NotificationOptions);
              });
            }
          }

          // Live coordinate pings on the active assignment: patch in place.
          if (
            payload.eventType === 'UPDATE' &&
            currentActiveId !== null &&
            row.id === currentActiveId &&
            row.status === 'resolving'
          ) {
            setActive((prev) =>
              prev && prev.id === row.id
                ? {
                    ...prev,
                    current_latitude: row.current_latitude,
                    current_longitude: row.current_longitude,
                    updated_at: row.updated_at,
                  }
                : prev
            );
            return;
          }

          scheduleLoad();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, scheduleLoad]);

  const handleEnableAlerts = async () => {
    setSubscribing(true);
    setBanner(null);

    try {
      // Unlock audio from this user gesture so later alerts can play.
      if (!audioRef.current) audioRef.current = new Audio('/beep.mp3');
      audioRef.current.play().then(() => audioRef.current?.pause()).catch(() => {});

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushStatus(permission === 'denied' ? 'denied' : 'unsubscribed');
        throw new Error(
          permission === 'denied'
            ? 'Notifications are blocked. Allow them in your browser site settings.'
            : 'Notification permission was dismissed.'
        );
      }

      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        throw new Error('Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY in environment.');
      }

      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
        });
      }

      const subJson = sub.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error('Browser returned an incomplete push subscription.');
      }

      const res = await savePushSubscription({
        userId: null,
        role: 'responder',
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      });

      if (!res.success) throw new Error(res.error || 'Server rejected the subscription.');

      setPushStatus('subscribed');
      setBanner({ type: 'success', text: 'Dispatch alerts are active on this device.' });
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Failed to enable alerts.' });
    } finally {
      setSubscribing(false);
    }
  };

  const handleClaim = async (id: number) => {
    setBusyId(id);
    setBanner(null);
    const res = await claimEmergency(id);
    setBanner(
      res.success
        ? { type: 'success', text: `You claimed Emergency #${id}.` }
        : { type: 'error', text: res.error }
    );
    await load();
    setBusyId(null);
  };

  const handleResolve = async () => {
    if (!active) return;
    const id = active.id;
    setBusyId(id);
    setBanner(null);
    const res = await resolveEmergency(id);
    setBanner(
      res.success
        ? { type: 'success', text: `Emergency #${id} marked as resolved.` }
        : { type: 'error', text: res.error }
    );
    setConfirmingResolve(false);
    await load();
    setBusyId(null);
  };

  const pushDisabled = subscribing || pushStatus === 'unsupported' || pushStatus === 'insecure';

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      <header className="bg-slate-900 px-5 pb-4 pt-6 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-300">Live dispatch</p>
        <h1 className="mt-0.5 text-xl font-extrabold">Responder Dashboard</h1>
        <p className="text-xs text-slate-400">Barangay Greater Lagro (BGLRR)</p>
      </header>

      <main className="flex flex-1 flex-col gap-4 overflow-auto p-4 pb-40">
        {/* Dispatch alerts: push subscription for this device */}
        <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">Dispatch alerts</h2>
              <p className="text-xs text-slate-500">Get alerted when an emergency goes on standby.</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[pushStatus]}`}
            >
              {STATUS_LABEL[pushStatus]}
            </span>
          </div>

          <button
            onClick={handleEnableAlerts}
            disabled={pushDisabled}
            className="w-full rounded-2xl bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {subscribing
              ? 'Enabling alerts…'
              : pushStatus === 'subscribed'
              ? 'Re-sync this device'
              : 'Enable dispatch alerts'}
          </button>

          {pushStatus === 'denied' && (
            <p className="text-xs text-red-600">
              Notifications are blocked for this site. Re-enable them in your browser&apos;s site settings, then reload.
            </p>
          )}
          {pushStatus === 'insecure' && (
            <p className="text-xs text-red-600">Push alerts require HTTPS or localhost.</p>
          )}
        </section>

        {banner && (
          <div
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              banner.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {banner.text}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : active ? (
          <ActiveAssignment emergency={active} />
        ) : (
          <StandbyList items={standby} busyId={busyId} onClaim={handleClaim} onRefresh={load} />
        )}
      </main>

      {active && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white px-4 pb-6 pt-3">
          {confirmingResolve ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-800">
                Mark #{active.id} as resolved? This ends the resident&apos;s call.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setConfirmingResolve(false)}
                  disabled={busyId === active.id}
                  className="rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  disabled={busyId === active.id}
                  className="rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busyId === active.id ? 'Resolving…' : 'Yes, resolve'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href={`/pwa/responder/call/emergency-${active.id}`}
                className="rounded-2xl bg-slate-900 py-3.5 text-center text-sm font-bold text-white"
              >
                Join voice call
              </Link>
              <button
                onClick={() => setConfirmingResolve(true)}
                disabled={busyId === active.id}
                className="rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white disabled:opacity-50"
              >
                Mark as resolved
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Active assignment ---------------------------- */

function ActiveAssignment({ emergency }: { emergency: EmergencyRow }) {
  const coords =
    emergency.current_latitude != null && emergency.current_longitude != null
      ? { lat: emergency.current_latitude, lng: emergency.current_longitude }
      : null;

  return (
    <section className="space-y-4 rounded-3xl border-2 border-emerald-500 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
          Your assignment
        </span>
        <span className="text-xs text-slate-500">
          #{emergency.id} · {timeAgo(emergency.created_at)}
        </span>
      </div>

      <div>
        <span className="rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
          {emergency.category}
        </span>
      </div>

      <p className="text-[15px] leading-relaxed text-slate-700">
        {emergency.resident_description || 'No description provided.'}
      </p>

      {emergency.photo_emergency && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={emergency.photo_emergency} alt="Emergency photo" className="h-40 w-full rounded-2xl object-cover" />
      )}

      {coords && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700">
            <span className="font-sans font-semibold text-slate-500">Location</span>
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            <span className="font-sans text-slate-400">
              · updated {timeAgo(emergency.updated_at ?? emergency.created_at)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-slate-200 bg-white py-3 text-center text-sm font-bold text-slate-800"
            >
              Google Maps
            </a>
            <a
              href={`https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-slate-200 bg-white py-3 text-center text-sm font-bold text-slate-800"
            >
              Waze
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

/* --------------------------------- Standby list ----------------------------- */

function StandbyList({
  items,
  busyId,
  onClaim,
  onRefresh,
}: {
  items: EmergencyRow[];
  busyId: number | null;
  onClaim: (id: number) => void;
  onRefresh: () => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
          On standby ({items.length})
        </h2>
        <button onClick={onRefresh} className="text-xs font-semibold text-slate-500 underline underline-offset-2">
          Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
          No emergencies on standby right now.
        </div>
      ) : (
        items.map((item) => (
          <article key={item.id} className="space-y-3 rounded-3xl border-l-[6px] border-red-600 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
                {item.category}
              </span>
              <span className="text-xs text-slate-500">
                #{item.id} · {timeAgo(item.created_at)}
              </span>
            </div>

            <p className="text-sm leading-relaxed text-slate-700">
              {item.resident_description || 'No description provided.'}
            </p>

            {item.photo_emergency && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photo_emergency} alt="Emergency photo" className="h-36 w-full rounded-2xl object-cover" />
            )}

            {item.current_latitude != null && item.current_longitude != null && (
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-700">
                <span className="font-sans font-semibold text-slate-500">Location</span>
                {item.current_latitude.toFixed(5)}, {item.current_longitude.toFixed(5)}
              </div>
            )}

            <button
              onClick={() => onClaim(item.id)}
              disabled={busyId === item.id}
              className="w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busyId === item.id ? 'Claiming…' : 'Claim emergency'}
            </button>
          </article>
        ))
      )}
    </section>
  );
}
