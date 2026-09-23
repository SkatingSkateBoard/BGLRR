import LiveKitRoom from "@/components/LiveKitRoom";

export default function LiveKitTestPage() {
  return (
    <LiveKitRoom
      roomName="test-room"
      identity={`person-${Date.now()}`}
    />
  );
}
