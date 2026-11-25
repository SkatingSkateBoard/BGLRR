"use client";

import React, { use, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { useKrispNoiseFilter } from "@livekit/components-react/krisp";
import { createClient } from "@/utils/supabase/client";
import { Track } from 'livekit-client';
import { usePreviewMode } from "@/lib/usePreviewMode";

/* Raised skeuomorphic surfaces, same language as the dashboard tiles */
const GOLD_DISC =
  "bg-linear-to-b from-[#f2bd3d] to-[#c98a0e] shadow-[0_8px_16px_rgba(201,138,14,0.35),inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-3px_0_rgba(0,0,0,0.12)]";
const GREEN_DISC =
  "bg-linear-to-b from-[#3cc9a5] to-[#16906f] shadow-[0_8px_16px_rgba(22,144,111,0.35),inset_0_2px_0_rgba(255,255,255,0.4),inset_0_-3px_0_rgba(0,0,0,0.12)]";
const GREEN_BTN =
  "bg-linear-to-b from-[#3cc9a5] to-[#16906f] shadow-[0_6px_12px_rgba(22,144,111,0.35),inset_0_2px_0_rgba(255,255,255,0.4),inset_0_-3px_0_rgba(0,0,0,0.12)]";
const SLATE_BTN =
  "bg-linear-to-b from-slate-400 to-slate-600 shadow-[0_6px_12px_rgba(71,85,105,0.3),inset_0_2px_0_rgba(255,255,255,0.35),inset_0_-3px_0_rgba(0,0,0,0.15)]";
const RED_BTN =
  "bg-linear-to-b from-[#ef5b5b] to-[#b72424] shadow-[0_6px_12px_rgba(183,36,36,0.35),inset_0_2px_0_rgba(255,255,255,0.4),inset_0_-3px_0_rgba(0,0,0,0.15)]";

interface PageProps {
  params: Promise<{ "room-id": string }>;
}

export default function CallPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const unwrappedParams = use(params);
  const roomId = unwrappedParams["room-id"];
  
  const token = searchParams.get("token");
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";
  const router = useRouter();
  const supabase = createClient();
  const previewMode =
    usePreviewMode() ||
    (process.env.NODE_ENV !== "production" && searchParams.get("preview") === "1");

  //ping watchposition
 const lastPingTimeRef = useRef<number>(0);
const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

useEffect(() => {
  const isPreviewRequest =
    process.env.NODE_ENV !== "production" &&
    (previewMode ||
      document.cookie.split("; ").includes("bglrr_preview=1") ||
      new URLSearchParams(window.location.search).get("preview") === "1");
  if (isPreviewRequest || !token || !("geolocation" in navigator)) return;

  const PING_INTERVAL_MS = 5000;
  // Extract numeric ID from "emergency-42" -> 42
  const numericEmergencyId = Number(roomId.replace("emergency-", ""));
  if (Number.isNaN(numericEmergencyId)) return;

  const watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const now = Date.now();

      if (now - lastPingTimeRef.current < PING_INTERVAL_MS) {
        return;
      }

      const { latitude, longitude } = position.coords;

      // Skip DB update if resident hasn't moved at least ~5 meters
      const prev = lastCoordsRef.current;
      if (
        prev &&
        Math.abs(latitude - prev.lat) < 0.00005 &&
        Math.abs(longitude - prev.lng) < 0.00005
      ) {
        console.log("GPS ping skipped (stationary)");
        return;
      }

      lastPingTimeRef.current = now;
      lastCoordsRef.current = { lat: latitude, lng: longitude };

      const { error } = await supabase
        .from("tbl_emergency_req")
        .update({
          current_latitude: latitude,
          current_longitude: longitude,
          updated_at: new Date().toISOString(),
        })
        .eq("id", numericEmergencyId);

      if (error) {
        console.error("Failed to update emergency location:", error.message);
      }

      console.log(`Updated location to (${latitude}, ${longitude}) for emergency ID ${numericEmergencyId}`);
    },
    (error) => {
      console.error("GPS watch error:", error.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );

  // Stop watching GPS as soon as the call ends or user leaves the page
  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}, [token, roomId, previewMode]); // Removed `supabase` so watchPosition doesn't reset on re-renders

  

  if (previewMode) {
    return (
      <main className={`h-dvh bg-white font-sans antialiased overflow-hidden select-none`}>
        <LiveKitRoom
          video={false}
          audio={false}
          token="preview"
          serverUrl={serverUrl}
          connect={false}
        >
          <CallInterface roomId={roomId} previewMode />
        </LiveKitRoom>
      </main>
    );
  }

  if (!token) {
    return (
      <div className={`flex h-dvh items-center justify-center bg-white p-4 text-center`}>
        <div className={`max-w-sm p-6 rounded-2xl border border-red-100 bg-linear-to-b from-red-50 to-white shadow-[0_10px_24px_rgba(183,36,36,0.15)]`}>
          <p className="text-red-700 font-bold">Error: No access token provided.</p>
        </div>
      </div>
    );
  }

  return (
    <main className={`h-dvh bg-white font-sans antialiased overflow-hidden select-none`}>
      <LiveKitRoom
        video={false}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        connectOptions={{ autoSubscribe: true }}
        onDisconnected={() => {
          router.push("/resident/dashboard"); 
        }}
      >
        <CallInterface roomId={roomId} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </main>
  );
}

