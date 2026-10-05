import { Check, Headset } from "lucide-react"

type ItemStatus = "pending" | "active"

type Resident = {
  id: number;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
};
// 1. Structure matching your real Supabase query fields
interface EmergencyRequest {
    id: number;
    resident: Resident;
    category: "fire" | "medical" | "crime" | "disaster" | "missing";
    status: string;
    created_at: string;
}

// 2. Define structural requirements for component execution
interface EmergencyItemProps {
  status: ItemStatus
  item: EmergencyRequest
  onAccept: () => Promise<void>
}

export function EmergencyItem({ status, item, onAccept }: EmergencyItemProps) {
    const itemClass = `relative shrink-0
    flex flex-row items-center
    px-7 bg-white h-17 w-full shadow-lg/10
    divide-x-2 divide-gray-200/0
    rounded-r-md
    border-t-3 border-gray-100
    border-r-3 border-r-gray-300
    border-b-3 border-b-gray-300
    bg-linear-to-b from-white to-blue-700/5
    `

    const acceptButtonClass = `
    group flex cursor-pointer absolute right-7 w-30 h-10 justify-center items-center
    border-2 border-green-500
    rounded-xl
    transition-colors duration-200
    hover:bg-green-500
    `

    const activeBadgeClass = `
    flex absolute right-7 w-30 h-10 justify-center items-center
    border-2 border-blue-500 text-blue-500
    rounded-xl gap-2 font-semibold text-sm
    `

    // Super simple date conversion for your database timestamp
    const formattedDate : string = new Date(item.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    })

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

    return (
        <div className={itemClass}>
            {/* Real Timestamp */}
            <div className={`text-start w-50`}>
                <p className="text-sm text-gray-700">{formattedDate}</p>
            </div>
            
            {/* Real Category Layout from DB */}
            <div className={`w-70 justify-center text-center px-10`}>
                <CategoryMark category={(item.category || "fire")} />
            </div>
            
            {/* Reporter Data Context */}
            <div className={`w-70 text-start px-10`}>
                <p className="text-gray-900 font-medium">
                    {getFullName(item.resident) || `Emergency Ticket #${item.id}`}
                </p>
            </div>

            {/* Context Aware Action System */}
            {status === "pending" ? (
                <button type="button" className={acceptButtonClass} onClick={onAccept}>
                    <Headset size={20} className="text-green-500 group-hover:text-white transition-colors duration-200" strokeWidth={2.5} />
                </button>
            ) : (
                <div className={activeBadgeClass}>
                    <Check size={18} strokeWidth={3} />
                    <span>Claimed</span>
                </div>
            )}
        </div>
    )
}


type CategoryType = "fire" | "medical" | "crime" | "disaster" | "missing"

function CategoryMark({ category }: { category: CategoryType }) {
    const labels: Record<CategoryType, string> = {
        fire: "Fire",
        medical: "Medical",
        crime: "Crime",
        disaster: "Disaster",
        missing: "Missing Person",
    }

    const colors: Record<CategoryType, string> = {
        fire: "bg-red-600",
        medical: "bg-[rgb(36,193,161)]",
        crime: "bg-blue-700",
        disaster: "bg-[rgb(255,142,60)]",
        missing: "bg-[rgb(180,92,207)]",
    }

    const boxClass = `
        rounded-full w-full py-0.5
        ${colors[category]}
        text-center justify-center items-center
        text-white font-semibold text-sm
    `

    return (
        <div className={boxClass}>
            {labels[category] || "Unknown"}
        </div>
    )
}
