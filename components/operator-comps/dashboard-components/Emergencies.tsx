"use client"

import * as React from "react"
import { EmergencyItem } from "./EmergencyItem"
import  MapWrapper  from "../map/MapWrapper"
import { ChevronRight, ChevronLeft } from "lucide-react"

type TabId = "pending" | "active"

const PAGE_SIZE = 10

// replace these with your real data @agoncillo
const pendingItems = Array.from({ length: 12 }, (_, i) => ({ id: i }))
const activeItems = Array.from({ length: 3 }, (_, i) => ({ id: i }))

export function EmergenciesScreen() {
    const tabClass = "bg-gray-100/0 flex font-bold text-lg w-25 h-full justify-center items-center cursor-pointer"
    const tabContainerClass = `shrink-0 mt-7
    flex flex-row items-center gap-5 bg-white rounded-lg w-full h-15 px-7 shadow-lg/5
    bg-linear-to-b from-blue-900/10 to-[rgb(35,35,184)]/10 border-gray-300 border-b-2 border-r-2
    `
    // dont judge
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

    const [activeTab, setActiveTab] = React.useState<TabId>("pending")
    const [page, setPage] = React.useState(1)

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

    return (
        <div className="flex p-7 flex-col items-center h-screen w-full">

            <div className="h-4/10 w-full bg-gray-200 rounded-lg shadow-md/10">
                <MapWrapper />
            </div>

            {/* TAB ITEMS */}

            <div className={tabContainerClass}>
                <p className={getTabClass("pending")} onClick={() => changeTab("pending")}>Pending</p>
                <p className={getTabClass("active")} onClick={() => changeTab("active")}>Active</p>
                <div className="absolute right-10 flex flex-row">
                    <button
                        className={navButtonClass}
                        disabled={currentPage === 1}
                        onClick={() => setPage(currentPage - 1)}
                    >
                        <ChevronLeft size={20} className="text-gray-400" strokeWidth={2.5} />
                    </button>
                    <p  className="w-7 text-center">{currentPage}</p>
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
                {pagedItems.map((item) => (
                    <EmergencyItem key={item.id} status={activeTab} />
                ))}
            </div>
        </div>
    )
}