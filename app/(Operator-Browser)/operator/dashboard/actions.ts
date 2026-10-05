"use server";

import { createClient } from "@/utils/supabase/server";
import { AccessToken } from "livekit-server-sdk";

// TypeScript definitions matching your relational tables
type Operator = {
  id: number;
  user_id: string;
  username: string;
}

interface EmergencyRequestUpdateResponse {
  id: number;
  status: string;
  operator_id: number | null;
  created_at: string;
  category?: string;
  resident: {
    first_name: string;
    last_name: string;
  } | null;
}

/**
 * Validates operator authentication, claims a pending emergency request,
 * and generates a secure LiveKit JWT token for communication.
 */
export async function acceptEmergencyRequest(requestId: number) {
  try {
    const supabase = await createClient();

    // 1. Verify that the current operator session is fully authenticated
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
      return { success: false, error: "Failed to locate operator record within the tracking ledger." };
    }
    
    const operator = operatorData as Operator;

    // 3. Perform atomic state transaction updates on the designated ticket row
    const { data: updatedRows, error: updateError } = await supabase
      .from("tbl_emergency_req")
      .update({ status: "active", operator_id: operator.id })
      .eq("id", requestId)
      .eq("status", "pending")
      .select("id, created_at, status, category, resident:tbl_resident(first_name, last_name)"); // Matches front-end query targets

    if (updateError) {
      return { success: false, error: `Database transaction failed: ${updateError.message}` };
    }

    // Concurrency protection: handles situations where multiple operators press 'Accept' simultaneously
    if (!updatedRows || updatedRows.length === 0) {
      return { success: false, error: "This emergency request has already been claimed by another operator." };
    }

    const tickets = updatedRows as unknown as EmergencyRequestUpdateResponse[];
    const claimedTicket = tickets[0];

    // 4. Generate unique identification variables for the incoming LiveKit room session
    const roomName = `emergency-${requestId}`;
    const participantName = `Operator-${operator.username}`; 

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return { success: false, error: "LiveKit configuration credentials are missing on the host dashboard deployment variables." };
    }

    // 5. Construct token authentication access grants valid for a 1-hour interval
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
      updatedTicket: claimedTicket,
      error: null
    };

  } catch (globalError: any) {
    console.error("Operator Accept Action Fatal Crash:", globalError);
    return {
      success: false,
      error: `Server Crash: ${globalError?.message || "Unknown error context during session negotiation."}`
    };
  }
}
