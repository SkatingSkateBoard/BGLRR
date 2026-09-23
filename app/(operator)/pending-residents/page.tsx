"use client";

import {useEffect, useState} from "react";
import {createClient} from "@/utils/supabase/client";


export default async function PendingResidentsPage() {
    const supabase = createClient();

    const [residents, setResidents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch pending residents from the database
    const fetchPendingResidents = async () => {
        try {
            const {data, error} = await supabase
                .from("tbl_resident")
                .select("*")
                .eq("status", "PENDING");

            if (error) {
                console.error("Error fetching pending residents:", error);
            } else {
                setResidents(data as any);
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

    if (residents.length === 0) {
        return <p>No pending residents found.</p>;
    }
    
    return (
        <main>
        <h1>Pending Residents</h1>

        </main>
    );
}