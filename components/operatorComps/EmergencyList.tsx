"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type EmergencyRequest = {
  id: number;
  resident: {
    id: number;
    first_name: string;
  };
  emerg_category: string;
};

export default function EmergencyList() {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;

    async function setupRealtime() {
      console.log("Loading emergency requests...");
      //FETCH EXISTING REQUEST
      const { data, error } = await supabase
        .from("tbl_emergency_req")
        .select("*, resident:tbl_resident(id, first_name)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading emergencies:", error);
      } else {
        setRequests((data ?? []) as EmergencyRequest[]);
      }
      setLoading(false);


      //SET CHANNEL 
      channel = supabase
        .channel("operator-emergency-requests")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "tbl_emergency_req" },
          async (payload) => {
            const residentId = payload.new.resident_id; 


            const { data: residentData, error: relationError } = await supabase
              .from("tbl_resident")
              .select("id, first_name")
              .eq("id", residentId)
              .single();

            if (relationError) {
              console.error("Could not fetch resident details:", relationError);
              return;
            }
            const newRequest: EmergencyRequest = {
              id: payload.new.id,
              emerg_category: payload.new.emerg_category,
              resident: {
                id: residentData.id,
                first_name: residentData.first_name,
              },
            };

            setRequests((currentRequests) => {
              if (currentRequests.some((req) => req.id === newRequest.id)) {
                return currentRequests;
              }
              return [newRequest, ...currentRequests];
            });
          }
        )
        .subscribe();
    }

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <p>Loading emergency requests...</p>;

  return (
    <section>
      <h2>Emergency Requests</h2>
      {requests.length === 0 ? (
        <p>No emergency requests yet.</p>
      ) : (
        <div>
          {requests.map((request) => (
            <div key={request.id} style={{ border: "1px solid #ccc", margin: "10px", padding: "10px" }}>
              <h2>Requester First Name: {request.resident?.first_name ?? "Unknown"}</h2>
              <h3>Category: {request.emerg_category}</h3>
              <p>Resident ID: {request.resident?.id}</p>
              <button className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">Accept Call</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
