"use server";

import { createClient } from "@/utils/supabase/server";
import { AccessToken } from "livekit-server-sdk";

type Operator = {
  id: number;
  user_id: string;
  username: string;
}


export async function acceptEmergencyRequest(requestId: number) {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Operator is not authenticated.");
  //fetch operator
  const {data: operatorData, error: operatorError} = await supabase.from("tbl_operator").select("id, user_id").eq("user_id", user.id).single();
  
  if (operatorError) throw new Error("Failed to get the following operator.");
  
  const operator = operatorData as Operator;

  const { data: updatedRows, error: updateError } = await supabase.from("tbl_emergency_req").update({ status: "ACTIVE", operator_id: operator.id }).eq("id", requestId).eq("status", "PENDING").select();

  if (!updatedRows || updatedRows.length === 0) {
    throw new Error("This emergency request has already been claimed by another operator.");
  }

  
  if (updateError) throw new Error("Failed to claim emergency request.");


  const roomName = `emergency-${requestId}`;
  const participantName = `${operator.username}`;

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