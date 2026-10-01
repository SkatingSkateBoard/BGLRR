import { NextResponse } from "next/server";
import { AccessToken, LiveKitAPI } from "livekit-server-sdk";

// Force this endpoint to use the edge runtime where nodejs_compat handles things cleanly
export const runtime = "edge"; 

export async function POST(request: Request) {
  try {
    const { actionType, requestId, identity, category } = await request.json();

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const lkUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !lkUrl) {
      return NextResponse.json({ error: "LiveKit config missing" }, { status: 500 });
    }

    const roomName = `emergency-${requestId}`;

    // 1. If it's a Resident creating an emergency, create the room first via LiveKitAPI
    if (actionType === "CREATE_ROOM") {
      const api = new LiveKitAPI({
        host: lkUrl,
        apiKey: apiKey,
        secret: apiSecret
        });
      try {
        await api.room.createRoom({
          name: roomName,
          emptyTimeout: 20 * 60, 
          maxParticipants: 2  
        });
      } catch (err) {
        // Room might already exist, safe to ignore
        console.log("Room already created or active.");
      }
    }

    // 2. Generate the Access Token for either Resident or Operator
    const at = new AccessToken(apiKey, apiSecret, { 
      identity: identity,
      ttl: "1h"
    });

    at.addGrant({ 
      roomJoin: true, 
      room: roomName, 
      canPublish: true, 
      canSubscribe: true 
    });

    const token = await at.toJwt();

    return NextResponse.json({
      success: true,
      roomId: roomName,
      livekitToken: token,
    });

  } catch (error: any) {
    console.error("LiveKit API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
