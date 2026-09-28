"use server";

import { createClient } from "@/utils/supabase/server";
import { AccessToken } from "livekit-server-sdk";

export async function acceptEmergencyRequest(requestId: number) {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Operator is not authenticated.");

  const { error: updateError } = await supabase
    .from("tbl_emergency_req")
    .update({ status: "ACTIVE" })
    .eq("id", requestId);

  if (updateError) throw new Error("Failed to claim emergency request.");

  const roomName = `emergency-${requestId}`;
  const participantName = `Operator-${user.id}`;

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit configuration is missing on the server.");
  }

  const at = new AccessToken(apiKey, apiSecret, { identity: participantName });
  at.addGrant({ 
    roomJoin: true, 
    room: roomName, 
    canPublish: true, 
    canSubscribe: true 
  });

  const token = await at.toJwt();

  return {
    success: true,
    roomId: roomName,
    livekitToken: token,
  };
}