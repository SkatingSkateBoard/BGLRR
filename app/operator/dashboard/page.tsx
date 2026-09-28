import { acceptEmergencyRequest } from "./actions";
import EmergencyList from "@/components/operatorComps/EmergencyList";

export default function OperatorDashboard() {
  return (
    <>
      <main>
        <h1>Operator Dashboard</h1>
          <EmergencyList />
      </main>
    </>
  );
}
