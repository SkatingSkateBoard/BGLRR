'use client';

import { DashboardSideBar } from '@/components/operator-comps/dashboard-components/DashboardSideBar';

export default function DashboardPage() {

    return (
        <div className="relative h-screen w-full bg-white flex flex-row">
            <DashboardSideBar/>
        </div>
    )
}