"use server";

import { createClient } from "@/utils/supabase/server";
import { AccessToken } from "livekit-server-sdk";

type Operator = {
  id: number;
  user_id: string;
  username: string;
}

export async function acceptEmergencyRequest(requestId: number) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Operator is not authenticated." };
    }

    const { data: operatorData, error: operatorError } = await supabase
      .from("tbl_operator")
      .select("id, user_id, username")
      .eq("user_id", user.id)
      .single();
    
    if (operatorError || !operatorData) {
      return { success: false, error: "Failed to locate operator record." };
    }
    
    const operator = operatorData as Operator;

    const { data: updatedRows, error: updateError } = await supabase
      .from("tbl_emergency_req")
      .update({ status: "active", operator_id: operator.id })
      .eq("id", requestId)
      .eq("status", "pending")
      .select();

    if (updateError) {
      return { success: false, error: `Database transaction failed: ${updateError.message}` };
    }

    if (!updatedRows || updatedRows.length === 0) {
      return { success: false, error: "This emergency request has already been claimed by another operator." };
    }

    // Establish room identifiers
    const roomName = `emergency-${requestId}`;
    const participantName = `Operator-${operator.username}`; 

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return { success: false, error: "LiveKit configuration credentials are missing on the Cloudflare dashboard." };
    }
    const at = new AccessToken(apiKey, apiSecret, { identity: participantName, ttl: "1h" });
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
      error: null
    };

  } catch (globalError: any) {
    console.error("Operator Accept Action Fatal Crash:", globalError);
    return {
      success: false,
      error: `Server Crash: ${globalError?.message || "Unknown error context."}`
    };
  }
}
