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
}

export default function PendingResidentsPage() {
    const supabase = createClient();

    const [residents, setResidents] = useState<Resident[]>([]);
    const [loading, setLoading] = useState(true);

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
        try {
            if (actionType === "approve") {
                await approveResident(id);
            } else {
                await rejectResident(id);
            }

            setResidents((prevResidents) => prevResidents.filter((r) => r.id !== id));
        } catch (err) {
            alert(`Failed to complete action: ${err}`);
        }
    };

    if (loading) {
        return <p>Loading pending residents...</p>;
    }

    return (
        <main style={{ padding: "20px" }}>
            <h1>Pending Residents</h1>
            {residents.length === 0 ? (
                <p>No pending residents found.</p>
            ) : (
                residents.map((resident) => (
                    <div key={resident.id}>
                        <h3>Resident: {resident.first_name} {resident.last_name}</h3>
                        <p>Email: {resident.email}</p>
                        
                        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                            <button onClick={() => handleStatusChange(resident.id, "approve")}>Approve</button>
                            <button onClick={() => handleStatusChange(resident.id, "reject")}>Reject</button>
                        </div>
                    </div>
                ))
            )}
        </main>
    );
}
