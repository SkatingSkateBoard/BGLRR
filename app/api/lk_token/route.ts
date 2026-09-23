import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const roomName =
    url.searchParams.get("room") || "test-room";

  const identity =
    url.searchParams.get("identity") ||
    `user-${crypto.randomUUID()}`;

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    return NextResponse.json(
      { error: "LiveKit environment variables are missing" },
      { status: 500 }
    );
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    ttl: "1h",
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  return NextResponse.json({
    token: await token.toJwt(),
    url: livekitUrl,
    roomName,
    identity,
  });
}
