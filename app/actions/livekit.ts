//LIVEKIT FUNCTIONS

"use server"

import {
  LiveKitAPI,
} from 'livekit-server-sdk';

import {createClient} from "@/utils/supabase/server";

export async function endLiveKitRoom(requestId: number) {
  try {
    const supabase = await createClient();
    const api = new LiveKitAPI();

    try {
      await api.room.deleteRoom(`emergency-${requestId}`);
    } catch (e) {
      console.error("Room already closed or failed to delete:", e);
    }

    await supabase
      .from("tbl_emergency_req")
      .update({ status: "handling" })
      .eq("id", requestId);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message };
  }
}
