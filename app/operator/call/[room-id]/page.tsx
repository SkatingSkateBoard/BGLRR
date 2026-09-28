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
      <div>
        <p>Error: Operator authorization token is missing.</p>
      </div>
    );
  }

  return (
    <main>
      <LiveKitRoom
        video={false}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        data-lk-theme="default"
        connectOptions={{ autoSubscribe: true }}
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

//Operator screen
function OperatorCallInterface({ roomId }: { roomId: string }) {
  const participants = useParticipants();
  const router = useRouter();

  const isResidentConnected = participants.some((p) => 
    p.identity.startsWith("Resident-")
  );

  return (
    <div>

      <div>
        <h1>Active Emergency Feed</h1>
        <p>Room: {roomId}</p>
        <p className="text-sm text-zinc-400 mt-2"> {isResidentConnected ? "You are in a call." 
            : "Waiting for resident "}
        </p>
      </div>

     
      <div className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <AudioConference />
      </div>

      {/* Disconnect Control UI */}
      <button 
        onClick={() => router.push("/operator/dashboard")}
      
      >
        Terminate Session / Return to Board
      </button>
    </div>
  );
}
