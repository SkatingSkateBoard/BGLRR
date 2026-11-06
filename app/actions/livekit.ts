"use server";
import { LiveKitAPI } from "livekit-server-sdk";
import { createClient as createServerSideClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

type Utterance = {
  channel?: number;
  transcript: string;
  start: number;
  end: number;
};

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function transcribeWithDeepgram(
  audio: ArrayBuffer,
  contentType: string
): Promise<Utterance[]> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY is not set");

  const params = new URLSearchParams({
    model: "nova-3",
    multichannel: "true",
    smart_format: "true",
    utterances: "true",
    utt_split: "1.2",
  });

  // FIX: Convert ArrayBuffer to a Node Buffer for stable HTTP transmission
  const audioBuffer = Buffer.from(audio);

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": contentType,
    },
    body: audioBuffer, // Node handles Buffer flawlessly here
  });

  if (!res.ok) {
    throw new Error(`Deepgram ${res.status}: ${await res.text()}`);
  }

  const json: any = await res.json();
  return json.results?.utterances ?? [];
}

export async function endLiveKitRoom(requestId: number, storagePath?: string | null) {
  try {
    console.log(`[Server Action] Starting termination sequence for Request ID: ${requestId}`);
    const supabase = await createServerSideClient();
    const api = new LiveKitAPI();

    try {
      await api.room.deleteRoom(`emergency-${requestId}`);
      console.log(`[Server Action] LiveKit room emergency-${requestId} deleted.`);
    } catch (e) {
      console.error("[Server Action] Room already closed or failed to delete:", e);
    }

    const { error: statusError } = await supabase
      .from("tbl_emergency_req")
      .update({ status: "handling" })
      .eq("id", requestId);

    if (statusError) {
      console.error("[Server Action] Status update warning:", statusError.message);
    }

    if (storagePath) {
      try {
        console.log(`[Server Action] Starting transcription pipeline for Request ID: ${requestId}`);
        const supabaseAdmin = getAdminClient();
        
        const { data: fileData, error: downloadError } = await supabaseAdmin.storage
          .from("call-recordings")
          .download(storagePath);

        if (downloadError || !fileData) {
          throw new Error(`Storage download failed: ${downloadError?.message}`);
        }

        const audio = await fileData.arrayBuffer();
        const contentType = storagePath.endsWith(".m4a") ? "audio/mp4" : "audio/webm";

        console.log(`[Server Action] Sending ${audio.byteLength} bytes to Deepgram...`);
        const utterances = await transcribeWithDeepgram(audio, contentType);
        console.log(`[Server Action] Deepgram returned ${utterances.length} utterances`);

        const formattedTranscript = utterances.map((u) => ({
          role: u.channel === 0 ? "Operator" : u.channel === 1 ? "Resident" : "Unknown",
          text: u.transcript,
          start: u.start,
          end: u.end,
        }));

        const { data: reqData } = await supabaseAdmin
          .from("tbl_emergency_req")
          .select("resident_id")
          .eq("id", requestId)
          .single();

        const { error: dbError } = await supabaseAdmin
          .from("tbl_emergency_result")
          .insert({
            emergency_req_id: requestId,
            resident_id: reqData?.resident_id ?? 0,
            call_transcript: formattedTranscript,
            audio_path: storagePath,
          });

        if (dbError) throw dbError;
        console.log(`[Server Action] Created tbl_emergency_result row for ID: ${requestId}`);
      } catch (bgErr: any) {
        let c: any = bgErr;
        let depth = 0;
        while (c && depth < 5) {
          console.error(`[Pipeline error ${depth}]`, {
            name: c.name,
            message: c.message,
            code: c.code,
          });
          c = c.cause;
          depth++;
        }
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Action failure:", error);
    return { success: false, error: error?.message };
  }
}
