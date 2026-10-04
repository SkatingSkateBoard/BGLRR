"use client";

import React, { use, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LiveKitRoom, RoomAudioRenderer, useParticipants, useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { createClient } from "@/utils/supabase/client"; 
import styles from "./page.module.css";

/*---------------------------------------------------------------------------------------------------------------------------------------------------*/

/* Placeholder for the Live Location Tracking map. Swap the inside of this
   component for the real map later; the wrapper keeps the sizing. */

function MapPlaceholder() {
  return (
    <div
      role="img"
      aria-label="Live location tracking map placeholder"
      className={`${styles.mapPlaceholder} my-4 flex min-h-44 flex-1 flex-col items-center justify-center rounded-2xl p-4 text-center`}
    >
      <svg aria-hidden="true" className={`${styles.mapPin} mb-2 h-8 w-8`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
      <p className={`${styles.mapTitle} text-sm font-semibold`}>Live Location Tracking</p>
      <p className={`${styles.mapSub} mt-1 text-xs`}>Map placeholder. Resident location will appear here.</p>
    </div>
  );
}

/*---------------------------------------------------------------------------------------------------------------------------------------------------*/

export default function OperatorCallPage({ params }: { params: Promise<{ "room-id": string }> }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { "room-id": roomId } = use(params);
  const token = searchParams.get("token");
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";

  if (!token) {
    return (
      <div className={`${styles.authError} flex h-screen items-center justify-center p-4`}>
        <div className={`${styles.authPanel} max-w-md p-6 rounded-2xl text-center`}>
          <p className={`${styles.authTitle} font-semibold tracking-wide uppercase text-xs mb-2`}>Authorization Error</p>
          <p className={`${styles.authText} text-sm`}>Operator credentials token is missing or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <main className={`${styles.page} min-h-screen font-sans antialiased`}>
      <LiveKitRoom
        video={false}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        connectOptions={{ autoSubscribe: true }}
        onDisconnected={() => router.push("/operator/dashboard")}
      >
        <OperatorCallInterface roomId={roomId} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </main>
  );
}

function OperatorCallInterface({ roomId }: { roomId: string }) {
  const participants = useParticipants();
  const room = useRoomContext();
  const router = useRouter();
  const supabase = createClient();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [time, setTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTime((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const isMuted = !isMicrophoneEnabled; 

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const isResidentConnected = participants.some((p) => p.identity?.startsWith("Resident-"));

  const participantNames = participants
    .map((p) => (p.identity?.startsWith("Resident-") ? `Resident ${p.identity.split("-")[1]}` : p.identity))
    .join(", ");

  const toggleMute = async () => {
    await localParticipant.setMicrophoneEnabled(isMuted);
  };

  const handleTerminate = () => {
    room?.disconnect();
    router.push("/operator/dashboard"); 
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out? This will disconnect the active call feed.");
    if (!confirmLogout) return;

    try {
      room?.disconnect();
      await supabase.auth.signOut();
      router.push("/operator/dashboard"); 
    } catch (error) {
      console.error("Sign out process experienced a fault:", error);
    }
  };
  return (
    /* min-h-screen instead of h-screen so the taller Session Info card can grow the page instead of overflowing */
    <div className={`${styles.frame} flex flex-col min-h-screen max-w-5xl mx-auto p-6 md:p-10 justify-between`}>
      {/* Header */}
      <header className={`${styles.header} flex justify-between items-center w-full`}>
        <div className="flex items-center gap-3">
          <div className={`${styles.alertBadge} p-2 rounded-xl`}>
            <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
          </div>
          <div>
            <h1 className={`${styles.title} text-xl font-bold tracking-tight`}>Emergency Response Panel</h1>
            <p className={`${styles.channel} text-xs font-mono`}>CHANNEL // {roomId}</p>
          </div>
        </div>
        
        {/* Right Header Action Area */}
        <div className="flex items-center gap-4">
          <div className={`${styles.status} flex items-center gap-4 px-4 py-2 rounded-xl`}>
            <div className={`${styles.dot} ${isResidentConnected ? styles.dotLive : styles.dotIdle} w-2 h-2 rounded-full ${isResidentConnected ? "animate-pulse" : ""}`} />
            <span className={`${styles.statusText} text-sm font-medium`}>{isResidentConnected ? "Feed Active" : "Line Standby"}</span>
            <span className={styles.sep}>|</span>
            <span className={`${styles.time} text-sm font-mono`}>{formatTime(time)}</span>
          </div>

          {/* Secure Session Sign Out Trigger Button */}
          <button 
            onClick={handleLogout}
            title="Disconnect Stream and Sign Out"
            className="flex items-center justify-center p-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors duration-150 cursor-pointer shadow-xs"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main blocks: two equal columns, both cards stretch to the same height */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto items-stretch w-full py-8">
        {/* Session info */}
        <div className={`${styles.sessionCard} rounded-2xl flex flex-col justify-between`}>
          <div className="space-y-3">
            <span className={`${styles.sectionLabel} text-xs font-semibold uppercase tracking-wider block`}>Session Info</span>
            <div>
              <p className={`${styles.fieldLabel} text-xs`}>Incident Feed Room</p>
              <p className={`${styles.fieldValue} text-base font-medium font-mono`}>{roomId}</p>
            </div>
            <div>
              <p className={`${styles.fieldLabel} text-xs`}>Connection Link</p>
              <p className={`${styles.fieldValue} text-sm truncate`}>LiveKit Routing Stream</p>
            </div>
          </div>

          <MapPlaceholder />

          <div className={`${styles.sessionDivider} pt-4`}>
            <p className={`${styles.fieldLabel} text-xs mb-2`}>Live Participants ({participants.length})</p>
            <div className="flex items-center gap-2 text-sm">
              <svg className={`${styles.mutedIcon} w-4 h-4`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
              <span className={`${styles.participants} truncate text-xs font-mono`}>{participantNames || "Connecting..."}</span>
            </div>
          </div>
        </div>

        {/* Live status viewport */}
        <div className={`${styles.viewport} rounded-2xl p-6 flex flex-col items-center justify-center min-h-60 relative overflow-hidden`}>
          <div className="mb-4">
            <svg className={`${isResidentConnected ? styles.signalLive : styles.signalIdle} w-10 h-10 ${isResidentConnected ? "animate-bounce" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 0 1 0-5.303m5.304 0a3.75 3.75 0 0 1 0 5.303m-7.425 2.122a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Z" /></svg>
          </div>
          <p className={`${styles.viewportTitle} text-lg font-medium text-center`}>
            {isResidentConnected ? "Incoming Resident Audio Secure" : "Awaiting Resident Stream"}
          </p>
          <p className={`${styles.viewportSub} text-sm text-center mt-1 max-w-sm`}>
            {isResidentConnected
              ? "All channels open. Audio monitoring is securely active."
              : "System open. Waiting for client configuration dispatch signature handshake."}
          </p>
          {isResidentConnected && (
            <div className="flex items-center gap-1 h-8 mt-6">
              {[0.4, 0.8, 0.5, 0.9, 0.3, 0.7, 0.4, 0.8, 0.6].map((op, i) => (
                <div key={i} style={{ animationDelay: `${i * 120}ms`, opacity: op }} className={`${styles.bar} w-1 rounded-full h-full animate-pulse`} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <footer className={`${styles.controls} flex justify-center gap-4 pt-4 border-t w-full`}>
        <button
          onClick={toggleMute}
          aria-pressed={isMuted}
          className={`${styles.controlButton} ${isMuted ? styles.muted : ""} flex items-center gap-2 px-6 py-3 rounded-xl border text-sm font-medium`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {isMuted ? (
              <path d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
            ) : (
              <path d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
            )}
          </svg>
          {isMuted ? "Unmute Mic" : "Mute Mic"}
        </button>
        <button
          onClick={handleTerminate}
          className={`${styles.controlButton} ${styles.disconnect} flex items-center gap-2 px-6 py-3 rounded-xl border text-sm font-medium`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9v6m-4.5-6v6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
          Disconnect Call
        </button>
      </footer>
    </div>
  );
}
