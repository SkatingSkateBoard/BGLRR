"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { approveResident, rejectResident } from "./actions";

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

export default function PendingResidentsPage() {
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
    <main className="min-h-screen p-5 sm:p-8 md:p-12 bg-[#f4eee1] bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.6),transparent_45%)] text-[#2b2214]">
      <section className="p-5 sm:p-8 md:p-10 border border-white rounded-[1.5rem] bg-gradient-to-br from-[#f8f4ec] to-[#ded6c8] shadow-[10px_12px_24px_rgba(73,59,39,0.15),-6px,-6px_16px_#fff,inset_1px_1px_0_rgba(255,255,255,0.75)]">
        <h1 className="m-0 mb-6 text-2xl sm:text-3xl font-extrabold tracking-wide text-[#2b2214]">
          Pending Residents
        </h1>

        {loading ? (
          <p className="m-0 font-semibold text-[#736652]">Loading pending residents...</p>
        ) : residents.length === 0 ? (
          <p className="m-0 p-6 rounded-2xl text-center font-semibold text-[#736652] bg-gradient-to-br from-[#e1d9cb] to-[#efe9dd] shadow-[inset_3px_3px_7px_rgba(73,59,39,0.08),inset_-2px_-2px_5px_rgba(255,255,255,0.7)]">
            No pending residents found.
          </p>
        ) : (
          <section>
            <h2 className="flex items-center gap-2 m-0 mb-4 text-ece font-extrabold text-[#2b2214]">
              Pending Registrations{" "}
              <span className="min-w-[1.7rem] px-2 py-0.5 rounded-full text-center text-xs font-black text-[#736652] bg-gradient-to-br from-[#d8d0c2] to-[#ece6da] shadow-[inset_2px_2px_4px_rgba(73,59,39,0.08),inset_-1px_-1px_2px_rgba(255,255,255,0.7)]">
                {residents.length}
              </span>
            </h2>

            {residents.map((resident) => (
              <article
                key={resident.id}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 p-5 border border-white rounded-2xl bg-gradient-to-br from-[#fbf8f1] to-[#ded7ca] shadow-[7px_7px_16px_rgba(73,59,39,0.15),-5px_-5px_14px_#fff,inset_1px_1px_0_rgba(255,255,255,0.7)]"
              >
                {/* Avatar */}
                <div
                  className="shrink-0 w-14 h-14 grid place-items-center rounded-full text-lg font-black tracking-wider text-[#2e4a9e] bg-[radial-gradient(circle_at_35%_28%,#f3eee4,#d3cabb)] shadow-[inset_0_3px_6px_rgba(73,59,39,0.28),inset_0_-2px_3px_rgba(255,255,255,0.55),0_1px_0_rgba(255,255,255,0.7)]"
                  aria-hidden="true"
                >
                  {`${resident.first_name?.[0] ?? ""}${resident.last_name?.[0] ?? ""}`.toUpperCase()}
                </div>

                {/* Info block */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 text-base font-extrabold text-[#2b2214]">
                      {resident.first_name} {resident.last_name}
                      {resident.suffix ? ` ${resident.suffix}` : ""}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase text-[#8a5a06] bg-gradient-to-br from-[#f0dba5] to-[#e6c978] shadow-[inset_1px_1px_3px_rgba(120,80,0,0.25),inset_-1px_-1px_2px_rgba(255,255,255,0.55)]">
                      Pending
                    </span>
                  </div>

                  <dl className="flex flex-wrap gap-x-6 gap-y-1 m-0 mt-2">
                    {resident.email && (
                      <div className="flex flex-col">
                        <dt className="text-[10px] font-bold tracking-wider uppercase text-[#736652]">Email</dt>
                        <dd className="m-0 mt-0.5 text-sm font-semibold text-[#2b2214] break-all">{resident.email}</dd>
                      </div>
                    )}
                    {resident.phone_number && (
                      <div className="flex flex-col">
                        <dt className="text-[10px] font-bold tracking-wider uppercase text-[#736652]">Phone</dt>
                        <dd className="m-0 mt-0.5 text-sm font-semibold text-[#2b2214] break-all">{resident.phone_number}</dd>
                      </div>
                    )}
                    {resident.age != null && (
                      <div className="flex flex-col">
                        <dt className="text-[10px] font-bold tracking-wider uppercase text-[#736652]">Age</dt>
                        <dd className="m-0 mt-0.5 text-sm font-semibold text-[#2b2214]">{resident.age}</dd>
                      </div>
                    )}
                    {resident.gender && (
                      <div className="flex flex-col">
                        <dt className="text-[10px] font-bold tracking-wider uppercase text-[#736652]">Sex</dt>
                        <dd className="m-0 mt-0.5 text-sm font-semibold text-[#2b2214]">
                          {resident.gender.charAt(0).toUpperCase() + resident.gender.slice(1).toLowerCase()}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  <button
                    className="flex-1 sm:flex-initial px-4 py-2.5 border border-[#1d347b] rounded-xl text-white font-bold cursor-pointer transition-all duration-150 active:translate-y-0.5 active:shadow-[inset_2px_3px_6px_rgba(0,0,0,0.3)] disabled:cursor-wait disabled:opacity-70 bg-gradient-to-br from-[#405aa9] to-[#2e4a9e] shadow-[3px_4px_8px_rgba(73,59,39,0.15),inset_1px_1px_0_rgba(255,255,255,0.3)] hover:-translate-y-px"
                    disabled={busyId === resident.id}
                    onClick={() => handleStatusChange(resident.id, "approve")}
                  >
                    {busyId === resident.id ? "Working…" : "Approve"}
                  </button>
                  <button
                    className="flex-1 sm:flex-initial px-4 py-2.5 border border-[#842e29] rounded-xl text-white font-bold cursor-pointer transition-all duration-150 active:translate-y-0.5 active:shadow-[inset_2px_3px_6px_rgba(0,0,0,0.3)] disabled:cursor-wait disabled:opacity-70 bg-gradient-to-br from-[#c15b51] to-[#a83a32] shadow-[3px_4px_8px_rgba(73,59,39,0.15),inset_1px_1px_0_rgba(255,255,255,0.3)] hover:-translate-y-px"
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
