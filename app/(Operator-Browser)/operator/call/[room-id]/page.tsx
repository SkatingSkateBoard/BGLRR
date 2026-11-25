"use client";

import { use, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { createClient } from "@/utils/supabase/client";
import {
  endLiveKitRoom,
  finalizeValidEmergency,
  discardFalseAlarm,
} from "@/app/actions/livekit";
import { useCallRecorder } from "@/app/hooks/useCallRecorder";
import { useKrispNoiseFilter } from "@livekit/components-react/krisp";
import { Track } from "livekit-client";
import {
  CheckCircle2,
  Trash2,
  FileText,
  Loader2,
  ShieldAlert,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Users,
  Sparkles,
  Clock,
  MapPin,
} from "lucide-react";
import { usePreviewMode } from "@/lib/usePreviewMode";

function MapPlaceholder() {
  return (
    <div
      role="img"
      aria-label="Live location tracking map placeholder"
      className="my-4 flex min-h-48 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-5 text-center"
    >
      <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-900/10 text-indigo-900">
        <MapPin className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-slate-800">
        Live Location Tracking
      </p>
      <p className="mt-1 text-xs text-slate-500 max-w-xs">
        Map placeholder. Resident GPS coordinates will appear here.
      </p>
    </div>
  );
}

export default function OperatorCallPage({
  params,
}: {
  params: Promise<{ "room-id": string }>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { "room-id": roomId } = use(params);
  const token = searchParams.get("token");
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";
  const previewMode =
    usePreviewMode() ||
    (process.env.NODE_ENV !== "production" && searchParams.get("preview") === "1");

  const [postCall, setPostCall] = useState<{
    requestId: number;
    storagePath: string | null;
    durationSec: number;
  } | null>(null);

  if (postCall) {
    return (
      <PostCallDispositionScreen
        requestId={postCall.requestId}
        storagePath={postCall.storagePath}
        durationSec={postCall.durationSec}
      />
    );
  }

  if (previewMode) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
        <LiveKitRoom
          video={false}
          audio={false}
          token="preview"
          serverUrl={serverUrl}
          connect={false}
        >
          <OperatorCallInterface
            roomId={roomId}
            previewMode
            onCallEnded={() => undefined}
            onPreviewCallEnded={() => router.push("/operator/dashboard?preview=1")}
          />
        </LiveKitRoom>
      </main>
    );
  }

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <p className="font-bold tracking-wider uppercase text-xs text-red-600 mb-2">
            Authorization Error
          </p>
          <p className="text-sm text-slate-600">
            Operator credentials token is missing or expired.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      <LiveKitRoom
        video={false}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        connectOptions={{ autoSubscribe: true }}
        onDisconnected={() => {
          if (!postCall) router.push("/operator/dashboard");
        }}
      >
        <OperatorCallInterface
          roomId={roomId}
          onCallEnded={(data) => setPostCall(data)}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </main>
  );
}
function OperatorCallInterface({
  roomId,
  onCallEnded,
  previewMode = false,
  onPreviewCallEnded,
}: {
  roomId: string;
  previewMode?: boolean;
  onPreviewCallEnded?: () => void;
  onCallEnded: (data: {
    requestId: number;
    storagePath: string | null;
    durationSec: number;
  }) => void;
}) {
  const requestId = parseInt(roomId.split("-").at(1) ?? "0", 10);

  const participants = useParticipants();
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [time, setTime] = useState(0);
  const [ending, setEnding] = useState(false);
  const [previewMuted, setPreviewMuted] = useState(false);
  const { start, stopAndUpload } = useCallRecorder(room, requestId);

  const micTrack = localParticipant?.getTrackPublication(Track.Source.Microphone);
  const { isNoiseFilterEnabled, setNoiseFilterEnabled, isNoiseFilterPending } =
    useKrispNoiseFilter();

  useEffect(() => {
    if (micTrack && !isNoiseFilterEnabled && !isNoiseFilterPending) {
      setNoiseFilterEnabled(true).catch((err) => {
        console.warn("Krisp noise filter not supported or failed to load:", err);
      });
    }
  }, [micTrack, isNoiseFilterEnabled, isNoiseFilterPending, setNoiseFilterEnabled]);

  useEffect(() => {
    if (room?.state === "connected") start();
  }, [room?.state, start]);

  useEffect(() => {
    const timer = setInterval(() => setTime((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const isMuted = previewMode ? previewMuted : !isMicrophoneEnabled;

  const formatTime = (s: number) =>
    Math.floor(s / 60).toString().padStart(2, "0") +
    ":" +
    (s % 60).toString().padStart(2, "0");

  const isResidentConnected = participants.some((p) =>
    p.identity?.startsWith("Resident-")
  );

  const participantNames = participants
    .map((p) =>
      p.identity?.startsWith("Resident-")
        ? "Resident " + (p.identity.split("-").at(1) ?? "")
        : p.identity
    )
    .join(", ");

  const toggleMute = async () => {
    if (previewMode) {
      setPreviewMuted((muted) => !muted);
      return;
    }
    await localParticipant.setMicrophoneEnabled(isMuted);
  };

  const handleTerminate = async () => {
    if (ending) return;
    if (previewMode) {
      onPreviewCallEnded?.();
      return;
    }
    setEnding(true);
    try {
      const uploadedStoragePath = await stopAndUpload();
      console.log(
        "Uploaded file path string captured on frontend:",
        uploadedStoragePath
      );

      onCallEnded({
        requestId,
        storagePath: (uploadedStoragePath as string) ?? null,
        durationSec: time,
      });

      await endLiveKitRoom(requestId, uploadedStoragePath as string);
      if (room) {
        await room.disconnect();
      }
    } catch (err) {
      console.error("Failed to execute clean call termination sequence:", err);
      onCallEnded({
        requestId,
        storagePath: null,
        durationSec: time,
      });
    }
  };
  return (
    <div className="flex flex-col min-h-screen max-w-5xl mx-auto p-6 md:p-10 justify-between gap-6">
      {/* Top Dispatch Header */}
      <header className="flex flex-wrap justify-between items-center gap-4 w-full bg-white border border-slate-200/80 rounded-2xl px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-900 text-white shadow-xs">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                Emergency Response Panel
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-900 border border-indigo-200/70">
                <Sparkles className="w-3 h-3" />
                {isNoiseFilterEnabled ? "Krisp AI Active" : "Krisp Syncing"}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              CHANNEL // {roomId}
            </p>
          </div>
        </div>

        {/* Right Status Pill + Quick Disconnect */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50">
            <span
              className={
                "w-2.5 h-2.5 rounded-full " +
                (isResidentConnected
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-amber-400")
              }
            />
            <span className="text-xs font-semibold text-slate-700">
              {isResidentConnected ? "Feed Active" : "Line Standby"}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-mono font-bold text-indigo-950 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {formatTime(time)}
            </span>
          </div>

          <button
            onClick={handleTerminate}
            disabled={ending}
            title="End Call & Proceed to Post-Call Notes"
            className="flex items-center justify-center p-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors duration-150 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Two-Column Call Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto items-stretch w-full">
        {/* Left Card: Session & Location */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Session Info
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                {previewMode ? "PREVIEW" : "REC ON"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div>
                <p className="text-[11px] text-slate-400">Incident Feed Room</p>
                <p className="text-sm font-bold font-mono text-slate-800 mt-0.5">
                  {roomId}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Connection Link</p>
                <p className="text-sm font-medium text-slate-700 truncate mt-0.5">
                  LiveKit Routing Stream
                </p>
              </div>
            </div>
          </div>

          <MapPlaceholder />

          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-2">
              Live Participants ({participants.length})
            </p>
            <div className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
              <Users className="w-4 h-4 text-indigo-900 shrink-0" />
              <span className="truncate text-xs font-mono text-slate-700">
                {participantNames || "Connecting..."}
              </span>
            </div>
          </div>
        </div>

        {/* Right Card: Live Audio Waveform Viewport */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col items-center justify-center min-h-72 relative overflow-hidden">
          <div
            className={
              "mb-5 flex h-16 w-16 items-center justify-center rounded-2xl " +
              (isResidentConnected
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                : "bg-slate-100 text-slate-400 border border-slate-200")
            }
          >
            <Radio
              className={
                "w-8 h-8 " + (isResidentConnected ? "animate-pulse" : "")
              }
            />
          </div>

          <p className="text-lg font-bold text-slate-900 text-center">
            {isResidentConnected
              ? "Incoming Resident Audio Secure"
              : "Awaiting Resident Stream"}
          </p>
          <p className="text-sm text-slate-500 text-center mt-1.5 max-w-sm leading-relaxed">
            {isResidentConnected
              ? "All channels open. Dual-channel recording & Krisp noise suppression active."
              : "System open. Waiting for resident dispatch handshake."}
          </p>

          {isResidentConnected && (
            <div className="flex items-center gap-1.5 h-10 mt-7 px-5 py-2 rounded-full bg-indigo-50/80 border border-indigo-100">
              {[0.4, 0.8, 0.5, 0.9, 0.3, 0.7, 0.4, 0.8, 0.6].map((op, i) => (
                <div
                  key={i}
                  style={{ animationDelay: i * 120 + "ms", opacity: op }}
                  className="w-1.5 bg-indigo-900 rounded-full h-full animate-pulse"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls Footer */}
      <footer className="flex flex-wrap justify-center gap-4 pt-5 border-t border-slate-200/80 w-full">
        <button
          onClick={toggleMute}
          aria-pressed={isMuted}
          className={
            "flex items-center gap-2.5 px-6 py-3 rounded-xl border text-sm font-semibold shadow-xs transition-colors cursor-pointer " +
            (isMuted
              ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100")
          }
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {isMuted ? "Unmute Mic" : "Mute Mic"}
        </button>

        <button
          onClick={handleTerminate}
          disabled={ending}
          className="flex items-center gap-2.5 px-7 py-3 rounded-xl border border-red-600 bg-red-600 text-white hover:bg-red-700 text-sm font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          <PhoneOff className="w-4 h-4" />
          {ending ? "Saving Call & Loading Notes..." : "Disconnect Call"}
        </button>
      </footer>
    </div>
  );
}
function PostCallDispositionScreen({
  requestId,
  storagePath,
  durationSec,
}: {
  requestId: number;
  storagePath: string | null;
  durationSec: number;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [disposition, setDisposition] = useState<"VERIFIED" | "FALSE_ALARM">(
    "VERIFIED"
  );
  const [notes, setNotes] = useState("");
  const [officerName, setOfficerName] = useState("");
  const [aiSummary, setAiSummary] = useState<string>("Generating AI summary...");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email && !officerName) {
        setOfficerName(data.user.email);
      }
    });
  }, []);

  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("tbl_emergency_result")
        .select("summary")
        .eq("emergency_req_id", requestId)
        .maybeSingle();

      if (active && data?.summary && data.summary !== "Generating summary...") {
        setAiSummary(data.summary);
        clearInterval(interval);
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [requestId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    if (disposition === "FALSE_ALARM") {
      await discardFalseAlarm(requestId, storagePath);
    } else {
      await finalizeValidEmergency(requestId, notes);
    }

    router.push("/operator/dashboard");
  };

  const mins = Math.floor(durationSec / 60).toString().padStart(2, "0");
  const secs = (durationSec % 60).toString().padStart(2, "0");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 md:p-8 space-y-6"
      >
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-indigo-900 text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              Post-Call Triage & Disposition
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Emergency Request #{requestId} Ended
            </h1>
          </div>
          <span className="text-xs font-mono font-semibold bg-indigo-50 text-indigo-900 border border-indigo-100 px-3 py-1.5 rounded-lg">
            Call Duration: {mins}:{secs}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-indigo-900">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              AI Incident Summary Preview
            </span>
            {aiSummary === "Generating AI summary..." && (
              <span className="inline-flex items-center gap-1 text-slate-400 font-normal normal-case">
                <Loader2 className="w-3 h-3 animate-spin" /> Transcribing & summarizing...
              </span>
            )}
          </div>
          <pre className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
            {aiSummary}
          </pre>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Call Classification
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDisposition("VERIFIED")}
              className={
                "p-4 rounded-xl border text-left transition-all cursor-pointer " +
                (disposition === "VERIFIED"
                  ? "border-indigo-900 bg-indigo-50/70 ring-1 ring-indigo-900"
                  : "border-slate-200 hover:bg-slate-50")
              }
            >
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Verified Emergency
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Legitimate incident. Save responder notes and log to History.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDisposition("FALSE_ALARM")}
              className={
                "p-4 rounded-xl border text-left transition-all cursor-pointer " +
                (disposition === "FALSE_ALARM"
                  ? "border-red-600 bg-red-50/70 ring-1 ring-red-600"
                  : "border-slate-200 hover:bg-slate-50")
              }
            >
              <div className="flex items-center gap-2 font-bold text-sm text-red-700">
                <Trash2 className="w-4 h-4 text-red-600" />
                Prank / False Alarm
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Troll call or accidental dial. Deletes this request & recording.
              </p>
            </button>
          </div>
        </div>

        {disposition === "VERIFIED" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Handled / Resolved By (Officer Name)
              </label>
              <input
                type="text"
                required
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                placeholder="e.g., BPSO Officer R. Santos"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-700 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Responder / Blotter Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter dispatched units, actions taken, or resolution remarks..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-700 focus:bg-white"
              />
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-700">
            Warning: Submitting as <strong>Prank / False Alarm</strong> will permanently delete Emergency Request #{requestId}, its transcript, and its audio recording.
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className={
              "px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 " +
              (disposition === "FALSE_ALARM"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-indigo-900 hover:bg-indigo-950")
            }
          >
            {submitting
              ? "Processing..."
              : disposition === "FALSE_ALARM"
              ? "Delete False Alarm Request"
              : "Save Notes & Complete Log"}
          </button>
        </div>
      </form>
    </div>
  );
}
