"use server"

import { LiveKitAPI } from 'livekit-server-sdk';
import { createClient as createServerSideClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { DeepgramClient } from "@deepgram/sdk";

function getDeepgram() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY is not set");
  return new DeepgramClient({ apiKey }); 
}

/**
 * Unified Server Action: Ends the LiveKit room, updates request status to handling,
 * signs private bucket URLs, transcribes multi-lingual data, and inserts the result.
 */
export async function endLiveKitRoom(requestId: number, storagePath?: string | null) {
  try {
    console.log(`[Server Action] Starting termination sequence for Request ID: ${requestId}`);
    const supabase = await createServerSideClient();
    const api = new LiveKitAPI();

    // 1. Delete LiveKit Room
    try {
      await api.room.deleteRoom(`emergency-${requestId}`);
      console.log(`[Server Action] LiveKit room emergency-${requestId} deleted.`);
    } catch (e) {
      console.error("[Server Action] Room already closed or failed to delete:", e);
    }

    // 2. Flip request status to handling
    const { error: statusError } = await supabase
      .from("tbl_emergency_req")
      .update({ status: "handling" })
      .eq("id", requestId);

    if (statusError) {
      console.error("[Server Action] Status update warning:", statusError.message);
    }

    // 3. Process the recording if a storage target path exists
    if (storagePath) {
      try {
        console.log(`[Server Action] 🚀 Starting transcription pipeline for Request ID: ${requestId}`);
        
        const supabaseAdmin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SECRET_KEY! // Master security credentials to bypass RLS
        );

        // A. FIXED: Generate a temporary secure authorization token link to read from private buckets
        console.log(`[Server Action] Requesting secure authorization token signature for path: ${storagePath}`);
        const { data: signData, error: signError } = await supabaseAdmin.storage
          .from("call-recordings")
          .createSignedUrl(storagePath, 60); // Link automatically expires in 60 seconds

        if (signError || !signData?.signedUrl) {
          throw new Error(`Failed to generate authentication signature for storage file: ${signError?.message}`);
        }

        console.log(`[Server Action] Downloading recording using secure token stream...`);
        const fileResponse = await fetch(signData.signedUrl);
        
        if (!fileResponse.ok) {
          throw new Error(`Secure authenticated file download failed over network with status: ${fileResponse.status}`);
        }

        const arrayBuffer = await fileResponse.arrayBuffer();
        
        // Convert array buffer into standard Web Blob container structure
        const audioBlob = new Blob([arrayBuffer], {
          type: storagePath.endsWith(".m4a") ? "audio/mp4" : "audio/webm",
        });

        // B. Transcribe with Deepgram
        console.log(`[Server Action] Dispatching authenticated audio file block to Deepgram...`);
        const deepgram = getDeepgram();
        const response = await deepgram.listen.v1.media.transcribeFile(audioBlob, {
          model: "nova-3",
          multichannel: true,
          smart_format: true,
          utterances: true,
          utt_split: 1.2,
        });

        if (!("results" in response)) throw new Error("Deepgram did not return results");
        
        const utterances = response.results?.utterances || [];
        const formattedTranscript = utterances.map((u: any) => ({
          role: u.channel === 0 ? "Operator" : "Resident",
          text: u.transcript,
          start: u.start,
          end: u.end,
        }));

        // C. Fetch target Resident reference mapping key requirements
        const { data: reqData } = await supabaseAdmin
          .from("tbl_emergency_req")
          .select("resident_id")
          .eq("id", requestId)
          .single();

        const targetResidentId = reqData?.resident_id || 0;

        // D. Insert directly into tbl_emergency_result using the verified jsonb layout
        console.log(`[Server Action] Committing transcript to tbl_emergency_result (${formattedTranscript.length} lines)`);
        const { error: dbError } = await supabaseAdmin
          .from("tbl_emergency_result")
          .insert({
            emergency_req_id: requestId,
            resident_id: targetResidentId,
            call_transcripts: formattedTranscript, 
            audio_path: storagePath,
            created_at: new Date().toISOString(),
          });

        if (dbError) throw dbError;
        console.log(`✅ [Server Action] Successfully created row in tbl_emergency_result for ID: ${requestId}`);

      } catch (bgErr: any) {
        console.error("❌ [Server Action Pipeline Crash]:", bgErr.message || bgErr);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Action failure:", error);
    return { success: false, error: error?.message };
  }
}
