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
    roomId: string;
    livekitToken: string;
  }>;
};

export default function EmergencyList({
  onAcceptCall,
}: EmergencyListProps) {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function fetchExistingRequests() {
      const { data, error } = await supabase
        .from("tbl_emergency_req")
        .select(
          "*, resident:tbl_resident(id, first_name, middle_name, last_name, suffix)"
        )
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
          if (
            payload.eventType === "UPDATE" ||
            payload.eventType === "DELETE"
          ) {
            const updatedRow = payload.new as {
              status?: string;
            };

            if (
              payload.eventType === "DELETE" ||
              updatedRow.status !== "PENDING"
            ) {
              setRequests((current) =>
                current.filter((request) => request.id !== payload.old.id)
              );
            }

            return;
          }

          if (payload.eventType === "INSERT") {
            const residentId = payload.new.resident_id;

            const { data: resident, error } = await supabase
              .from("tbl_resident")
              .select("id, first_name, middle_name, last_name, suffix")
              .eq("id", residentId)
              .single();

            if (error || !resident) {
              console.error("Could not fetch resident details:", error);
              return;
            }

            const newRequest: EmergencyRequest = {
              id: payload.new.id,
              emerg_category: payload.new.emerg_category,
              status: payload.new.status,
              resident,
            };

            if (newRequest.status === "PENDING") {
              setRequests((current) => {
                if (
                  current.some((request) => request.id === newRequest.id)
                ) {
                  return current;
                }

                return [newRequest, ...current];
              });
            }
          }
        }
      )
      .subscribe();

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

        if (result.success) {
          router.push(
            `/operator/call/${result.roomId}?token=${result.livekitToken}`
          );
        }
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "Error taking this request"
        );
      }
    });
  }

  if (loading) {
    return <p>Loading emergency requests...</p>;
  }

  if (requests.length === 0) {
    return <p>No pending emergency requests.</p>;
  }

  return (
    <section>
      <h2>Active Requests</h2>

      {requests.map((request) => (
        <article key={request.id}>
          <p>Category: {request.emerg_category}</p>
          <p>ID: {request.id}</p>
          <p>Caller: {getFullName(request.resident)}</p>

          <button
            type="button"
            disabled={isPending}
            onClick={() => handleAccept(request.id)}
          >
            {isPending ? "Connecting..." : "Accept Call"}
          </button>
        </article>
      ))}
    </section>
  );
}
