"use client";

import React, { use, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LiveKitRoom, RoomAudioRenderer, useParticipants, useLocalParticipant, useRoomContext } from "@livekit/components-react";

export default function OperatorCallPage({ params }: { params: Promise<{ roomId: string }> }) {
  const searchParams = useSearchParams(), router = useRouter(), unwrappedParams = use(params);
  const roomId = unwrappedParams.roomId, token = searchParams.get("token"), serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";

  if (!token) return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-white p-4">
      <div className="max-w-md p-6 bg-zinc-900 border border-red-900/30 rounded-2xl text-center">
        <p className="text-red-400 font-semibold tracking-wide uppercase text-xs mb-2">Authorization Error</p>
        <p className="text-zinc-400 text-sm">Operator credentials token is missing or expired.</p>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-rose-500/30">
      <LiveKitRoom video={false} audio={true} token={token} serverUrl={serverUrl} connectOptions={{ autoSubscribe: true }} onDisconnected={() => router.push("/operator/dashboard")}>
        <OperatorCallInterface roomId={roomId} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </main>
  );
}

function OperatorCallInterface({ roomId }: { roomId: string }) {
  const participants = useParticipants(), room = useRoomContext(), { localParticipant } = useLocalParticipant(), router = useRouter();
  const [isMuted, setIsMuted] = useState(false), [time, setTime] = useState(0);

  useEffect(() => { const timer = setInterval(() => setTime((p) => p + 1), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (localParticipant) setIsMuted(!localParticipant.isMicrophoneEnabled); }, [localParticipant]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const isResidentConnected = participants.some((p) => p.identity?.startsWith("Resident-"));
  
  const toggleMute = async () => { if (localParticipant) { const e = localParticipant.isMicrophoneEnabled; await localParticipant.setMicrophoneEnabled(!e); setIsMuted(e); } };
  const handleTerminate = () => { room?.disconnect(); router.push("/operator/dashboard"); };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto p-6 md:p-10 justify-between">
      {/* Header Matrix */}
      <header className="flex justify-between items-center border-b border-zinc-900 pb-6 w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Emergency Response Panel</h1>
            <p className="text-xs text-zinc-500 font-mono">CHANNEL // {roomId}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-zinc-900/50 border border-zinc-800/80 px-4 py-2 rounded-xl">
          <div className={`w-2 h-2 rounded-full ${isResidentConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
          <span className="text-sm font-medium text-zinc-300">{isResidentConnected ? "Feed Active" : "Line Standby"}</span>
          <span className="text-zinc-600">|</span>
          <span className="text-sm font-mono text-zinc-400">{formatTime(time)}</span>
        </div>
      </header>

      {/* Main Structural Layout Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto items-stretch w-full py-8">
        {/* Connection Overview */}
        <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Session Info</span>
            <div><p className="text-xs text-zinc-400">Incident Feed Room</p><p className="text-base font-medium font-mono text-white">{roomId}</p></div>
            <div><p className="text-xs text-zinc-400">Connection Link</p><p className="text-sm text-zinc-300 truncate">LiveKit Routing Stream</p></div>
          </div>
          <div className="mt-6 pt-4 border-t border-zinc-900/60">
            <p className="text-xs text-zinc-400 mb-2">Live Participants ({participants.length})</p>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
              <span className="truncate text-xs font-mono text-zinc-400">{participants.map(p => p.identity?.split('-')[1] || p.identity).join(', ') || 'Connecting...'}</span>
            </div>
          </div>
        </div>

        {/* Live Status Viewport */}
        <div className="md:col-span-2 bg-zinc-900/20 border border-zinc-900 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[240px] relative overflow-hidden">
          <div className="mb-4">
            <svg className={`w-10 h-10 ${isResidentConnected ? "text-emerald-400 animate-bounce" : "text-zinc-600"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 0 1 0-5.303m5.304 0a3.75 3.75 0 0 1 0 5.303m-7.425 2.122a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Z" /></svg>
          </div>
          <p className="text-lg font-medium text-white text-center">{isResidentConnected ? "Incoming Resident Audio Secure" : "Awaiting Resident Stream"}</p>
          <p className="text-sm text-zinc-500 text-center mt-1 max-w-sm">{isResidentConnected ? "All channels open. Audio monitoring is securely active." : "System open. Waiting for client configuration dispatch signature handshake."}</p>
          {isResidentConnected && (
            <div className="flex items-center gap-1 h-8 mt-6">
              {[0.4, 0.8, 0.5, 0.9, 0.3, 0.7, 0.4, 0.8, 0.6].map((op, i) => <div key={i} style={{ animationDelay: `${i * 120}ms`, opacity: op }} className="w-1 bg-emerald-500 rounded-full h-full animate-pulse" />)}
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons Footer Block */}
      <footer className="flex justify-center gap-4 pt-4 border-t border-zinc-900/60 w-full">
        <button onClick={toggleMute} className={`flex items-center gap-2 px-6 py-3 rounded-xl border text-sm font-medium transition-all ${isMuted ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">{isMuted ? <path d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /> : <path d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />}</svg>
          {isMuted ? "Unmute Mic" : "Mute Mic"}
        </button>
        <button onClick={handleTerminate} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-all border border-red-500/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9v6m-4.5-6v6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
          Disconnect Call
        </button>
      </footer>
    </div>
  );
}