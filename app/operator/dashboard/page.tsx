import { acceptEmergencyRequest } from "./actions";
import EmergencyList from "@/components/operatorComps/EmergencyList";

export default function OperatorDashboard() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <header className="border-b border-zinc-800 pb-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight"> Operator Dashboard</h1>
        <p className="text-zinc-400 text-sm mt-1">Monitoring real-time distress signals...</p>
      </header>
      
      <EmergencyList onAcceptCall={acceptEmergencyRequest} />
    </main>
  );
}