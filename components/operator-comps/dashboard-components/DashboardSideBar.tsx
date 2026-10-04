"use client"

import * as React from "react";
import { Cross, UserSearch, AudioLines, Megaphone, ChartColumn, CalendarClock, Radio } from "lucide-react";
import { SideBarItem } from "./SideBarItem";
import { EmergenciesScreen } from "./Emergencies";
import { RegisteredScreen } from "./Residents";

type SectionId = "emergencies" | "history" | "residents" | "announcement" | "analytics" | "appointment";

export function DashboardSideBar() {
    const sideBarClass =
        `shadow-xl/10 bg-radial-[at_25%_40%] from-white to-blue-900/10 border-gray-400/70 border-r-2
        relative left-0 inset-x-0 h-screen w-75 flex flex-col shrink-0 overflow-hidden
        `;
    const sideBarItemClass = "bg-[rgb(35,35,184)] w-full rounded-lg p-3 cursor-pointer flex flex-row";
    const headerSidebarClass = "flex flex-col justify-left p-7";
    const sideBarImageClass = "absolute left-0 inset-x-0 w-full h-full object-cover z-10"
    const sideBarSectionTitleClass = "text-gray-500 text-sm font-semibold mb-3"

    const [selected, setSelected] = React.useState<SectionId>("emergencies"); // Default for now

    return (
        <div className="flex flex-row h-screen w-full">
            <div className={`${sideBarClass}`}>
                    {/* <img
                        src="/login_bg_op.png"
                        alt=""
                        className={`${sideBarImageClass}`}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-[rgba(35,35,184,0.65)] to-black/50 z-15"></div> */}

                <div className="z-20">
                    <div className="flex flex-row items-center justify-center mt-4 ">
                        <img src="/new_icon_bgl.png" alt="BGL Logo" className="w-28 h-26 ml-2" />
                        <div className="text-lg font-bold">
                            Rapid Response Dashboard
                        </div>
                    </div>

                    {/* MANAGE */}

                    <div className={`${headerSidebarClass}`}>
                        <p className={sideBarSectionTitleClass}>Manage</p>

                        {/* ITEMS */}
                        <SideBarItem id="emergencies" label="Emergencies" icon={Radio} selected={selected} onSelect={setSelected} itemClass={sideBarItemClass} />
                        <SideBarItem id="history" label="History" icon={AudioLines} selected={selected} onSelect={setSelected} itemClass={sideBarItemClass} />
                        <SideBarItem id="analytics" label="Analytics" icon={ChartColumn} selected={selected} onSelect={setSelected} itemClass={sideBarItemClass} />

                    </div>

                    {/* PENDING */}

                    <div className={`${headerSidebarClass}`}>
                        <p className={sideBarSectionTitleClass}>Pending</p>

                        {/* ITEMS */}
                        <SideBarItem id="residents" label="Residents" icon={UserSearch} selected={selected} onSelect={setSelected} itemClass={sideBarItemClass} />
                        <SideBarItem id="appointment" label="Blotter Appointments" icon={CalendarClock} selected={selected} onSelect={setSelected} itemClass={sideBarItemClass} />

                    </div>

                    {/* TOOL */}

                    <div className={`${headerSidebarClass}`}>
                        <p className={sideBarSectionTitleClass}>Tools</p>

                        {/* ITEMS */}
                        <SideBarItem id="announcement" label="Announcements" icon={Megaphone} selected={selected} onSelect={setSelected} itemClass={sideBarItemClass} />

                    </div>
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