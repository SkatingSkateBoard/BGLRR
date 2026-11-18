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

  const params = new URLSearchParams([
    ["model", "nova-3"],
    ["language", "multi"],
    ["language_hint", "tl"],
    ["language_hint", "en"],
    ["multichannel", "true"],
    ["smart_format", "true"],
    ["utterances", "true"],
    ["utt_split", "1.2"],

    // Tagalog / Taglish emergency terms
    ["keyterm", "rinig"],
    ["keyterm", "saklolo"],
    ["keyterm", "sunog"],
    ["keyterm", "ambulansya"],
    ["keyterm", "barangay"],
    ["keyterm", "aksidente"],
    ["keyterm", "baha"],

    // Quezon City / Metro Manila landmarks & districts
    ["keyterm", "Quezon City"],
    ["keyterm", "Commonwealth"],
    ["keyterm", "Novaliches"],
    ["keyterm", "Cubao"],
    ["keyterm", "Fairview"],
    ["keyterm", "EDSA"],
    ["keyterm", "Katipunan"],
    ["keyterm", "Batasan"],
  ]);

  const audioBytes = new Uint8Array(audio);

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": contentType,
    },
    body: audioBytes,
  });

  if (!res.ok) {
    throw new Error(`Deepgram ${res.status}: ${await res.text()}`);
  }

  const json: any = await res.json();
  const utterances: Utterance[] = json.results?.utterances ?? [];
  return utterances.sort((a, b) => a.start - b.start);
}

async function summarizeEmergencyCall(
  transcript: { role: string; text: string }[]
): Promise<string> {
  const cleanTranscript = (transcript ?? []).filter(
  (t) => t.text && t.text.trim().length > 0
);

  if (cleanTranscript.length === 0) {
    return "No speech detected.";
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Summarizer] GEMINI_API_KEY is not set");
    return "No summary made";
  }

  const dialogue = transcript.map((t) => `${t.role}: ${t.text}`).join("\n");

  const prompt = `Summarize this Taglish emergency call transcript into a clean, minimalist incident report for rapid response dispatchers.

    Rules:
    - Understand Tagalog, English, and Taglish slang or minor speech-to-text typos.
    - Only include facts stated in the call. Write "Not specified" or "None" if missing—never guess.
    - Plain text only (no markdown bolding, asterisks, or extra intro/outro text).
    - If there is no text or any given just say "No speech detected to summarize."

    Output in this exact 4-line format:

    INCIDENT: [Fire | Medical | Vehicular Accident | Crime/Disturbance | Flood/Rescue | Other] - [LOW | MEDIUM | HIGH | CRITICAL]
    LOCATION: [Exact street, barangay, or landmark mentioned, or "Not specified"]
    SITUATION: [1-2 short, clear sentences on what happened and any injuries/trapped persons]
    ACTION: [Responders dispatched/needed and instructions given by Operator]

    Transcript:
    ${dialogue}`;


  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          safetySettings: [
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 450,
          },
        }),
      }
    );

    if (!res.ok) {
      console.error("[Gemini Summary Error]:", res.status, await res.text());
      return "No summary made";
    }

    const data = await res.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return summary || "No summary made";
  } catch (err) {
    console.error("[Gemini Summary Exception]:", err);
    return "No summary made";
  }
}

export async function endLiveKitRoom(requestId: number, storagePath?: string | null) {
  try {
    console.log(`[Server Action] Starting termination sequence for Request ID: ${requestId}`);
    const supabase = await createServerSideClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

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

        // 1. Insert immediately so transcript & audio are never blocked
        const { data: insertedRow, error: dbError } = await supabaseAdmin
          .from("tbl_emergency_result")
          .insert({
            emergency_req_id: requestId,
            resident_id: reqData?.resident_id ?? 0,
            call_transcript: formattedTranscript,
            summary: "Generating summary...",
            audio_path: storagePath,
          })
          .select("id")
          .single();

        if (dbError) throw dbError;
        console.log(`[Server Action] Created tbl_emergency_result row #${insertedRow.id}`);

        // 2. Summarize with Gemini 3.5 Flash-Lite and update the same row
        const summaryText = await summarizeEmergencyCall(formattedTranscript);

        const { error: updateError } = await supabaseAdmin
          .from("tbl_emergency_result")
          .update({ summary: summaryText })
          .eq("id", insertedRow.id);

        if (updateError) {
          console.error("[Server Action] Summary update warning:", updateError.message);
        } else {
          console.log(`[Server Action] Updated summary for row #${insertedRow.id}`);
        }
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
import { notifyResponders } from "@/app/actions/notify";

export async function finalizeValidEmergency(
  requestId: number,
  notes: string,
) {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const admin = getAdminClient();

  await admin
    .from("tbl_emergency_result")
    .update({
      notes: notes.trim() || null,
    })
    .eq("emergency_req_id", requestId);

  // 1. Update status to "on-standby" AND fetch category/description in one query
  const { data: emergency, error } = await admin
    .from("tbl_emergency_req")
    .update({ status: "on-standby" })
    .eq("id", requestId)
    .select("id, category, resident_description")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // 2. Send push notifications to all responders!
  if (emergency) {
    await notifyResponders({
      id: emergency.id,
      category: emergency.category,
      resident_description: emergency.resident_description,
    });
  }

  return { success: true };
}

export async function discardFalseAlarm(
  requestId: number,
  storagePath?: string | null
) {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const admin = getAdminClient();

  if (storagePath) {
    await admin.storage.from("call-recordings").remove([storagePath]);
  }

  await admin
    .from("tbl_emergency_result")
    .delete()
    .eq("emergency_req_id", requestId);

  await admin
    .from("tbl_emergency_req")
    .delete()
    .eq("id", requestId);

  return { success: true };
}