"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation"; // ✅ Verified App Router import
import { createClient } from "@/utils/supabase/client";

type EmergencyRequest = {
  id: number;
  resident: {
    id: number;
    first_name: string;
    middle_name: string;
    last_name: string;
    suffix: string;
  };
  emerg_category: string;
  status: string;
};

type Resident = {
  id: number; 
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
}

type EmergencyListProps = {
  onAcceptCall: (requestId: number) => Promise<{ success: boolean; roomId: string; livekitToken: string }>;
};

 

export default function EmergencyList({ onAcceptCall }: EmergencyListProps) {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();


    async function fetchExistingRequests() {
      console.log("Loading emergency requests...");
      const { data, error } = await supabase
        .from("tbl_emergency_req")
        .select("*, resident:tbl_resident(id, first_name, middle_name, last_name, suffix)")
        .eq("status", "PENDING") 
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading emergencies:", error);
      } else {
        setRequests((data ?? []) as EmergencyRequest[]);
      }
      setLoading(false);
    }

    fetchExistingRequests();

    // 2. Synchronously mount the Realtime channel (Fixes subscription sequence crash)
    const channel = supabase
      .channel("operator-emergency-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tbl_emergency_req" },
        async (payload) => {
          if (payload.eventType === "UPDATE" || payload.eventType === "DELETE") {
            const updatedRow = payload.new as any;
            if (updatedRow?.status !== "PENDING") {
              setRequests((current) => current.filter((req) => req.id !== payload.old.id));
            }
            return;
          }

          if (payload.eventType === "INSERT") {
            const residentId = payload.new.resident_id; 

            const { data: residentData, error: relationError } = await supabase
              .from("tbl_resident")
              .select("id, first_name, middle_name, last_name,suffix")
              .eq("id", residentId)
              .single();

            if (relationError) {
              console.error("Could not fetch resident details:", relationError);
              return;
            }

            const newRequest: EmergencyRequest = {
              id: payload.new.id,
              emerg_category: payload.new.emerg_category,
              status: payload.new.status,
              resident: {
                id: residentData.id,
                first_name: residentData.first_name,
                middle_name: residentData.middle_name,
                last_name: residentData.last_name,
                suffix: residentData.suffix
              },
            };

            if (newRequest.status === "PENDING") {
              setRequests((currentRequests) => {
                if (currentRequests.some((req) => req.id === newRequest.id)) {
                  return currentRequests;
                }
                return [newRequest, ...currentRequests];
              });
            }
          }
        }
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAction = (requestId: number) => {
    startTransition(async () => {
      try {
        const result = await onAcceptCall(requestId);
        if (result.success) {
          router.push(`/operator/call/${result.roomId}?token=${result.livekitToken}`);
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error taking this request");
      }
    });
  };

  if (loading) return <p className="text-zinc-400">Loading emergency requests...</p>;
  
  const getFullName = (resident : Resident) => {
    if (!resident) return "Unknown Resident";
    
    const { first_name, middle_name, last_name, suffix } = resident;
    
    return [
      first_name,
      middle_name ? `${middle_name.trim()}` : "",
      last_name,
      suffix ? `${suffix.trim()}` : ""
    ].filter(Boolean).join(" "); // Joins fields with a single space and ignores empty/null values
  };

  return (
    <section className="max-w-4xl">
      <h2 className="text-xl font-semibold mb-4 text-zinc-200">Active Requests Feed</h2>
      {requests.length === 0 ? (
        <p className="text-zinc-500 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
          No pending emergency lines active.
        </p>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div 
              key={request.id} 
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="bg-red-600/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                    {request.emerg_category}
                  </span>
                  <span className="text-xs font-mono text-zinc-500">ID: #{request.id}</span>
                </div>
                <h3 className="text-lg font-medium mt-2">
                  Caller: {getFullName(request.resident)}
                </h3>
              </div>

              <button
                disabled={isPending}
                onClick={() => handleAction(request.id)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg shadow-md transition-colors text-sm"
              >
                {isPending ? "Connecting..." : "Accept Call"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
