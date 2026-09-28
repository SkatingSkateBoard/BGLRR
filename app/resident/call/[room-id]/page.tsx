"use client";

import React, { use } from "react"; 
import { useSearchParams } from "next/navigation";
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

export default function CallPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  

  const unwrappedParams = use(params);
  const roomId = unwrappedParams.roomId;
  
  const token = searchParams.get("token");
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="text-red-500 font-semibold">Error: No access token provided.</p>
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
      >

        <CallInterface roomId={roomId} />

        <RoomAudioRenderer />
      </LiveKitRoom>
    </main>
  );
}

function CallInterface({ roomId }: { roomId: string }) {
  const participants = useParticipants();
  
  const isOperatorPresent = participants.some((p) => 
    p.identity.startsWith("Operator-")
  );

  return (
    <div className="flex flex-col items-center gap-6 max-w-md text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isOperatorPresent ? 'bg-green-500 animate-pulse' : 'bg-red-500 animate-ping'}`}></span>
        <div className={`relative rounded-full h-16 w-16 flex items-center justify-center text-2xl font-bold ${isOperatorPresent ? 'bg-green-600' : 'bg-red-600'}`}>
          
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isOperatorPresent ? "Connected to Operator" : "Emergency Dispatched"}
        </h1>
       
        <p className="text-xs font-mono text-zinc-600 mt-1">Line ID: {roomId}</p>
        
        <p className="text-sm text-zinc-400 mt-2">
          {isOperatorPresent 
            ? "An operator is online. Please speak clearly into your device." 
            : "Line open. Holding for the next available dispatcher. Do not hang up."}
        </p>
      </div>

      <div className="mt-4 w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <AudioConference />
      </div>
    </div>
  );
}
