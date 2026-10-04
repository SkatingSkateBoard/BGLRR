"use client"

import * as React from "react"
import { EmergencyItem } from "./EmergencyItem"
import MapWrapper from "../map/MapWrapper"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { createClient } from "@/utils/supabase/client" // Ensure you have this utility path configured
import { acceptEmergencyRequest } from "@/app/(Operator-Browser)/operator/dashboard/actions" // Replace with the real path to your server action file

type TabId = "pending" | "active"

// TypeScript type derived from your Supabase query targets
interface EmergencyRequest {
  id: number
  created_at: string
  status: "PENDING" | "ACTIVE" | string
  // Add other payload variables here if needed (e.g., user profile name joins)
  tbl_profiles?: {
    full_name: string
  } | null
}

const PAGE_SIZE = 10

export function EmergenciesScreen() {
    const tabClass = "bg-gray-100/0 flex font-bold text-lg w-25 h-full justify-center items-center cursor-pointer"
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

    // Real data state
    const [emergencies, setEmergencies] = React.useState<EmergencyRequest[]>([])
    const [loading, setLoading] = React.useState<boolean>(true)
    const [activeTab, setActiveTab] = React.useState<TabId>("pending")
    const [page, setPage] = React.useState(1)

    // Fetch emergencies from Supabase on component mount
    React.useEffect(() => {
        async function fetchEmergencies() {
            try {
                setLoading(true)
                const supabase = createClient()
                
                // Adjust your select parameters as needed based on your true table design
                const { data, error } = await supabase
                    .from("tbl_emergency_req")
                    .select("id, created_at, status") 
                    .order("created_at", { ascending: false })

                if (error) {
                    console.error("Error retrieving emergencies:", error.message)
                    return
                }

                if (data) {
                    setEmergencies(data as EmergencyRequest[])
                }
            } catch (err) {
                console.error("Unexpected error fetching data:", err)
            } finally {
                setLoading(false)
            }
        }

        fetchEmergencies()
    }, [])

    // Filter real items based on active workspace tab
    const pendingItems = emergencies.filter(item => item.status === "PENDING")
    const activeItems = emergencies.filter(item => item.status === "ACTIVE")

    const items = activeTab === "pending" ? pendingItems : activeItems
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
    const currentPage = Math.min(page, totalPages)
    const pagedItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    function changeTab(tab: TabId) {
        setActiveTab(tab)
        setPage(1)
    }

    function getTabClass(tab: TabId) {
        return `${tabClass} ${activeTab === tab
            ? "text-[rgb(35,35,184)] border-b-4 border-[rgb(35,35,184)]"
            : "text-gray-500 font-semibold border-b-4 border-transparent"
            }`
    }

    // Interactive handler function for your components to accept calls
    async function handleAcceptEmergency(requestId: number) {
        const result = await acceptEmergencyRequest(requestId)
        
        if (result.success) {
            // Local state mutation to dynamically update the UI without forced reload
            setEmergencies(prev => 
                prev.map(item => 
                    item.id === requestId ? { ...item, status: "ACTIVE" } : item
                )
            )
            // Optional: Route user or open LiveKit call using result.livekitToken / result.roomId
            console.log("Connected to LiveKit session:", result.livekitToken)
        } else {
            alert(result.error || "Action failed")
        }
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
                <div className="absolute right-10 flex flex-row">
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
                    pagedItems.map((item) => (
                        <EmergencyItem 
                            key={item.id} 
                            item={item} // Sent whole item data package to sub-element
                            status={activeTab} 
                            onAccept={() => handleAcceptEmergency(item.id)}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
