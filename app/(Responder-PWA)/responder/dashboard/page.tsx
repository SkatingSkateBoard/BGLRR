'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { savePushSubscription, claimStandbyEmergency } from '@/app/actions/notify';

interface EmergencyReq {
  id: number;
  category: string;
  status: string;
  resident_description: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
  created_at: string;
}

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
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleString();
}

export default function TemporaryResponderScreen() {
  const supabase = createClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [pushStatus, setPushStatus] = useState<PushStatus>('checking');
  const [subscribing, setSubscribing] = useState(false);
  const [responderId, setResponderId] = useState<number>(1);
  const [standbyList, setStandbyList] = useState<EmergencyReq[]>([]);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStandbyEmergencies = useCallback(async () => {
    const { data, error } = await supabase
      .from('tbl_emergency_req')
      .select('id, category, status, resident_description, current_latitude, current_longitude, created_at')
      .eq('status', 'on-standby')
      .is('responder_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      setBannerMessage({ type: 'error', text: `Could not load queue: ${error.message}` });
      return;
    }
    if (data) setStandbyList(data);
  }, [supabase]);

  // Initial load and push status check
  useEffect(() => {
    fetchStandbyEmergencies();

    if (!window.isSecureContext) {
      setPushStatus('insecure');
      return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setPushStatus('denied');
      return;
    }

    navigator.serviceWorker.getRegistration('/sw.js').then(async (reg) => {
      if (!reg) {
        setPushStatus('unsubscribed');
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      setPushStatus(sub ? 'subscribed' : 'unsubscribed');
    });
  }, [fetchStandbyEmergencies]);

  // Realtime feed: plays the alert and shows a local notification
  // when an emergency goes on standby while the page is hidden.
  useEffect(() => {
    const channel = supabase
      .channel('responder-standby-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tbl_emergency_req' },
        (payload: any) => {
          fetchStandbyEmergencies();

          const becameStandby =
            payload.new?.status === 'on-standby' && payload.old?.status !== 'on-standby';

          if (becameStandby) {
            audioRef.current?.play().catch(() => {});

            if (Notification.permission === 'granted' && document.visibilityState === 'hidden') {
              navigator.serviceWorker.getRegistration('/sw.js').then((reg) => {
                reg?.showNotification('🚨 Emergency Dispatch Alert', {
                  body: payload.new?.resident_description || 'New emergency on standby. Tap to claim.',
                  tag: `emergency-${payload.new.id}`,
                  requireInteraction: true,
                  renotify: true,
                  vibrate: VIBRATION_PATTERN,
                  data: {
                    url: '/responder',
                    latitude: payload.new?.current_latitude ?? null,
                    longitude: payload.new?.current_longitude ?? null,
                  },
                } as NotificationOptions);
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchStandbyEmergencies]);

  const handleEnableAlerts = async () => {
    setSubscribing(true);
    setBannerMessage(null);

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
      setBannerMessage({ type: 'success', text: 'Dispatch alerts are active on this device.' });
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err?.message || 'Failed to enable alerts.' });
    } finally {
      setSubscribing(false);
    }
  };

  const handleClaim = async (emergencyId: number) => {
    setClaimingId(emergencyId);
    setBannerMessage(null);

    try {
      const res = await claimStandbyEmergency(emergencyId, responderId);

      if (res.success) {
        setBannerMessage({ type: 'success', text: `You claimed Emergency #${emergencyId}. Status is now RESOLVING.` });
        setStandbyList((prev) => prev.filter((item) => item.id !== emergencyId));
      } else {
        setBannerMessage({ type: 'error', text: res.error || 'Could not claim emergency.' });
        fetchStandbyEmergencies();
      }
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err?.message || 'Claim request failed.' });
    } finally {
      setClaimingId(null);
    }
  };

  const statusStyles: Record<PushStatus, string> = {
    checking: 'bg-slate-100 text-slate-600 ring-slate-200',
    subscribed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    unsubscribed: 'bg-amber-50 text-amber-700 ring-amber-200',
    denied: 'bg-red-50 text-red-700 ring-red-200',
    unsupported: 'bg-slate-100 text-slate-600 ring-slate-200',
    insecure: 'bg-red-50 text-red-700 ring-red-200',
  };

  const statusLabel: Record<PushStatus, string> = {
    checking: 'Checking…',
    subscribed: 'Active',
    unsubscribed: 'Off',
    denied: 'Blocked',
    unsupported: 'Unsupported',
    insecure: 'Needs HTTPS',
  };

  const pushDisabled = subscribing || pushStatus === 'unsupported' || pushStatus === 'insecure';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-red-600">Live Dispatch</p>
            <h1 className="text-2xl font-bold tracking-tight">Responder Queue</h1>
            <p className="text-xs text-slate-500">Standby emergencies awaiting a responder</p>
          </div>

          <label className="flex flex-col items-end gap-1 text-[11px] font-medium text-slate-500">
            Responder ID
            <input
              type="number"
              min={1}
              value={responderId}
              onChange={(e) => setResponderId(Number(e.target.value))}
              className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-center font-mono text-sm text-slate-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </label>
        </header>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Dispatch Alerts</h2>
              <p className="text-xs text-slate-500">Get alerted when an emergency goes on standby.</p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[pushStatus]}`}>
              {statusLabel[pushStatus]}
            </span>
          </div>

          <button
            onClick={handleEnableAlerts}
            disabled={pushDisabled}
            className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {subscribing
              ? 'Enabling alerts…'
              : pushStatus === 'subscribed'
              ? 'Re-sync this device'
              : 'Enable dispatch alerts'}
          </button>

          {pushStatus === 'denied' && (
            <p className="text-xs text-red-600">
              Notifications are blocked for this site. Re-enable them in your browser's site settings, then reload.
            </p>
          )}
          {pushStatus === 'insecure' && (
            <p className="text-xs text-red-600">Push alerts require HTTPS or localhost.</p>
          )}
        </section>

        {bannerMessage && (
          <div
            role="status"
            className={`rounded-lg border px-4 py-3 text-sm font-medium ${
              bannerMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {bannerMessage.text}
          </div>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              On standby ({standbyList.length})
            </h2>
            <button
              onClick={fetchStandbyEmergencies}
              className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
            >
              Refresh
            </button>
          </div>

          {standbyList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
              No emergencies on standby right now.
            </div>
          ) : (
            standbyList.map((item) => (
              <article
                key={item.id}
                className="space-y-3 rounded-2xl border border-red-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                    {item.category}
                  </span>
                  <span className="text-xs text-slate-500">
                    #{item.id} · {timeAgo(item.created_at)}
                  </span>
                </div>

                <p className="text-sm leading-relaxed text-slate-800">
                  {item.resident_description || 'No description provided.'}
                </p>

                {item.current_latitude != null && item.current_longitude != null && (
                  <div className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700">
                    <span className="font-sans font-medium text-slate-500">Location</span>
                    {item.current_latitude.toFixed(5)}, {item.current_longitude.toFixed(5)}
                  </div>
                )}

                <button
                  onClick={() => handleClaim(item.id)}
                  disabled={claimingId === item.id}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {claimingId === item.id ? 'Claiming…' : 'Claim emergency'}
                </button>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}