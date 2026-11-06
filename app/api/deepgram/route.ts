import { NextResponse } from "next/server";
import { createClient as createServerSideClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { DeepgramClient } from "@deepgram/sdk";

// Force Next.js to compile this endpoint for the Cloudflare V8 Edge Runtime
export const runtime = "edge";

function getDeepgram() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY is not set");
  
  // FIXED: v5+ strictly requires the option object layout wrapper
  return new DeepgramClient({ apiKey }); 
}

/**
 * Downloads the recording, transcribes it with Deepgram, and saves the transcript.
 * This runs securely in the background using the modern Master Secret Key (sb_secret_...)
 */
async function transcribeAndSave(
  requestId: number,
  storagePath: string
) {
  // Initialize the client using your new modern backend secret variable
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY! // FIXED: Bypasses RLS using the new Secret Key system
  );

  // 1. Fetch the resident_id securely on the backend first
  const { data: reqData, error: reqError } = await supabaseAdmin
    .from("tbl_emergency_req")
    .select("resident_id")
    .eq("id", requestId)
    .single();

  if (reqError || !reqData) {
    throw new Error(`Failed to locate request or resident info: ${reqError?.message}`);
  }

  // 2. Download the stereo recording from the Supabase bucket
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from("call-recordings")
    .download(storagePath);

  if (downloadError || !fileData) {
    throw new Error(`File download failed: ${downloadError?.message}`);
  }

  // FIXED: Replaced Node.js Buffer with native browser Uint8Array for Cloudflare Edge compatibility
  const arrayBuffer = await fileData.arrayBuffer();
  const audioUint8 = new Uint8Array(arrayBuffer);

  // 3. Transcribe with Deepgram (SDK v5)
  const deepgram = getDeepgram();
  const response = await deepgram.listen.v1.media.transcribeFile(
    audioUint8 as any, 
    {
      model: "nova-3",
      multichannel: true, // Speaker separation by channel
      smart_format: true, // Handles informal Taglish punctuation and capitalization
      utterances: true,   // Chronologically ordered script array
      utt_split: 1.2,     // Generous pause threshold for emergency calls
    }
  );

  if (!("results" in response)) {
    throw new Error("Deepgram did not return transcription results");
  }
  
  const utterances = response.results?.utterances || [];
  
  // Maps directly into your unchecked jsonb array column
  const formattedTranscript = utterances.map((u: any) => ({
    role: u.channel === 0 ? "Operator" : "Resident",
    text: u.transcript,
    start: u.start,
    end: u.end,
  }));

  // 4. Clean, direct single insert mapping the true foreign keys
  const { error: dbError } = await supabaseAdmin
    .from("tbl_emergency_result")
    .insert({
      emergency_req_id: requestId,
      resident_id: reqData.resident_id,
      call_transcripts: formattedTranscript, // Your jsonb column name
      audio_path: storagePath,   
      created_at: new Date().toISOString(),
    });

  if (dbError) {
    console.error("Failed to insert emergency result:", dbError);
    throw dbError;
  }
  
  console.log(`Successfully completed transcription background job for request: ${requestId}`);
}

/**
 * Main API Route Handler
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const requestId = body?.requestId;
    const storagePath = body?.storagePath;

    if (!Number.isInteger(requestId) || typeof storagePath !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid parameters" },
        { status: 400 }
      );
    }

    // 1. Authentication Check: Verifies the browser session cookie JWT
    const supabaseUserClient = await createServerSideClient();
    const { data: { user } } = await supabaseUserClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2. Storage Traversal Prevention
    if (!storagePath.startsWith(`request-${requestId}/`) || storagePath.includes("..")) {
      return NextResponse.json({ success: false, error: "Invalid storage path" }, { status: 400 });
    }

    // 3. Extra Security Check: Ensure this specific Request ID exists in your requests table
    const { data: assignmentCheck } = await supabaseUserClient
      .from("tbl_emergency_req")
      .select("id")
      .eq("id", requestId)
      .single();

    if (!assignmentCheck) {
      return NextResponse.json({ success: false, error: "Request record access denied" }, { status: 403 });
    }

    // Extract Cloudflare context to handle the async offload
    const ctx = (request as any).context || (request as any).ctx;

    if (ctx && typeof ctx.waitUntil === "function") {
      // Offload to background worker thread and return 202 instantly
      ctx.waitUntil(transcribeAndSave(requestId, storagePath));
      return NextResponse.json({ success: true, status: "offloaded_to_background" }, { status: 202 });
    } else {
      // Local development runtime fallback
      await transcribeAndSave(requestId, storagePath);
      return NextResponse.json({ success: true, status: "completed" });
    }
  } catch (error: any) {
    console.error("Transcription route failure:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}