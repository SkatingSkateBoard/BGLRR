// Actions

"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { AccessToken, LiveKitAPI } from "livekit-server-sdk";

type EmergencyData = {
  id: number;
  status: string;
} | null;

async function buildLiveKitSession(emergencyId: number, residentId: number) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const lkUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !lkUrl) {
    throw new Error("LiveKit environment variables are missing on the Cloudflare dashboard.");
  }

  const roomName = `emergency-${emergencyId}`;
  const participantName = `Resident-${residentId}`;

  try {
    const livekitApi = new LiveKitAPI();

    await livekitApi.room.createRoom({
      name: roomName,
      emptyTimeout: 1200,
      maxParticipants: 3,
    });

    console.log("LiveKit room ready:", roomName);
  } catch (error) {
    console.log("Room may already exist or LiveKit API failed:", error);
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    ttl: "1h",
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();

  return { roomName, token };
}

export async function createEmergencyRequest(
  category: string,
  coords: { latitude: number; longitude: number } | null,
  description: string | null
) {
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

    // Reuse any existing non-resolved emergency so the resident rejoins instead of creating duplicates
    const { data: existingReq } = await supabase
      .from("tbl_emergency_req")
      .select("id, status")
      .eq("resident_id", resident.id)
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let emergencyData: EmergencyData = existingReq;
    const isNewRequest = !existingReq;

    if (!existingReq) {
      const { data, error } = await supabase
        .from("tbl_emergency_req")
        .insert({
          resident_id: resident.id,
          category: category,
          status: "pending",
          current_latitude: coords?.latitude ?? null,
          current_longitude: coords?.longitude ?? null,
          resident_description: description,
          photo_emergency: null,
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

    const { roomName, token } = await buildLiveKitSession(emergencyData.id, resident.id);

    return {
      success: true,
      emergencyId: emergencyData.id,
      residentId: resident.id,
      isNewRequest,
      roomId: roomName,
      livekitToken: token,
      error: null,
    };
  } catch (globalError: any) {
    console.error("Caught fatal Server Action exception:", globalError);
    return {
      success: false,
      error: `Server Crash: ${globalError?.message || "Unknown error boundary hit."}`,
    };
  }
}

export async function getActiveEmergencyCall() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const { data: resident, error: residentError } = await supabase
      .from("tbl_resident")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (residentError || !resident) return null;

    const { data: activeReq, error: reqError } = await supabase
      .from("tbl_emergency_req")
      .select("id, status, category, created_at")
      .eq("resident_id", resident.id)
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reqError || !activeReq) return null;

    const { roomName, token } = await buildLiveKitSession(activeReq.id, resident.id);

    return {
      emergency: activeReq,
      roomId: roomName,
      livekitToken: token,
    };
  } catch (err) {
    console.error("getActiveEmergencyCall error:", err);
    return null;
  }
}

export async function attachEmergencyPhoto(emergencyId: number, photoPath: string) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated." };
    }

    const { data: resident } = await supabase
      .from("tbl_resident")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!resident) {
      return { success: false, error: "Resident not found." };
    }

    const supabaseAdmin = await createAdminClient();

    const { error } = await supabaseAdmin
      .from("tbl_emergency_req")
      .update({ photo_emergency: photoPath })
      .eq("id", emergencyId)
      .eq("resident_id", resident.id);

    if (error) {
      console.error("Failed to attach photo path:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Attach photo error:", err);
    return { success: false, error: err?.message || "Unknown error." };
  }
}
