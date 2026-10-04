"use client"

import * as React from "react";
import { Cross, UserSearch, AudioLines, Megaphone, ChartColumn, CalendarClock, Radio, LogOut } from "lucide-react";
import { SideBarItem } from "./SideBarItem";
import { EmergenciesScreen } from "./Emergencies";
import { RegisteredScreen } from "./Residents";
import { logout } from "@/app/actions/auth"; // 1. Update this to the actual path of your auth action file

type SectionId = "emergencies" | "history" | "residents" | "announcement" | "analytics" | "appointment";

export function DashboardSideBar() {
    const sideBarClass =
        `shadow-xl/10 bg-radial-[at_25%_40%] from-white to-blue-900/10 border-gray-400/70 border-r-2
        relative left-0 inset-x-0 h-screen w-75 flex flex-col shrink-0 overflow-hidden justify-between
        `; // Added 'justify-between' to stick the logout button to the bottom layout boundary
    const sideBarItemClass = "bg-[rgb(35,35,184)] w-full rounded-lg p-3 cursor-pointer flex flex-row";
    const headerSidebarClass = "flex flex-col justify-left p-7";
    const sideBarSectionTitleClass = "text-gray-500 text-sm font-semibold mb-3"

    const [selected, setSelected] = React.useState<SectionId>("emergencies");
    const [isLoggingOut, setIsLoggingOut] = React.useState(false); // Local feedback tracking state

    // Explicit execution block for handling Next.js server redirection cleanly
    async function handleLogout() {
        try {
            setIsLoggingOut(true);
            await logout();
        } catch (error) {
            console.error("Logout execution crash context:", error);
            setIsLoggingOut(false);
        }
    }

    return (
        <div className="flex flex-row h-screen w-full">
            <div className={`${sideBarClass}`}>
                
                {/* TOP WRAPPER PANEL FOR NAVIGATION LINK CONTENT */}
                <div className="z-20 overflow-y-auto flex-1">
                    <div className="flex flex-row items-center justify-center mt-4 ">
                        <img src="/new_icon_bgl.png" alt="BGL Logo" className="w-28 h-26 ml-2" />
                        <div className="text-lg font-bold">
                            Rapid Response Dashboard
                        </div>
                    </div>

                    {/* MANAGE */}
                    <div className={`${headerSidebarClass}`}>
                        <p className={sideBarSectionTitleClass}>Manage</p>
                        <SideBarItem id="emergencies" label="Emergencies" icon={Radio} selected={selected} onSelect={setSelected} itemClass={sideBarItemClass} />
                        <SideBarItem id="history" label="History" icon={AudioLines} selected={selected} onSelect={setSelected} itemClass={sideBarItemClass} />
                        <SideBarItem id="analytics" label="Analytics" icon={ChartColumn} selected={selected} onSelect={setSelected} itemClass={sideBarItemClass} />
                    </div>

                    {/* PENDING */}
                    <div className={`${headerSidebarClass}`}>
                        <p className={sideBarSectionTitleClass}>Pending</p>
                        <SideBarItem id="residents" label="Residents" icon={UserSearch} selected={selected} onSelect={setSelected} itemClass={sideBarItemClass} />
                        <SideBarItem id="appointment" label="Blotter Appointments" icon={CalendarClock} selected={selected} onSelect={setSelected} itemClass={sideBarItemClass} />
                    </div>

                    {/* TOOL */}
                    <div className={`${headerSidebarClass}`}>
                        <p className={sideBarSectionTitleClass}>Tools</p>
                        <SideBarItem id="announcement" label="Announcements" icon={Megaphone} selected={selected} onSelect={setSelected} itemClass={sideBarItemClass} />
                    </div>
                </div>

                {/* BOTTOM WRAPPER PANEL FOR LOGOUT CONTAINER */}
                <div className="p-7 z-20 border-t border-gray-200 bg-white/50 backdrop-blur-xs">
                    <button
                        type="button"
                        disabled={isLoggingOut}
                        onClick={handleLogout}
                        className="group w-full flex flex-row items-center gap-3 px-4 py-3 text-red-600 font-semibold text-sm rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
                    >
                        <LogOut size={18} className="text-red-500 group-hover:translate-x-0.5 transition-transform duration-200" strokeWidth={2.5} />
                        <span>{isLoggingOut ? "Logging out..." : "Sign Out"}</span>
                    </button>
                </div>

            </div>
            <DashboardSectionContent section={selected} />
        </div>
    )
}

function DashboardSectionContent({ section }: { section: SectionId }) {
    const contentClass = "bg-linear-to-r from-blue-900/5 to-white relative h-screen flex-1 flex flex-col";

    switch (section) {
        case "emergencies":
            return (
                <div className={contentClass}><EmergenciesScreen/></div>
            );
        case "residents":
            return (
                <div className={contentClass}><RegisteredScreen/></div>
            );
            
        default:
            return (
                <div className={`${contentClass} p-7`}>
                    <p className="text-xl font-bold">
                        To be started
                    </p>
                </div>
            )
    }
}
