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
      <div>
        <p>Error: No access token provided.</p>
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
      >

        <CallInterface roomId={roomId} />

        <RoomAudioRenderer />
      </LiveKitRoom>
    </main>
  );
}


//Call comp Resident
function CallInterface({ roomId }: { roomId: string }) {
  const participants = useParticipants();
  
  const isOperatorPresent = participants.some((p) => 
    p.identity.startsWith("Operator-")
  );

  return (
    <div>
      <div>
        <h1>
          {isOperatorPresent ? "Connected to Operator" : "Emergency Dispatched"}
        </h1>
       
        <p>Line ID: {roomId}</p>
        
        <p>{isOperatorPresent ? "An operator is online. Please speak clearly into your device." : "Line open. Waiting for an operator. Do not hang up."} </p>
      </div>

      <div>
        <AudioConference />
      </div>
    </div>
  );
}
