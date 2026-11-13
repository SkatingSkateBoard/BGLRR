"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { approveResident, rejectResident } from "@/app/actions/verify";

type AddressInfo = {
  id: number;
  has_permanent_address: boolean;
  proof_of_accommodation: string | null;
  current_address: string | null;
  reason: string | null;
  specify_reason: string | null;
};

type MedicalInfo = {
  id: number;
  has_history: boolean;
  medical_description: string | null;
  emergency_person: string | null;
  emergency_contact_number: string | null;
};

type Resident = {
  id: number;
  first_name: string;
  last_name: string;
  suffix: string;
  phone_number: string;
  age: number;
  gender: string;
  email: string;
  address_info: AddressInfo | null;
  medical_info: MedicalInfo | null;
};

export function RegisteredScreen() {
  const supabase = createClient();

  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [reason, setReason] = useState<string>("");
  const [isRejecting, setIsRejecting] = useState(false);

  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

   useEffect(() => {
    let isMounted = true;
    setProofUrl(null); // Clear the previous resident's image immediately

    const filePath = selectedResident?.address_info?.proof_of_accommodation;
    if (!filePath) return;

    const fetchSignedUrl = async () => {
      setLoadingProof(true);
      try {
        const { data, error } = await supabase.storage
          .from("accommodation-photos")
          .createSignedUrl(filePath, 3600); // Valid for 1 hour

        if (error) throw error;
        if (isMounted && data?.signedUrl) {
          setProofUrl(data.signedUrl);
        }
      } catch (err) {
        console.error("Error signing proof URL:", err);
      } finally {
        if (isMounted) setLoadingProof(false);
      }
    };

    fetchSignedUrl();

    return () => {
      isMounted = false; // Prevents race conditions if operator clicks quickly between residents
    };
  }, [selectedResident]);

  const fetchPendingResidents = async () => {
    try {
      const { data, error } = await supabase
        .from("tbl_resident")
        .select(`
          *,
          address_info (*),
          medical_info (*)
        `)
        .eq("status", "pending");

      if (error) {
        console.error("Error fetching pending residents:", error);
      } else {
        const flattenedData = (data || []).map(({ address_info, medical_info, ...resident }) => ({
          ...resident,
          address_info: address_info[0] || null,
          medical_info: medical_info[0] || null,
        }));

        setResidents(flattenedData);
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

  const handleStatusChange = async (id: number, actionType: "approve" | "reject", reason?: string) => {
    setBusyId(id);
    try {
      if (actionType === "approve") {
        await approveResident(id);
      } else {
        await rejectResident(id, reason || "");
      }
      setResidents((prev) => prev.filter((r) => r.id !== id));
      if (selectedResident?.id === id) {
        setSelectedResident(null);
        setIsRejecting(false);
        setReason("");
      }
    } catch (err) {
      alert(`Failed to complete action: ${err}`);
    } finally {
      setBusyId(null);
    }
  };

   return (
    <main className="min-h-screen p-5 sm:p-8 md:p-12 bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Resident Registry List */}
        <section className="flex-1 p-5 sm:p-8 border border-gray-200 rounded-2xl bg-white shadow-sm">
          <h1 className="m-0 mb-6 text-2xl sm:text-3xl font-extrabold tracking-wide text-gray-900">
            Pending Residents
          </h1>

          {loading ? (
            <p className="m-0 font-semibold text-gray-500">Loading pending residents...</p>
          ) : residents.length === 0 ? (
            <p className="m-0 p-6 rounded-xl text-center font-semibold text-gray-500 bg-white border border-gray-100 shadow-sm">
              No pending residents found.
            </p>
          ) : (
            <div>
              <h2 className="flex items-center gap-2 m-0 mb-4 font-extrabold text-gray-900">
                Pending Registrations{" "}
                <span className="min-w-[1.7rem] px-2 py-0.5 rounded-full text-center text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200">
                  {residents.length}
                </span>
              </h2>

              {residents.map((resident) => (
                <article
                  key={resident.id}
                  onClick={() => {
                    setSelectedResident(resident);
                    setIsRejecting(false);
                    setReason("");
                  }}
                  className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 p-5 border rounded-xl bg-white shadow-sm cursor-pointer transition-all hover:border-blue-400 ${
                    selectedResident?.id === resident.id ? "border-blue-500 ring-2 ring-blue-500/10" : "border-gray-200"
                  }`}
                >
                  <div className="shrink-0 w-12 h-12 grid place-items-center rounded-full text-sm font-black text-blue-600 bg-gray-50 border border-gray-200">
                    {`${resident.first_name?.[0] ?? ""}${resident.last_name?.[0] ?? ""}`.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="m-0 text-base font-extrabold text-gray-900">
                      {resident.first_name} {resident.last_name}
                    </h3>
                    <p className="m-0 mt-1 text-xs text-gray-500 truncate">{resident.email || "No email"}</p>
                  </div>
                  <span className="text-xs font-bold text-blue-600">Review Application →</span>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="w-full lg:w-[450px] shrink-0">
          {selectedResident ? (
            <div className="sticky top-6 p-6 border border-gray-200 rounded-2xl bg-white shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase text-amber-700 bg-amber-50 border border-amber-200">
                    Full Profile
                  </span>
                  <h2 className="m-0 mt-2 text-xl font-black text-gray-900">
                    {selectedResident.first_name} {selectedResident.last_name}
                    {selectedResident.suffix ? ` ${selectedResident.suffix}` : ""}
                  </h2>
                </div>
                <button 
                  onClick={() => {
                    setSelectedResident(null);
                    setIsRejecting(false);
                    setReason("");
                  }} 
                  className="text-xs font-bold text-gray-400 hover:text-gray-600"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Resident Info</h4>
                  <ul className="list-none p-0 m-0 space-y-1 text-sm font-semibold text-gray-800">
                    <li><span className="text-gray-400 font-normal">Age:</span> {selectedResident.age ?? "N/A"}</li>
                    <li><span className="text-gray-400 font-normal">Sex:</span> {selectedResident.gender || "N/A"}</li>
                    <li><span className="text-gray-400 font-normal">Phone:</span> {selectedResident.phone_number || "N/A"}</li>
                  </ul>
                </div>
                
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Address Info</h4>
                  {selectedResident.address_info ? (
                  <div className="space-y-2 text-sm font-semibold text-gray-800">
                    <p className="m-0"><span className="text-gray-400 font-normal">Current:</span> {selectedResident.address_info.current_address || "N/A"}</p>
                    <p className="m-0"><span className="text-gray-400 font-normal">Permanent:</span> {selectedResident.address_info.has_permanent_address ? "Yes" : "No"}</p>
                    
                    {selectedResident.address_info.proof_of_accommodation && (
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-400 font-normal">Proof of Accommodation:</span>
                        </div>

                        {loadingProof ? (
                          <div className="h-32 w-full rounded-lg bg-gray-100 animate-pulse flex items-center justify-center text-xs text-gray-400">
                            Loading document...
                          </div>
                        ) : proofUrl ? (
                          <img
                            src={proofUrl}
                            alt="Proof of Accommodation"
                            onClick={() => setIsLightboxOpen(true)}
                            title="Click to enlarge"
                            className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-gray-50 cursor-zoom-in hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          <p className="m-0 text-xs text-red-500">Unable to load document.</p>
                        )}
                      </div>
                    )}
                  </div>
                  ) : (
                    <p className="m-0 text-xs italic text-gray-400">No address details submitted.</p>
                  )}
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Medical History</h4>
                  {selectedResident.medical_info ? (
                    <div className="space-y-1 text-sm font-semibold text-gray-800">
                      <p className="m-0"><span className="text-gray-400 font-normal">History declared:</span> {selectedResident.medical_info.has_history ? "Yes" : "None"}</p>
                      {selectedResident.medical_info.medical_description && (
                        <p className="m-0 p-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700">{selectedResident.medical_info.medical_description}</p>
                      )}
                      <p className="m-0 pt-1"><span className="text-gray-400 font-normal">ICE Contact:</span> {selectedResident.medical_info.emergency_person || "N/A"}</p>
                      <p className="m-0"><span className="text-gray-400 font-normal">ICE Phone:</span> {selectedResident.medical_info.emergency_contact_number || "N/A"}</p>
                    </div>
                  ) : (
                    <p className="m-0 text-xs italic text-gray-400">No medical details submitted.</p>
                  )}
                </div>
              </div>
              {/* Action Buttons & Rejection Panel Form */}
              <div className="pt-4 border-t border-gray-100">
                {isRejecting ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-red-500 mb-1.5">
                        Reason for Rejection
                      </label>
                      <textarea
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Provide details on why this application was denied..."
                        className="w-full p-2.5 text-sm font-medium border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:border-red-400 focus:bg-white resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRejecting(false);
                          setReason("");
                        }}
                        className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={busyId === selectedResident.id || !reason.trim()}
                        onClick={() => handleStatusChange(selectedResident.id, "reject", reason)}
                        className="flex-1 py-2 rounded-xl text-white text-sm font-bold bg-red-600 hover:bg-red-700 disabled:opacity-50"
                      >
                        {busyId === selectedResident.id ? "Working…" : "Confirm Rejection"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      className="flex-1 px-4 py-2.5 rounded-xl text-white font-bold disabled:opacity-50 bg-blue-600 hover:bg-blue-700 shadow-sm"
                      disabled={busyId === selectedResident.id}
                      onClick={() => handleStatusChange(selectedResident.id, "approve")}
                    >
                      {busyId === selectedResident.id ? "Working…" : "Approve"}
                    </button>
                    <button
                      className="flex-1 px-4 py-2.5 rounded-xl text-white font-bold disabled:opacity-50 bg-red-600 hover:bg-red-700 shadow-sm"
                      disabled={busyId === selectedResident.id}
                      onClick={() => setIsRejecting(true)}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="sticky top-6 p-10 border-2 border-dashed border-gray-200 rounded-2xl text-center bg-white shadow-sm">
              <p className="m-0 text-sm font-semibold text-gray-400">
                Select a pending applicant from the list to display their full address and medical files.
              </p>
            </div>
          )}
        </section>

       {isLightboxOpen && proofUrl && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-xs cursor-zoom-out"
        >
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="fixed top-4 right-5 z-60 px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-semibold cursor-pointer border-0 shadow-lg"
            >
              ✕ Close
            </button>
            <img
              src={proofUrl}
              alt="Proof of Accommodation Full Size"
              onClick={(e) => e.stopPropagation()}
              className="w-[94vw] h-[88vh] object-contain rounded-lg cursor-default"
            />
          </div>
        </div>
        )}
      </div>
    </main>
  );
}

