'use client';

// app/pwa/(Responder-PWA)/responder/call/[room-id]/call-room.tsx

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
} from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import { createClient } from '@/utils/supabase/client';
import { getResponderCallToken } from '@/app/actions/responder';

const DASHBOARD = '/pwa/responder/dashboard';

function formatElapsed(totalSec: number) {
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function Fallback({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-900 px-6 text-center text-white">
      {children}
      <Link
        href={DASHBOARD}
        className="w-full max-w-xs rounded-2xl bg-white px-4 py-3.5 text-center text-sm font-bold text-slate-900"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

export default function CallRoom({ emergencyId }: { emergencyId: number }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const leave = () => router.replace(DASHBOARD);

  // Mint the responder token. The server verifies assignment and 'resolving'.
  useEffect(() => {
    let cancelled = false;
    getResponderCallToken(emergencyId).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setToken(res.token);
        setServerUrl(res.serverUrl);
      } else {
        setError(res.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [emergencyId]);

  // Initial location, then live updates. End the call if the emergency leaves 'resolving'.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('tbl_emergency_req')
      .select('current_latitude, current_longitude')
      .eq('id', emergencyId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.current_latitude != null && data?.current_longitude != null) {
          setCoords({ lat: data.current_latitude, lng: data.current_longitude });
        }
      });

    const channel = supabase
      .channel(`responder-call-${emergencyId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tbl_emergency_req', filter: `id=eq.${emergencyId}` },
        (payload: any) => {
          const row = payload.new ?? {};
          if (row.status !== 'resolving') {
            setEnded('This emergency has ended.');
            return;
          }
          if (row.current_latitude != null && row.current_longitude != null) {
            setCoords({ lat: row.current_latitude, lng: row.current_longitude });
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, emergencyId]);

  if (ended || error) return <Fallback>{ended ?? error}</Fallback>;

  if (!token || !serverUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm text-slate-300">
        Preparing call…
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio
      video={false}
      onDisconnected={leave}
      className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white"
    >
      <RoomAudioRenderer />
      <CallScreen emergencyId={emergencyId} coords={coords} onLeave={leave} />
    </LiveKitRoom>
  );
}

function CallScreen({
  emergencyId,
  coords,
  onLeave,
}: {
  emergencyId: number;
  coords: { lat: number; lng: number } | null;
  onLeave: () => void;
}) {
  const state = useConnectionState();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const micOn = localParticipant.isMicrophoneEnabled;
  const connected = state === ConnectionState.Connected;
  const reconnecting =
    state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting;

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!connected) return;
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [connected]);

  const statusText = connected
    ? 'Connected. You can speak with the resident and operator.'
    : reconnecting
    ? 'Reconnecting…'
    : 'Connecting…';

  const mapsHref = coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
    : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      <header className="px-5 pb-2 pt-8 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-300">
          Live call · Emergency #{emergencyId}
        </p>
        <p className="mt-1 font-mono text-sm text-slate-300">{formatElapsed(elapsed)}</p>
      </header>

      <div className="flex justify-center gap-6 pt-10">
        {participants.map((p) => {
          const role = p.identity.split('-')[0] || 'Guest';
          return (
            <div key={p.identity} className="flex flex-col items-center gap-3">
              <div
                className={`relative flex h-20 w-20 items-center justify-center rounded-full text-sm font-extrabold ${
                  p.isLocal ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                {role.slice(0, 3)}
                {p.isSpeaking && (
                  <span className="absolute -inset-1.5 rounded-full border-2 border-emerald-400" />
                )}
              </div>
              <span className="text-xs font-semibold text-slate-300">
                {p.isLocal ? 'You' : role}
              </span>
            </div>
          );
        })}
      </div>

      <p className="px-6 pt-10 text-center text-sm text-slate-300">{statusText}</p>

      <div className="mt-auto grid grid-cols-3 justify-items-center gap-4 px-6 pb-10 pt-10">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => localParticipant.setMicrophoneEnabled(!micOn)}
            aria-pressed={!micOn}
            className={`flex h-16 w-16 items-center justify-center rounded-full text-xs font-bold ${
              micOn ? 'bg-slate-700 text-white' : 'bg-white text-slate-900'
            }`}
          >
            {micOn ? 'Mute' : 'Unmute'}
          </button>
          <span className="text-[11px] text-slate-300">{micOn ? 'Mic on' : 'Mic off'}</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          {mapsHref ? (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white"
            >
              Map
            </a>
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-500">
              Map
            </span>
          )}
          <span className="text-[11px] text-slate-300">Navigate</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onLeave}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white"
          >
            End
          </button>
          <span className="text-[11px] text-slate-300">Leave call</span>
        </div>
      </div>
    </div>
  );
}