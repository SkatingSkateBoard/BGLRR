import { createClient } from "@/utils/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: residents, error } = await supabase
    .from("tbl_resident")
    .select("*");

  if (error) {
    return (
      <main>
        <h1>Supabase error</h1>
        <pre>{error.message}</pre>
      </main>
    );
  }

  return (
    <main>
      <h1>Residents</h1>

      {residents.length === 0 ? (
        <p>No residents found.</p>
      ) : (
        <ul>
          {residents.map((resident) => (
            <li key={resident.id}>
              {resident.first_name} {resident.last_name} {resident.suffix}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
