"use server";

import { createClient } from "@/utils/supabase/server";
import { AccessToken, LiveKitAPI } from "livekit-server-sdk"; // Added missing import

type EmergencyData = {
  id: number; 
  status: string;
} | null;

export async function createEmergencyRequest(category: string) {
  const supabase = await createClient();


  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User is not authenticated.");
  }

 
  const { data: resident, error: residentError } = await supabase
    .from("tbl_resident")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (residentError || !resident) {
    throw new Error("Resident record not found.");
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
      throw new Error(error.message);
    }

    console.log("Created emergency:", data);
    emergencyData = data;
  }

  if (!emergencyData) {
    throw new Error("Failed to resolve or create an emergency request.");
  }

  const roomName = `emergency-${emergencyData.id}`;
  const participantName = `Resident-${resident.id}`;

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const lkUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !lkUrl) {
    throw new Error("LiveKit environment variables are missing on the server.");
  }

  const api = new LiveKitAPI();

  try {
     await api.room.createRoom({
      name: roomName,
      emptyTimeout: 20 * 60, //20 min,
      maxParticipants: 2  // 2 only
    })
  } catch (err) {
    console.log("Room already created.");
  }

  const at = new AccessToken(apiKey, apiSecret, { 
    identity: participantName,
    ttl: "1h" //time before token is expired  
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
  };
}
