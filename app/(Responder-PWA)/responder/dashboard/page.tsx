'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client'; // Adjust path to your browser Supabase client
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

export default function TemporaryResponderScreen() {
  const supabase = createClient();

  const [pushStatus, setPushStatus] = useState<'checking' | 'subscribed' | 'unsubscribed' | 'denied' | 'unsupported'>('checking');
  const [subscribing, setSubscribing] = useState(false);

  const [responderId, setResponderId] = useState<number>(1);
  const [standbyList, setStandbyList] = useState<EmergencyReq[]>([]);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStandbyEmergencies = useCallback(async () => {
    const { data } = await supabase
      .from('tbl_emergency_req')
      .select('id, category, status, resident_description, current_latitude, current_longitude, created_at')
      .eq('status', 'on-standby')
      .is('responder_id', null)
      .order('created_at', { ascending: false });

    if (data) setStandbyList(data);
  }, [supabase]);

  useEffect(() => {
    fetchStandbyEmergencies();

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setPushStatus('denied');
      return;
    }

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setPushStatus(sub ? 'subscribed' : 'unsubscribed');
    });
  }, [fetchStandbyEmergencies]);

  useEffect(() => {
    const channel = supabase
      .channel('responder-standby-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tbl_emergency_req' },
        (payload: any) => {
          fetchStandbyEmergencies();

          if (payload.new?.status === 'on-standby' && payload.old?.status !== 'on-standby') {
            const audio = new Audio('/beep.mp3');
            audio.play().catch(() => {});
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
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushStatus('denied');
        return;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      const subJson = sub.toJSON();
      const res = await savePushSubscription({
        userId: null,
        role: 'responder',
        endpoint: subJson.endpoint!,
        p256dh: subJson.keys!.p256dh!,
        auth: subJson.keys!.auth!,
      });

      if (!res.success) throw new Error(res.error);

      setPushStatus('subscribed');
      setBannerMessage({ type: 'success', text: 'Push alerts enabled for this device!' });
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.message || 'Failed to subscribe' });
    } finally {
      setSubscribing(false);
    }
  };

  const handleClaim = async (emergencyId: number) => {
    setClaimingId(emergencyId);
    setBannerMessage(null);

    const res = await claimStandbyEmergency(emergencyId, responderId);

    if (res.success) {
      setBannerMessage({ type: 'success', text: `You claimed Emergency #${emergencyId}! Status is now RESOLVING.` });
      setStandbyList((prev) => prev.filter((item) => item.id !== emergencyId));
    } else {
      setBannerMessage({ type: 'error', text: res.error || 'Could not claim emergency.' });
      fetchStandbyEmergencies();
    }

    setClaimingId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-lg mx-auto space-y-6">
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Responder Dispatch (Temp)</h1>
          <p className="text-xs text-slate-400">Standby Queue & Push Alert Setup</p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="resp-id" className="text-slate-400">Responder ID:</label>
          <input
            id="resp-id"
            type="number"
            value={responderId}
            onChange={(e) => setResponderId(Number(e.target.value))}
            className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-center font-mono"
          />
        </div>
      </header>

      <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Dispatch Push Notifications</span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
              pushStatus === 'subscribed'
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {pushStatus === 'checking' && 'Checking...'}
            {pushStatus === 'subscribed' && '● Active'}
            {pushStatus === 'unsubscribed' && '○ Off'}
            {pushStatus === 'denied' && '✕ Blocked'}
            {pushStatus === 'unsupported' && 'Unsupported'}
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Tap below to register this device so you get alerted whenever an operator moves an emergency to{' '}
          <code className="text-slate-200">on-standby</code>.
        </p>

        <button
          onClick={handleEnableAlerts}
          disabled={subscribing || pushStatus === 'denied' || pushStatus === 'unsupported'}
          className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 font-semibold text-sm transition"
        >
          {subscribing
            ? 'Enabling Alerts...'
            : pushStatus === 'subscribed'
            ? 'Re-Sync Device Subscription'
            : '🔔 Enable Dispatch Alerts'}
        </button>
      </section>

      {bannerMessage && (
        <div
          className={`p-3 rounded-lg text-xs font-medium border ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
              : 'bg-red-950/60 border-red-700 text-red-200'
          }`}
        >
          {bannerMessage.text}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            On-Standby Emergencies ({standbyList.length})
          </h2>
          <button
            onClick={fetchStandbyEmergencies}
            className="text-xs text-slate-400 hover:text-white underline"
          >
            Refresh
          </button>
        </div>

        {standbyList.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 text-slate-500 text-sm">
            No emergencies on standby right now.
          </div>
        ) : (
          standbyList.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-red-500/20 text-red-300">
                  {item.category}
                </span>
                <span className="text-xs font-mono text-slate-400">Request #{item.id}</span>
              </div>

              <p className="text-sm text-slate-200">
                {item.resident_description || 'No description provided.'}
              </p>

              {item.current_latitude && item.current_longitude && (
                <a
                  href={`https://google.com{item.current_latitude},${item.current_longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-xs text-sky-400 hover:underline"
                >
                  📍 View Coordinates ({item.current_latitude.toFixed(5)}, {item.current_longitude.toFixed(5)})
                </a>
              )}

              <button
                onClick={() => handleClaim(item.id)}
                disabled={claimingId === item.id}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-semibold text-sm transition"
              >
                {claimingId === item.id ? 'Claiming...' : '✅ Claim Emergency'}
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
