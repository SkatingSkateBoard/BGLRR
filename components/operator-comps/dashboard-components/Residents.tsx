"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { approveResident, rejectResident } from "@/app/actions/verify";

type Resident = {
  id: number;
  first_name: string;
  last_name: string;
  suffix: string;
  phone_number: string;
  age: number;
  gender: string;
  email: string;
};

export function RegisteredScreen() {
  const supabase = createClient();

  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchPendingResidents = async () => {
    try {
      const { data, error } = await supabase
        .from("tbl_resident")
        .select("*")
        .eq("status", "PENDING");
      if (error) {
        console.error("Error fetching pending residents:", error);
      } else {
        setResidents(data as Resident[]);
      }
    } catch (error) {
      console.error("Error fetching pending residents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingResidents();
  }, []);

  const handleStatusChange = async (id: number, actionType: "approve" | "reject") => {
    setBusyId(id);
    try {
      if (actionType === "approve") {
        await approveResident(id);
      } else {
        await rejectResident(id);
      }
      setResidents((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(`Failed to complete action: ${err}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    // FIXED: Changed page background to pure white
    <main className="min-h-screen p-5 sm:p-8 md:p-12 bg-white text-gray-900">
      {/* FIXED: Changed main card wrapper container to pure white with standard border and modern light gray drop shadow */}
      <section className="p-5 sm:p-8 md:p-10 border border-gray-200 rounded-2xl bg-white shadow-sm">
        <h1 className="m-0 mb-6 text-2xl sm:text-3xl font-extrabold tracking-wide text-gray-900">
          Pending Residents
        </h1>

        {loading ? (
          <p className="m-0 font-semibold text-gray-500">Loading pending residents...</p>
        ) : residents.length === 0 ? (
          // FIXED: Changed empty state card element to flat white with thin neutral gray border frame
          <p className="m-0 p-6 rounded-xl text-center font-semibold text-gray-500 bg-white border border-gray-100 shadow-sm">
            No pending residents found.
          </p>
        ) : (
          <section>
            {/* FIXED: Adjusted counter badge element styling to look minimal gray and white */}
            <h2 className="flex items-center gap-2 m-0 mb-4 font-extrabold text-gray-900">
              Pending Registrations{" "}
              <span className="min-w-[1.7rem] px-2 py-0.5 rounded-full text-center text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200">
                {residents.length}
              </span>
            </h2>

            {residents.map((resident) => (
              // FIXED: Replaced tan gradient article cards with crisp pure white panels and fine light borders
              <article
                key={resident.id}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 p-5 border border-gray-200 rounded-xl bg-white shadow-sm"
              >
                {/* Avatar (Kept blue typography accent clean on soft gray base) */}
                <div
                  className="shrink-0 w-14 h-14 grid place-items-center rounded-full text-lg font-black tracking-wider text-blue-600 bg-gray-50 border border-gray-200"
                  aria-hidden="true"
                >
                  {`${resident.first_name?.[0] ?? ""}${resident.last_name?.[0] ?? ""}`.toUpperCase()}
                </div>

                {/* Info block */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 text-base font-extrabold text-gray-900">
                      {resident.first_name} {resident.last_name}
                      {resident.suffix ? ` ${resident.suffix}` : ""}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase text-amber-700 bg-amber-50 border border-amber-200">
                      Pending
                    </span>
                  </div>

                  {/* FIXED: Swapped out brown textual descriptive tags for deep slate neutral tones */}
                  <dl className="flex flex-wrap gap-x-6 gap-y-1 m-0 mt-2">
                    {resident.email && (
                      <div className="flex flex-col">
                        <dt className="text-[10px] font-bold tracking-wider uppercase text-gray-400">Email</dt>
                        <dd className="m-0 mt-0.5 text-sm font-semibold text-gray-800 break-all">{resident.email}</dd>
                      </div>
                    )}
                    {resident.phone_number && (
                      <div className="flex flex-col">
                        <dt className="text-[10px] font-bold tracking-wider uppercase text-gray-400">Phone</dt>
                        <dd className="m-0 mt-0.5 text-sm font-semibold text-gray-800 break-all">{resident.phone_number}</dd>
                      </div>
                    )}
                    {resident.age != null && (
                      <div className="flex flex-col">
                        <dt className="text-[10px] font-bold tracking-wider uppercase text-gray-400">Age</dt>
                        <dd className="m-0 mt-0.5 text-sm font-semibold text-gray-800">{resident.age}</dd>
                      </div>
                    )}
                    {resident.gender && (
                      <div className="flex flex-col">
                        <dt className="text-[10px] font-bold tracking-wider uppercase text-gray-400">Sex</dt>
                        <dd className="m-0 mt-0.5 text-sm font-semibold text-gray-800">
                          {resident.gender.charAt(0).toUpperCase() + resident.gender.slice(1).toLowerCase()}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  <button
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-white font-bold cursor-pointer transition-all duration-150 active:translate-y-0.5 disabled:cursor-wait disabled:opacity-70 bg-blue-600 hover:bg-blue-700 shadow-sm"
                    disabled={busyId === resident.id}
                    onClick={() => handleStatusChange(resident.id, "approve")}
                  >
                    {busyId === resident.id ? "Working…" : "Approve"}
                  </button>
                  <button
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-white font-bold cursor-pointer transition-all duration-150 active:translate-y-0.5 disabled:cursor-wait disabled:opacity-70 bg-red-600 hover:bg-red-700 shadow-sm"
                    disabled={busyId === resident.id}
                    onClick={() => handleStatusChange(resident.id, "reject")}
                  >
                    {busyId === resident.id ? "Working…" : "Reject"}
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
