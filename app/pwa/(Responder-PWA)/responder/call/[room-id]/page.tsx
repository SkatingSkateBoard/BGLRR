import { redirect } from 'next/navigation';
import CallRoom from './call-room';
 
export default async function ResponderCallPage({
  params,
}: {
  params: Promise<{ 'room-id': string }>;
}) {
  const { 'room-id': roomId } = await params;
  const match = /^emergency-(\d+)$/.exec(roomId);
 
  if (!match) redirect('/pwa/responder/dashboard');
 
  return <CallRoom emergencyId={Number(match[1])} />;
}
 