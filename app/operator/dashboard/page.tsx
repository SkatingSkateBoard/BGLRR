import { acceptEmergencyRequest } from "./actions";
import EmergencyList from "@/components/operatorComps/EmergencyList";

export default function OperatorDashboard() {
  return (
    <main>
      <header>
        <h1> Operator Dashboard</h1>
      </header>
      
      <EmergencyList onAcceptCall={acceptEmergencyRequest} />
    </main>
  );
}