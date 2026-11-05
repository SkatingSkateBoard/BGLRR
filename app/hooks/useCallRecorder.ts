"use client";

import { useRef, useCallback } from "react";
import { Room, RoomEvent, RemoteTrack, Track } from "livekit-client";
import { createClient } from "@/utils/supabase/client";
import { saveRecordingPath } from "@/app/actions/livekit";

export function useCallRecorder(room: Room | undefined, requestId: number) {
  const ctxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const addedRef = useRef<Set<string>>(new Set());
  const mimeRef = useRef("audio/webm");
  const cleanupRef = useRef<(() => void) | null>(null);

  // Connects one audio track into the shared mix (each track only once)
  const addTrack = (mst: MediaStreamTrack) => {
    if (!ctxRef.current || !destRef.current) return;
    if (addedRef.current.has(mst.id)) return;
    addedRef.current.add(mst.id);
    ctxRef.current
      .createMediaStreamSource(new MediaStream([mst]))
      .connect(destRef.current);
  };

  const start = useCallback(async () => {
    if (!room || recorderRef.current) return;

    // 1. One AudioContext = the mixer. Everything connects to one destination.
    const ctx = new AudioContext();
    await ctx.resume();
    ctxRef.current = ctx;
    destRef.current = ctx.createMediaStreamDestination();

    // 2. Add tracks that already exist: operator's mic + resident's audio
    room.localParticipant.audioTrackPublications.forEach((p) => {
      if (p.track?.mediaStreamTrack) addTrack(p.track.mediaStreamTrack);
    });
    room.remoteParticipants.forEach((participant) =>
      participant.audioTrackPublications.forEach((p) => {
        if (p.track?.mediaStreamTrack) addTrack(p.track.mediaStreamTrack);
      })
    );

    // 3. Add tracks that show up later
    const onSub = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio) addTrack(track.mediaStreamTrack);
    };
    const onLocal = (pub: any) => {
      if (pub.track?.kind === Track.Kind.Audio) addTrack(pub.track.mediaStreamTrack);
    };
    room.on(RoomEvent.TrackSubscribed, onSub);
    room.on(RoomEvent.LocalTrackPublished, onLocal);
    cleanupRef.current = () => {
      room.off(RoomEvent.TrackSubscribed, onSub);
      room.off(RoomEvent.LocalTrackPublished, onLocal);
    };

    // 4. Record the mixed stream
    mimeRef.current = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/mp4"; // Safari

    const recorder = new MediaRecorder(destRef.current.stream, {
      mimeType: mimeRef.current,
      audioBitsPerSecond: 32000,
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recorder.start(5000);
    recorderRef.current = recorder;
  }, [room]);

  const stopAndUpload = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return null;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    recorderRef.current = null;
    cleanupRef.current?.();
    cleanupRef.current = null;
    addedRef.current.clear();
    await ctxRef.current?.close();
    ctxRef.current = null;

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

    await saveRecordingPath(requestId, path);
    return path;
  }, [requestId]);

  return { start, stopAndUpload };
}