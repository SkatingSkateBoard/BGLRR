'use client';
import { useRouter } from 'next/navigation';
import { DashboardSideBar } from '@/components/operator-comps/dashboard-components/DashboardSideBar';

export default function DashboardPage() {
    const router = useRouter();

    return (
        <div className="relative h-screen w-full bg-white flex flex-row">
            <DashboardSideBar/>
        </div>
    )
}