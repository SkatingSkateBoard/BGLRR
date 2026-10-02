import styles from "./OperatorPlaceholder.module.css";

export default function OperatorPlaceholder({ title }: { title: string }) {
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1>{title}</h1>
        <p>This section is being prepared.</p>
      </section>
    </main>
  );
}
