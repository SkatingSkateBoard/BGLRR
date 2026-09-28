"use client";

import React, { use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  LiveKitRoom, 
  AudioConference, 
  RoomAudioRenderer,
  useParticipants
} from "@livekit/components-react";
import "@livekit/components-styles";

interface PageProps {

  params: Promise<{ roomId: string }>; 
}

export default function OperatorCallPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const unwrappedParams = use(params);
  const roomId = unwrappedParams.roomId;
  
  const token = searchParams.get("token");
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="text-red-500 font-semibold">Error: Operator authorization token is missing.</p>
      </div>
    );
  }

  return (
    <main className="flex h-screen w-screen flex-col bg-zinc-950 text-white">
      <LiveKitRoom
        video={false}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        data-lk-theme="default"
        connectOptions={{ autoSubscribe: true }}
        className="flex flex-1 flex-col items-center justify-center p-6"
        onDisconnected={() => {
          router.push("/operator/dashboard");
        }}
      >
        {/* Dynamic call information interface container */}
        <OperatorCallInterface roomId={roomId} />
        
        {/* Renders and binds the incoming hardware speakers audio track channels */}
        <RoomAudioRenderer />
      </LiveKitRoom>
    </main>
  );
}

function OperatorCallInterface({ roomId }: { roomId: string }) {
  const participants = useParticipants();
  const router = useRouter();

  // Scans room roster to see if a participant identity starting with 'Resident-' is active
  const isResidentConnected = participants.some((p) => 
    p.identity.startsWith("Resident-")
  );

  return (
    <div className="flex flex-col items-center gap-6 max-w-md w-full text-center">
      {/* Active Audio Channel Transmission Visualizer */}
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inline-flex h-full w-full rounded-full opacity-75 bg-green-500 animate-pulse"></span>
        <div className="relative rounded-full h-16 w-16 flex items-center justify-center text-2xl font-bold bg-green-600">
          🎙️
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Active Emergency Feed</h1>
        <p className="text-xs font-mono text-zinc-500 mt-1">Room: {roomId}</p>
        <p className="text-sm text-zinc-400 mt-2">
          {isResidentConnected 
            ? "Resident is online. Communication link stable." 
            : "Waiting for Resident audio stream to negotiate connection..."}
        </p>
      </div>

      {/* Renders basic active audio track states and toggle mute layouts */}
      <div className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <AudioConference />
      </div>

      {/* Disconnect Control UI */}
      <button 
        onClick={() => router.push("/operator/dashboard")}
        className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-xl transition-colors shadow-lg text-sm font-semibold"
      >
        Terminate Session / Return to Board
      </button>
    </div>
  );
}
