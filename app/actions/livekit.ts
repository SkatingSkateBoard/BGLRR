"use server"

import {
  EncodedFileOutput,
  EncodedFileType,
  LiveKitAPI,
} from 'livekit-server-sdk';

import {createClient} from "@/utils/supabase/server";

export async function startAudioRecording(requestId: number) {
  try {
    const roomName = `emergency-${requestId}`;

    // Reads LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET from env
    const api = new LiveKitAPI();

    const output = new EncodedFileOutput({
      fileType: EncodedFileType.MP3,
      filepath: `request-${requestId}-${Date.now()}.mp3`,
      output: {
        case: 's3',
        value: {
          accessKey: process.env.S3_ACCESS_KEY!,
          secret: process.env.S3_SECRET_KEY!,
          bucket: process.env.AUDIO_BUCKET_NAME!,
          region: process.env.S3_REGION!,
          endpoint: process.env.S3_ENDPOINT!,
          forcePathStyle: true, // needed for Supabase Storage / most non-AWS S3 endpoints
        },
      },
    });

    const egressInfo = await api.egress.startRoomCompositeEgress(
      roomName,
      output,
      { audioOnly: true },
    );

    return {
      success: true,
      egressId: egressInfo.egressId,
      error: null,
    };
  } catch (error: any) {
    console.error("Pure Audio Egress Startup Failed:", error);
    return { success: false, egressId: null, error: error?.message || "Egress process failed." };
  }
}

export async function endLiveKitRoom(requestId: number, egressId: string | null) {
  try {
    const supabase = await createClient();
    const api = new LiveKitAPI();
    const roomName = `emergency-${requestId}`;

    if (egressId) {
      try {
        await api.egress.stopEgress(egressId);
        console.log(`Successfully requested Egress teardown for ID: ${egressId}`);
      } catch (egressError) {
        console.error("Error sending stop signal to Egress engine:", egressError);
      }
    }

    try {
      await api.room.deleteRoom(roomName);
      console.log(`LiveKit room ${roomName} has been purged.`);
    } catch (roomError) {
      console.error("Room was already closed or failed to delete:", roomError);
    }

    await supabase
      .from("tbl_emergency_req")
      .update({ status: "handling" })
      .eq("id", requestId);

    return { success: true };
  } catch (error: any) {
    console.error("Session termination crash:", error);
    return { success: false, error: error?.message };
  }
}