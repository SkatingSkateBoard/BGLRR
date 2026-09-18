import { NextResponse } from "next/server";
import {AccessToken } from "livekit-server-sdk";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const roomName = "Default"
  const identity = "Person"

  if (!roomName || !identity) {
    return NextResponse.json({ error: "Missing roomName or identity" }, { status: 400 });
  }

  // Create an access token for the LiveKit room
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: identity,
      ttl: "1h", // Token valid for 1 hour
    }
  );

  // Grant access to the specified room
  token.addGrant({
    roomJoin: true,
    room: roomName,
  });

  // Generate the JWT token
  const jwtToken = await token.toJwt();

  return NextResponse.json({ token: jwtToken });
}   