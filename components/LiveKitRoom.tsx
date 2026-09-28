"use client";

import { useEffect, useRef, useState } from "react";
import {
  LocalTrackPublication,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
} from "livekit-client";

type LiveKitRoomProps = {
  roomName: string;
  identity: string;
};

export default function LiveKitRoom({
  roomName,
  identity,
}: LiveKitRoomProps) {
  const roomRef = useRef<Room | null>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState("Connecting...");
  const [error, setError] = useState<string | null>(null);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);

  useEffect(() => {
    // 1. Create a flag to track if this specific effect run is still active
    let isCurrentEffect = true; 
    const room = new Room();
    roomRef.current = room;

    function handleTrackSubscribed(
      track: RemoteTrack,
      _publication: RemoteTrackPublication
    ) {
      const audioElement = track.attach();
      audioElement.autoplay = true;
      audioElement.setAttribute("playsinline", "");
      audioContainerRef.current?.appendChild(audioElement);
    }

    function handleTrackUnsubscribed(
      track: RemoteTrack,
      _publication: RemoteTrackPublication
    ) {
      track.detach().forEach((element) => element.remove());
    }

    function handleLocalTrackUnpublished(
      publication: LocalTrackPublication
    ) {
      publication.track?.detach().forEach((element) => element.remove());
    }

    function handleDisconnected() {
      // 2. Only update state if this effect instance is still valid
      if (!isCurrentEffect) return;
      setStatus("Disconnected");
      setMicrophoneEnabled(false);
    }

    room
      .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      .on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished)
      .on(RoomEvent.Disconnected, handleDisconnected);

    async function connect() {
      try {
        if (!isCurrentEffect) return;
        setStatus("Getting token...");

        const response = await fetch(
          `/api/livekit-test?room=${encodeURIComponent(
            roomName
          )}&identity=${encodeURIComponent(identity)}`,
          { credentials: "include" }
        );

        const data = await response.json();

        // 3. Check again after the network await
        if (!isCurrentEffect) return;

        if (!response.ok) {
          throw new Error(data.error || "Could not get LiveKit token");
        }

        setStatus("Connecting to call...");

        await room.connect(data.url, data.token);

        // 4. Check again after the connection await
        if (!isCurrentEffect) {
          room.disconnect();
          return;
        }

        // Voice only: enable microphone, not camera.
        await room.localParticipant.setMicrophoneEnabled(true);

        if (!isCurrentEffect) return;

        setMicrophoneEnabled(true);
        setStatus("Connected");
      } catch (error) {
        // 5. Ignore errors stemming from an effect that has already been discarded
        if (!isCurrentEffect) return;

        console.error("LiveKit connection failed:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Could not connect to the call"
        );
        setStatus("Connection failed");
      }
    }

    connect();

    return () => {
      // 6. Kill this effect instance immediately on cleanup
      isCurrentEffect = false; 
      
      room.disconnect();
      room.removeAllListeners();

      audioContainerRef.current?.replaceChildren();
      roomRef.current = null;
    };
  }, [roomName, identity]);

  async function toggleMicrophone() {
    const room = roomRef.current;
    if (!room) return;
    const nextValue = !microphoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(nextValue);
    setMicrophoneEnabled(nextValue);
  }

  async function leaveCall() {
    await roomRef.current?.disconnect();
  }

  if (error) {
    return (
      <div>
        <p>Call error: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <p>Room: {roomName}</p>
      <p>Status: {status}</p>

      <button type="button" onClick={toggleMicrophone}>
        {microphoneEnabled ? "Mute microphone" : "Unmute microphone"}
      </button>

      <button type="button" onClick={leaveCall}>
        Leave call
      </button>

      {/* Remote audio elements are attached here */}
      <div ref={audioContainerRef} />
    </div>
  );
}
