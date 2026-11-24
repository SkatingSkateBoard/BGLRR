'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertTriangle } from 'lucide-react';
import { savePushSubscription } from '@/app/actions/notify';

type PushStatus = 'checking' | 'subscribed' | 'unsubscribed' | 'denied' | 'unsupported';

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

export function ResidentPushBanner() {
  const [pushStatus, setPushStatus] = useState<PushStatus>('checking');
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setPushStatus('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setPushStatus('denied');
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (existingSub) => {
        if (existingSub) {
          const json = existingSub.toJSON();
          if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
            await savePushSubscription({
              role: 'resident',
              endpoint: json.endpoint,
              p256dh: json.keys.p256dh,
              auth: json.keys.auth,
            });
          }
          setPushStatus('subscribed');
        } else {
          setPushStatus('unsubscribed');
        }
      })
      .catch(() => setPushStatus('unsubscribed'));
  }, []);

  async function handleEnableNotifications() {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushStatus('denied');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error('Invalid subscription');
      }

      const res = await savePushSubscription({
        role: 'resident',
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });

      if (res.success) {
        setPushStatus('subscribed');
      }
    } catch (err) {
      console.error('Resident push subscription error:', err);
    } finally {
      setSubscribing(false);
    }
  }

  // Hide while checking, if unsupported, or once already subscribed (to keep dashboard clean)
  if (pushStatus === 'checking' || pushStatus === 'unsupported' || pushStatus === 'subscribed') {
    return null;
  }

  if (pushStatus === 'denied') {
    return (
      <div className="mx-4 mt-3 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <span>
          Announcement notifications are blocked in your browser settings. Enable them to receive barangay alerts.
        </span>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-xs">
      <div className="flex items-center gap-2.5 text-xs sm:text-sm text-blue-950">
        <Bell className="h-4 w-4 shrink-0 text-blue-600" />
        <span>Enable notifications to get instant barangay emergency announcements.</span>
      </div>
      <button
        type="button"
        onClick={handleEnableNotifications}
        disabled={subscribing}
        className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {subscribing ? 'Enabling...' : 'Turn On'}
      </button>
    </div>
  );
}
