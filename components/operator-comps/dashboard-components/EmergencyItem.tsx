import { Check, Headset } from "lucide-react"

type ItemStatus = "pending" | "active"

export function EmergencyItem({ status }: { status: ItemStatus }) {
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

    const buttonClass = `
    group flex cursor-pointer absolute right-7 w-30 h-10 justify-center items-center
    border-2 border-green-500
    rounded-xl
    transition-colors duration-200
    hover:bg-green-500
    `

    return (
        <div className={itemClass}>
            <div className={`text-start w-50`}>
                <p>8 seconds ago</p>
            </div>
            <div className={`w-70 justify-center text-center px-10`}>
                <CategoryMark category="fire"/>
            </div>
            <div className={`w-70 text-start px-10`}>
                <p>Juan P. Dela Cruz</p>
            </div>
            <button type="button" className={buttonClass}>
                <Headset size={20} className="text-green-500 group-hover:text-white transition-colors duration-200" strokeWidth={2.5} />
            </button>
        </div>
    )
}

type CategoryType = "fire" | "medical" | "crime" | "accident" | "missing"

function CategoryMark({ category }: { category: CategoryType }) {
    const labels: Record<CategoryType, string> = {
        fire: "Fire",
        medical: "Medical",
        crime: "Crime",
        accident: "Accident",
        missing: "Missing Person",
    }

    const colors: Record<CategoryType, string> = {
        fire: "bg-red-600",
        medical: "bg-[rgb(36,193,161)]",
        crime: "bg-blue-700",
        accident: "bg-[rgb(255,142,60)]",
        missing: "bg-[rgb(180,92,207)]",
    }

    const boxClass = `
        rounded-full w-full
        ${colors[category]}
        text-center justify-center items-center
        text-white font-semibold
    `

    return (
        <div className={boxClass}>
            {labels[category]}
        </div>
    )
}