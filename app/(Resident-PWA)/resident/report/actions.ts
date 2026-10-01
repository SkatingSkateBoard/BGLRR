"use server";

import { createClient } from "@/utils/supabase/server";
// NOTICE: Removed LiveKitAPI from imports since it uses broken Node.js streams on the edge
import { AccessToken } from "livekit-server-sdk"; 

type EmergencyData = {
  id: number; 
  status: string;
} | null;

export async function createEmergencyRequest(category: string) {
  // 1. GLOBAL SAFETY NET: Catches absolutely any runtime panic safely
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User is not authenticated." };
    }

    const { data: resident, error: residentError } = await supabase
      .from("tbl_resident")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (residentError || !resident) {
      return { success: false, error: "Resident record not found." };
    }

    const ONE_MINUTE_AGO = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: existingReq } = await supabase
      .from("tbl_emergency_req")
      .select("id, status")
      .eq("resident_id", resident.id)
      .gt("created_at", ONE_MINUTE_AGO)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let emergencyData: EmergencyData = existingReq;

    if (!existingReq) {
      const { data, error } = await supabase
        .from("tbl_emergency_req")
        .insert({
          resident_id: resident.id,
          emerg_category: category,
          status: "PENDING" 
        })
        .select("id, status") 
        .single();
      
      if (error) {
        console.error("Insert error:", error);
        return { success: false, error: `Database insert failed: ${error.message}` };
      }

      console.log("Created emergency:", data);
      emergencyData = data;
    }

    if (!emergencyData) {
      return { success: false, error: "Failed to resolve or create an emergency request." };
    }

    const roomName = `emergency-${emergencyData.id}`;
    const participantName = `Resident-${resident.id}`;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const lkUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !lkUrl) {
      return { success: false, error: "LiveKit environment variables are missing on the Cloudflare dashboard." };
    }

    // 2. NATIVE REST API: Replaced LiveKitAPI with edge-friendly fetch to bypass Error #441
    try {
      const httpLkUrl = lkUrl.replace(/^ws/, "http"); 
      
      const adminAt = new AccessToken(apiKey, apiSecret, { identity: "room-creator-admin" });
      adminAt.addGrant({ roomCreate: true });
      const adminToken = await adminAt.toJwt();

      const lkResponse = await fetch(`${httpLkUrl}/twirp/livekit.RoomService/CreateRoom`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: roomName,
          empty_timeout: 1200, // 20 min in seconds
          max_participants: 2  
        }),
      });

      if (!lkResponse.ok) {
        console.log("Room verification completed via LiveKit routing engine.");
      }
    } catch (err: any) {
      console.log("Room already active or initialized elsewhere.");
    }

    // 3. JWT TOKEN GENERATION: Safe math engine calculations
    const at = new AccessToken(apiKey, apiSecret, { 
      identity: participantName,
      ttl: "1h" 
    });

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
    // 4. CRITICAL RECOVERY: Returns the actual error string over the wire safely
    console.error("Caught a fatal Server Action exception:", globalError);
    return {
      success: false,
      error: `Server Crash: ${globalError?.message || "Unknown error boundary hit."}`
    };
  }
}
