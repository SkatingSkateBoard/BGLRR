"use client";

import { useRef, useCallback } from "react";
import { Room, RoomEvent, RemoteTrack, Track } from "livekit-client";
import { createClient } from "@/utils/supabase/client";

export function useCallRecorder(room: Room | undefined, requestId: number) {
  const ctxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const mergerRef = useRef<ChannelMergerNode | null>(null);
  const sourcesRef = useRef<MediaStreamAudioSourceNode[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const addedRef = useRef<Set<string>>(new Set());
  const mimeRef = useRef("audio/webm");
  const cleanupRef = useRef<(() => void) | null>(null);

  // Connects track into a specific channel (0 = Left/Operator, 1 = Right/Resident)
  const addTrack = useCallback((mst: MediaStreamTrack, channelIndex: number) => {
    if (!ctxRef.current || !mergerRef.current) return;
    if (addedRef.current.has(mst.id)) return;
    if (mst.readyState === "ended") return;

    addedRef.current.add(mst.id);
    try {
      const source = ctxRef.current.createMediaStreamSource(new MediaStream([mst]));
      source.connect(mergerRef.current, 0, channelIndex);
      sourcesRef.current.push(source); // Prevent browser GC mid-call
    } catch (e) {
      console.error(`Failed to connect channel ${channelIndex}:`, e);
      addedRef.current.delete(mst.id);
    }
  }, []);

  const start = useCallback(async () => {
    if (!room || recorderRef.current) return;

    // 1. Native 48kHz WebRTC rate (prevents Chrome resampling distortion)
    const ctx = new AudioContext({ sampleRate: 48000 });
    await ctx.resume();
    ctxRef.current = ctx;

    // 2. Explicit 2-channel stereo destination
    const dest = ctx.createMediaStreamDestination();
    dest.channelCount = 2;
    dest.channelCountMode = "explicit";
    dest.channelInterpretation = "speakers";
    destRef.current = dest;

    // 3. Stereo merger (0 = Left, 1 = Right)
    const merger = ctx.createChannelMerger(2);
    merger.connect(dest);
    mergerRef.current = merger;

    // 4. Local user (Operator -> Channel 0 / Left)
    room.localParticipant.audioTrackPublications.forEach((p) => {
      if (p.track?.mediaStreamTrack) addTrack(p.track.mediaStreamTrack, 0);
    });

    // 5. Existing remote user (Resident -> Channel 1 / Right)
    room.remoteParticipants.forEach((participant) =>
      participant.audioTrackPublications.forEach((p) => {
        if (p.track?.mediaStreamTrack) addTrack(p.track.mediaStreamTrack, 1);
      })
    );

    // 6. Dynamic track listeners
    const onSub = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio && track.mediaStreamTrack) {
        addTrack(track.mediaStreamTrack, 1);
      }
    };

    const onLocal = (pub: any) => {
      if (pub.track?.kind === Track.Kind.Audio && pub.track?.mediaStreamTrack) {
        addTrack(pub.track.mediaStreamTrack, 0);
      }
    };

    room.on(RoomEvent.TrackSubscribed, onSub);
    room.on(RoomEvent.LocalTrackPublished, onLocal);

    cleanupRef.current = () => {
      room.off(RoomEvent.TrackSubscribed, onSub);
      room.off(RoomEvent.LocalTrackPublished, onLocal);
    };

    // 7. Browser-compatible codec selection
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      mimeRef.current = "audio/webm;codecs=opus";
    } else if (MediaRecorder.isTypeSupported("audio/mp4;codecs=mp4a.40.2")) {
      mimeRef.current = "audio/mp4;codecs=mp4a.40.2";
    } else {
      mimeRef.current = "audio/mp4";
    }

    // 64kbps gives 32kbps per channel so Tagalog consonants stay crisp
    const recorder = new MediaRecorder(destRef.current.stream, {
      mimeType: mimeRef.current,
      audioBitsPerSecond: 64000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(5000);
    recorderRef.current = recorder;
  }, [room, addTrack]);

  const stopAndUpload = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return null;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      if (recorder.state === "recording") {
        recorder.requestData(); // Flush final audio buffer before stopping
      }
      recorder.stop();
    });

    recorderRef.current = null;
    cleanupRef.current?.();
    cleanupRef.current = null;
    addedRef.current.clear();

    sourcesRef.current.forEach((s) => s.disconnect());
    sourcesRef.current = [];

    await ctxRef.current?.close();
    ctxRef.current = null;
    mergerRef.current = null;

    const ext = mimeRef.current.startsWith("audio/mp4") ? "m4a" : "webm";
    const blob = new Blob(chunksRef.current, { type: mimeRef.current });
    chunksRef.current = [];
    if (blob.size === 0) return null;

    const path = `request-${requestId}/${Date.now()}.${ext}`;
    const supabase = createClient();

    const { error } = await supabase.storage
      .from("call-recordings")
      .upload(path, blob, { contentType: mimeRef.current });

    if (error) {
      console.error("Recording upload failed:", error);
      return null;
    }

    return path;
  }, [requestId]);

  return { start, stopAndUpload };
}
