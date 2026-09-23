import LiveKitRoom from "@/app/components/LiveKitRoom";

export default function LiveKitTestPage() {
  return (
    <LiveKitRoom
      roomName="test-room"
      identity={`person-${Date.now()}`}
    />
  );
}
