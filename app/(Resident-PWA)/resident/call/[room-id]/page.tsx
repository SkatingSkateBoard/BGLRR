"use client";

import React, { use, useState, useEffect } from "react"; 
import { useSearchParams, useRouter } from "next/navigation";
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant,
  useRoomContext
} from "@livekit/components-react";

interface PageProps {
  params: Promise<{ roomId: string }>; 
}

export default function CallPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const unwrappedParams = use(params);
  const roomId = unwrappedParams.roomId;
  
  const token = searchParams.get("token");
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white p-4 text-center">
        <div className="max-w-sm p-6 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-red-400 font-medium">Error: No access token provided.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="h-screen bg-zinc-950 text-white font-sans antialiased overflow-hidden select-none">
      <LiveKitRoom
        video={false}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        connectOptions={{ autoSubscribe: true }}
      >
        <CallInterface roomId={roomId} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </main>
  );
}

function CallInterface({ roomId }: { roomId: string }) {
  const router = useRouter();
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  
  const [isMuted, setIsMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [hadOperator, setHadOperator] = useState(false);

  // Call duration counter
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
    if (localParticipant) {
      const enabled = localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(!enabled);
      setIsMuted(!enabled);
    }
  };

  const handleDisconnect = () => {
    if (room) {
      room.disconnect();
    }
    router.push("/"); 
  };

  return (
    <div className="flex flex-col h-full justify-between pb-12 pt-4 px-6 max-w-md mx-auto relative">
      {/* Top Navigation Row */}
      <header className="flex justify-between items-center w-full text-zinc-400">
        <button className="p-2 hover:bg-zinc-900 rounded-full transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <button className="p-2 hover:bg-zinc-900 rounded-full transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </button>
      </header>

      {/* Primary Calling State Viewport */}
      <div className="flex flex-col items-center text-center justify-center flex-1 my-auto">
        <div className="relative mb-8 flex items-center justify-center">
          {isOperatorPresent && (
            <div className="absolute inset-0 bg-emerald-500/10 rounded-full w-40 h-40 animate-ping duration-1000" />
          )}
          <div className={`w-36 h-36 rounded-full bg-zinc-900 border flex items-center justify-center transition-colors duration-500 ${isOperatorPresent ? "border-emerald-500/30" : "border-amber-500/30"}`}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={isOperatorPresent ? "text-emerald-400" : "text-amber-400 animate-pulse"}>
              <path d="M3 14c0-4.97 4.03-9 9-9s9 4.03 9 9" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="2" y="13" width="4" height="6" rx="1" fill="currentColor"/>
              <rect x="18" y="13" width="4" height="6" rx="1" fill="currentColor"/>
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white transition-all duration-300">
          {isOperatorPresent ? "Connected to Operator" : "Emergency Dispatched"}
        </h1>
        
        <p className="text-sm font-mono text-zinc-500 mt-1 uppercase tracking-widest">
          Line ID: {roomId}
        </p>

        <p className="text-zinc-400 text-sm max-w-xs mt-4 min-h-[40px] leading-relaxed">
          {isOperatorPresent 
            ? "An operator is online. Please speak clearly into your device." 
            : "Line open. Waiting for an operator. Do not hang up."}
        </p>

        <div className="mt-6 text-xl font-semibold font-mono text-zinc-300 tracking-wider">
          {formatTime(time)}
        </div>
      </div>

      {/* Control Actions Row */}
      <div className="flex items-center justify-center gap-10 w-full mt-auto">
        <button 
          onClick={toggleMute}
          className={`w-16 h-16 rounded-full flex items-center justify-center border transition-all ${
            isMuted 
              ? "bg-zinc-800 border-zinc-700 text-zinc-400" 
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
          }`}
        >
          {isMuted ? (
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
          className="w-16 h-16 rounded-full bg-rose-600 border border-rose-500 text-white flex items-center justify-center hover:bg-rose-500 transition-all shadow-lg shadow-rose-950/40 hover:scale-105 active:scale-95"
        >
          <svg className="w-6 h-6 rotate-[135deg]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21.5a18.25 18.25 0 0018.25-18.25V3.75A1.5 1.5 0 0019 2.25h-2.25a1.5 1.5 0 00-1.42 1.06l-1.03 3.09a1.5 1.5 0 00.38 1.56l1.55 1.55a15.6 15.6 0 01-5.15 5.15l-1.55-1.55a1.5 1.5 0 00-1.56-.38L4.31 14.16a1.5 1.5 0 00-1.06 1.42V19A1.5 1.5 0 004.75 21.5h-.5Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
