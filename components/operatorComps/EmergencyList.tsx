"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Resident = {
  id: number;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
};

type EmergencyRequest = {
  id: number;
  resident: Resident;
  emerg_category: string;
  status: string;
};

type EmergencyListProps = {
  onAcceptCall: (
    requestId: number
  ) => Promise<{
    success: boolean;
    roomId?: string;
    livekitToken?: string;
    error: string | null;
  }>;
};

const supabase = createClient();

export default function EmergencyList({ onAcceptCall }: EmergencyListProps) {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

    useEffect(() => {
    async function fetchExistingRequests() {
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

    // Establish dynamic subscriber channel
    const channel = supabase
      .channel("operator-emergency-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tbl_emergency_req",
        },
        async (payload) => {
          console.log("Stream received update payload:", payload);

          if (payload.eventType === "DELETE") {
            const targetId = payload.old?.id;
            if (targetId) {
              setRequests((current) => current.filter((req) => req.id !== targetId));
            }
            return;
          }

          if (payload.eventType === "UPDATE") {
            const targetId = payload.new?.id;
            const updatedStatus = payload.new?.status;

            if (updatedStatus && updatedStatus !== "PENDING") {
              setRequests((current) => current.filter((req) => req.id !== targetId));
            }
            return;
          }

         
          if (payload.eventType === "INSERT") {
            const newRow = payload.new;
            if (!newRow || newRow.status !== "PENDING") return;

            try {
              const targetResidentId = newRow.resident_id; 

              if (!targetResidentId) {
                console.error("Insert payload missing resident relation key field.");
                return;
              }

              const { data: resident, error: resError } = await supabase
                .from("tbl_resident")
                .select("id, first_name, middle_name, last_name, suffix")
                .eq("id", targetResidentId)
                .single();

              if (resError || !resident) {
                console.error("Could not fetch profile metadata details:", resError);
                return;
              }

              const newRequest: EmergencyRequest = {
                id: newRow.id,
                emerg_category: newRow.emerg_category,
                status: newRow.status,
                resident,
              };

              setRequests((current) => {
                if (current.some((req) => req.id === newRequest.id)) return current;
                return [newRequest, ...current];
              });
            } catch (err) {
              console.error("Asynchronous error inside row processing context:", err);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("Supabase Realtime Channel Status changed:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  function getFullName(resident: Resident) {
    return [
      resident.first_name,
      resident.middle_name?.trim(),
      resident.last_name,
      resident.suffix?.trim(),
    ]
      .filter(Boolean)
      .join(" ");
  }

  function handleAccept(requestId: number) {
    startTransition(async () => {
      try {
        const result = await onAcceptCall(requestId);

         if (!result.success) {
          alert(`Could not claim request: ${result.error}`);
          return;
        }

        if (result.success) {
          router.push(`/operator/call/${result.roomId}?token=${result.livekitToken}`);
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error taking this request");
      }
    });
  }

  if (loading) return <p>Loading emergency requests...</p>;
  if (requests.length === 0) return <p>No pending emergency requests.</p>;

  return (
    <section>
      <h2>Active Requests</h2>
      {requests.map((request) => (
        <article key={request.id}>
          <p>Category: {request.emerg_category}</p>
          <p>ID: {request.id}</p>
          <p>Caller: {getFullName(request.resident)}</p>
          <button type="button" disabled={isPending} onClick={() => handleAccept(request.id)}>
            {isPending ? "Connecting..." : "Accept Call"}
          </button>
        </article>
      ))}
    </section>
  );
}
