"use client"

import * as React from "react"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { EmergencyItem } from "./EmergencyItem"
import MapWrapper from "../map/MapWrapper"
import { createClient } from "@/utils/supabase/client" 
import { acceptEmergencyRequest } from "@/app/(Operator-Browser)/operator/dashboard/actions" 

type TabId = "pending" | "active"

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
  created_at?: string;
};


const PAGE_SIZE = 10
export function EmergenciesScreen() {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const tabContainerClass = `shrink-0 mt-7
    flex flex-row items-center gap-5 bg-white rounded-lg w-full h-15 px-7 shadow-lg/5
    bg-linear-to-b from-blue-900/10 to-[rgb(35,35,184)]/10 border-gray-300 border-b-2 border-r-2
    `
    const emergencyHeaderContainerClass =
        `flex justify-start shrink-0
        rounded-t-lg bg-white w-full h-12 mt-7 items-center divide-x-2 divide-gray-200
        bg-linear-to-t from-blue-900/5 to-white border-gray-300 border-b-2 border-r-2 shadow-lg/3
        px-7
        `

    const navButtonClass = `
    mx-2 cursor-pointer disabled:cursor-default disabled:opacity-40 shrink-0
    `
    const headerTextClass = "text-gray-400"
    const emergencyContainerClass = "flex flex-col flex-1 min-h-0 w-full overflow-y-auto"

    const [requests, setRequests] = React.useState<EmergencyRequest[]>([])
    const [loading, setLoading] = React.useState<boolean>(true)
    const [activeTab, setActiveTab] = React.useState<TabId>("pending")
    const [currentPage, setPage] = React.useState(1)
    const supabase = createClient();

    React.useEffect(() => {
    async function fetchExistingRequests() {
      const { data, error } = await supabase
        .from("tbl_emergency_req")
        .select("*, resident:tbl_resident(id, first_name, middle_name, last_name, suffix)")
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

            if (updatedStatus) {
              setRequests((current) =>
                current.map((req) =>
                  req.id === targetId ? { ...req, status: updatedStatus } : req
                )
              );
            }
            return;
          }

          if (payload.eventType === "INSERT") {
            const newRow = payload.new;
            if (!newRow) return;

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
  // Filter items dynamically based on tabs
  const pendingItems = requests.filter(req => req.status.toUpperCase() === "PENDING")
  const activeItems = requests.filter(req => req.status.toUpperCase() === "ACTIVE")
  const currentTabItems = activeTab === "pending" ? pendingItems : activeItems

  // Calculate Pagination values
  const totalPages = Math.max(1, Math.ceil(currentTabItems.length / PAGE_SIZE))
  const pagedItems = currentTabItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function changeTab(tab: TabId) {
    setActiveTab(tab)
    setPage(1) // Reset page on tab shift
  }

  function getTabClass(tab: TabId) {
    const base = "bg-gray-100/0 flex font-bold text-lg w-30 h-full justify-center items-center cursor-pointer border-b-2"
    return tab === activeTab 
      ? `${base} border-blue-600 text-blue-600` 
      : `${base} border-transparent text-gray-500`
  }

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
          // 2. Call the Server Action directly here
          const result = await acceptEmergencyRequest(requestId);

          if (!result.success) {
            alert(`Could not claim request: ${result.error}`);
            return;
          }

          if (result.success && result.roomId) {
            router.push(`/operator/call/${result.roomId}?token=${result.livekitToken}`);
          }
        } catch (error) {
          alert(error instanceof Error ? error.message : "Error taking this request");
        }
      });
    }
    
    return (
        <div className="flex p-7 flex-col items-center h-screen w-full">

            <div className="h-4/10 w-full shrink-0 overflow-hidden rounded-lg bg-gray-200 shadow-md/10">
                <MapWrapper />
            </div>

            {/* TAB ITEMS */}
            <div className={tabContainerClass}>
                <p className={getTabClass("pending")} onClick={() => changeTab("pending")}>
                    Pending ({pendingItems.length})
                </p>
                <p className={getTabClass("active")} onClick={() => changeTab("active")}>
                    Active ({activeItems.length})
                </p>
                <div className="absolute right-10 flex flex-row items-center">
                    <button
                        className={navButtonClass}
                        disabled={currentPage === 1}
                        onClick={() => setPage(currentPage - 1)}
                    >
                        <ChevronLeft size={20} className="text-gray-400" strokeWidth={2.5} />
                    </button>
                    <p className="w-7 text-center">{currentPage}</p>
                    <button
                        className={navButtonClass}
                        disabled={currentPage === totalPages}
                        onClick={() => setPage(currentPage + 1)}
                    >
                        <ChevronRight size={20} className="text-gray-400" strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* EMERGENCY HEADER */}
            <div className={emergencyHeaderContainerClass}>
                <p className={`${headerTextClass} text-start w-50`}>Date</p>
                <p className={`${headerTextClass} text-start w-70 px-10`}>Status</p>
                <p className={`${headerTextClass} text-start w-70 px-10`}>Name</p>
            </div>

            {/* EMERGENCY CONTAINER */}
            <div className={emergencyContainerClass}>
                {loading ? (
                    <div className="p-7 text-center text-gray-500 font-semibold">Loading data...</div>
                ) : pagedItems.length === 0 ? (
                    <div className="p-7 text-center text-gray-400">No requests found inside this view.</div>
                ) : (
                    <div className="flex flex-col w-full divide-y divide-gray-100">
                        {pagedItems.map((item) => (
                            <div key={item.id} className="p-4 flex justify-between items-center bg-white hover:bg-gray-50">
                                <div className="flex w-full items-center">
                                     <p className="w-50 text-sm text-gray-600">{item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}</p>
                                     <p className="w-70 px-10 font-medium text-sm">{item.status}</p>
                                     <p className="w-70 px-10 text-sm">{getFullName(item.resident)}</p>
                                </div>
                                {item.status.toUpperCase() === "PENDING" && (
                                    <button 
                                        disabled={isPending}
                                        onClick={() => handleAccept(item.id)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {isPending ? "Accepting..." : "Accept"}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