function CallInterface({ roomId, previewMode = false }: { roomId: string; previewMode?: boolean }) {
  const router = useRouter();
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  
  const [isMuted, setIsMuted] = useState(false);
  const [previewMuted, setPreviewMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [hadOperator, setHadOperator] = useState(false);

  const micTrack = localParticipant?.getTrackPublication(Track.Source.Microphone);
  const { isNoiseFilterEnabled, setNoiseFilterEnabled, isNoiseFilterPending } = useKrispNoiseFilter();

  useEffect(() => {
    if (micTrack && !isNoiseFilterEnabled && !isNoiseFilterPending) {
      setNoiseFilterEnabled(true).catch((err) => {
        console.warn('Krisp failed to load:', err);
      });
    }
  }, [micTrack, isNoiseFilterEnabled, isNoiseFilterPending, setNoiseFilterEnabled]);

  useEffect(() => {
    const timer = setInterval(() => setTime((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isOperatorPresent = participants.some((p) => 
    p.identity.startsWith("Operator-")
  );
  const muted = previewMode ? previewMuted : isMuted;

  // Track if an operator was connected, and automatically hang up if they leave
  useEffect(() => {
    if (isOperatorPresent) {
      setHadOperator(true);
    } else if (hadOperator && !isOperatorPresent) {
      // Operator was here but has now disconnected/terminated the feed
      if (room) {
        room.disconnect();
      }
      router.push("/"); // Redirect back to a safe home or landing state
    }
  }, [isOperatorPresent, hadOperator, room, router]);

  const toggleMute = async () => {
    if (previewMode) {
      setPreviewMuted((muted) => !muted);
      return;
    }

    if (localParticipant) {
      const enabled = localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(!enabled);
      setIsMuted(!enabled);
    }
  };

  const handleDisconnect = () => {
    if (previewMode) {
      router.push("/resident/dashboard?preview=1");
      return;
    }

    if (room) {
      room.disconnect();
    }
    router.push("/"); 
  };

  return (
    <div className={`relative mx-auto flex h-dvh max-w-md flex-col px-6 pt-4 pb-12`}>
      {/* Top Navigation Row */}
      <header className={`flex justify-between items-center w-full text-slate-700`}>
        <button className="p-2 hover:bg-slate-100 rounded-full transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <button className="p-2 hover:bg-slate-100 rounded-full transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </button>
      </header>

      {/* Primary Calling State Viewport */}
      <div className="flex flex-col items-center text-center justify-center">
        <div className="relative mb-8 flex items-center justify-center">
          {isOperatorPresent && (
            <div className="absolute -inset-2 rounded-full bg-emerald-400/30 animate-ping duration-1000" />
          )}
          <div className={`w-36 h-36 rounded-full flex items-center justify-center transition-colors duration-500 ${isOperatorPresent ? GREEN_DISC : GOLD_DISC}`}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={isOperatorPresent ? "text-white" : "text-white animate-pulse"}>
              <path d="M3 14c0-4.97 4.03-9 9-9s9 4.03 9 9" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="2" y="13" width="4" height="6" rx="1" fill="currentColor"/>
              <rect x="18" y="13" width="4" height="6" rx="1" fill="currentColor"/>
            </svg>
          </div>
        </div>

        <h1 className={`text-2xl font-extrabold tracking-tight text-slate-900 transition-all duration-300`}>
          {isOperatorPresent ? "Connected to Operator" : "Emergency Dispatched"}
        </h1>
        
        <p className={`text-sm font-mono font-bold mt-1 uppercase tracking-widest text-slate-500`}>
          Line ID: {roomId}
        </p>

        <p className={`text-sm font-bold text-slate-700 max-w-xs mt-4 min-h-10 leading-relaxed`}>
          {isOperatorPresent 
            ? "An operator is online. Please speak clearly into your device." 
            : "Line open. Waiting for an operator. Do not hang up."}
        </p>

        <div className={`mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-2 text-xl font-bold font-mono tracking-wider shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)]`}>
          {formatTime(time)}
        </div>
      </div>

      {/* Krisp Noise Filter Status Indicator */}
      <div className="mt-3 flex items-center justify-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 text-xs font-medium tracking-wide transition-all">
        {isNoiseFilterEnabled ? (
          <>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-600 font-mono uppercase">Krisp Processing Active</span>
          </>
        ) : isNoiseFilterPending ? (
          <>
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-amber-600 font-mono uppercase">Initializing Krisp...</span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            <span className="text-slate-500 font-mono uppercase">Krisp Offline</span>
          </>
        )}
      </div>


      {/* Control Actions Row */}
      <div className="mt-auto flex w-full items-center justify-center gap-10">
        <button 
          onClick={toggleMute}
          aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          aria-pressed={muted}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition active:translate-y-0.5 ${muted ? SLATE_BTN : GREEN_BTN}`}
        >
          {muted ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.412 11.412A3 3 0 0 0 15 12V6.75a3 3 0 0 0-3-3M12 18.75a6 6 0 0 0 5.918-5m-1.785-3.375A5.967 5.967 0 0 1 12 11.25H9.75M12 18.75v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V9m15 12L3 3" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 0 3-3v-6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
            </svg>
          )}
        </button>

        <button 
          onClick={handleDisconnect}
          aria-label="End call"
          className={`${RED_BTN} w-16 h-16 rounded-full text-white flex items-center justify-center transition active:translate-y-0.5`}
        >
          <svg className="w-6 h-6 rotate-135" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21.5a18.25 18.25 0 0018.25-18.25V3.75A1.5 1.5 0 0019 2.25h-2.25a1.5 1.5 0 00-1.42 1.06l-1.03 3.09a1.5 1.5 0 00.38 1.56l1.55 1.55a15.6 15.6 0 01-5.15 5.15l-1.55-1.55a1.5 1.5 0 00-1.56-.38L4.31 14.16a1.5 1.5 0 00-1.06 1.42V19A1.5 1.5 0 004.75 21.5h-.5Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}