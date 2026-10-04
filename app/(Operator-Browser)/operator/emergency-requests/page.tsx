import { acceptEmergencyRequest } from "./actions";
import EmergencyList from "@/components/operator-comps/EmergencyList";
import styles from "./page.module.css";

export default function EmergencyRequestsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1>Emergency Requests</h1>
        <EmergencyList onAcceptCall={acceptEmergencyRequest} />
      </section>
    </main>
  )
}