"use client";

import {useEffect, useState} from "react";
import {createClient} from "@/utils/supabase/client";

type Resident = {
    id: number;
    first_name: string;
    last_name: string;
    suffix: string;
    phone: string;
    age: number;
    sex: string;
    email: string;

}

export default function PendingResidentsPage() {
    const supabase = createClient();

    const [residents, setResidents] = useState<Resident[]>([]);
    const [activeResident, setActiveResident] = useState<Resident | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch pending residents from the database
    const fetchPendingResidents = async () => {
        try {
            const {data, error} = await supabase
                .from("tbl_resident")
                .select("*")
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

    // Call the fetch function when the component mounts
    useEffect(() => {
        fetchPendingResidents();
    }, []);

    if (loading) {
        return <p>Loading pending residents...</p>;
    }
    return (
        <main>
        <h1>Pending Residents</h1>
            {residents.map((resident) => (
                 (
                    <div key={resident.id}>
                    <h1>Resident: {resident.first_name} {resident.last_name}</h1>
                    <button>Approve</button>
                    <button>Reject</button>
                    </div>
                ) 
            ))}
        <h1>Resident Details</h1>

        </main>
    );
}